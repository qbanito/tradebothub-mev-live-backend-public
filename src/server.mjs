import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8787);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const POLL_INTERVAL_MS = Math.max(5000, Number(process.env.POLL_INTERVAL_MS || 15000));
const MIN_SPREAD_BPS = Number(process.env.MIN_SPREAD_BPS || 20);
const MAX_PAIRS_PER_TOKEN = Number(process.env.MAX_PAIRS_PER_TOKEN || 25);
const DEFAULT_CAPITAL_USD = Number(process.env.DEFAULT_CAPITAL_USD || 10000);
const ESTIMATED_COST_BPS = Number(process.env.ESTIMATED_COST_BPS || 12);
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const DEX_PROGRAM_IDS = (process.env.DEX_PROGRAM_IDS || '').split(',').map(x=>x.trim()).filter(Boolean);

const DEFAULT_WATCHLIST = [
  {symbol:'SOL', mint:'So11111111111111111111111111111111111111112'},
  {symbol:'JUP', mint:'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'},
  {symbol:'BONK', mint:'DezXAZ8z7PnrnRJjz3wXBoRgixCa6WK7ydj56YpZac1p'},
  {symbol:'WIF', mint:'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLZQzvXQyDPN'},
  {symbol:'USDC', mint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'}
];
const custom = (process.env.WATCHLIST_MINTS || '').split(',').map(x=>x.trim()).filter(Boolean);
const WATCHLIST = custom.length ? custom.map((mint,i)=>({symbol:`TOKEN${i+1}`,mint})) : DEFAULT_WATCHLIST;
const state = {
  startedAt: new Date().toISOString(),
  lastUpdated: null,
  cycle: 0,
  markets: [],
  opportunities: [],
  stats: {},
  transactions: [],
  errors: [],
  source: 'DEX Screener live API',
  executionMode: 'paper'
};
const clients = new Set();

function corsHeaders(extra={}) { return {'access-control-allow-origin':CORS_ORIGIN,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization','cache-control':'no-store',...extra}; }
function send(res,status,data,headers={}) { const body=JSON.stringify(data); res.writeHead(status,corsHeaders({'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),...headers})); res.end(body); }
function round(n,d=2){ const p=10**d; return Math.round((Number(n)+Number.EPSILON)*p)/p; }
function nowTime(){ return new Date().toLocaleTimeString('en-US',{hour12:false,timeZone:'UTC'}); }
function safeNum(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function emit(event,payload){ const msg=`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`; for(const res of clients){ try{res.write(msg)}catch{clients.delete(res)} } }

async function fetchJson(url, options={}, timeout=9000){
  const c=new AbortController(); const t=setTimeout(()=>c.abort(),timeout);
  try{ const r=await fetch(url,{...options,signal:c.signal,headers:{'user-agent':'TradeBotHub-MEV/1.0',...(options.headers||{})}}); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return await r.json(); }
  finally{clearTimeout(t)}
}

function normalizePair(pair, symbol){
  return {
    symbol,
    chainId: pair.chainId,
    dexId: pair.dexId || 'unknown',
    pairAddress: pair.pairAddress,
    url: pair.url,
    baseSymbol: pair.baseToken?.symbol || symbol,
    quoteSymbol: pair.quoteToken?.symbol || 'USD',
    priceUsd: safeNum(pair.priceUsd),
    priceNative: safeNum(pair.priceNative),
    liquidityUsd: safeNum(pair.liquidity?.usd),
    volume24h: safeNum(pair.volume?.h24),
    txns24h: safeNum(pair.txns?.h24?.buys)+safeNum(pair.txns?.h24?.sells),
    priceChange24h: safeNum(pair.priceChange?.h24),
    fdv: safeNum(pair.fdv),
    createdAt: pair.pairCreatedAt || null
  };
}

async function fetchTokenPairs(token){
  const url=`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(token.mint)}`;
  const data=await fetchJson(url);
  const pairs=(data.pairs||[]).filter(p=>p.chainId==='solana' && safeNum(p.priceUsd)>0 && safeNum(p.liquidity?.usd)>0)
    .sort((a,b)=>safeNum(b.liquidity?.usd)-safeNum(a.liquidity?.usd)).slice(0,MAX_PAIRS_PER_TOKEN);
  return pairs.map(p=>normalizePair(p,token.symbol));
}

function makeOpportunities(markets){
  const bySymbol=new Map();
  for(const m of markets){ if(!bySymbol.has(m.symbol)) bySymbol.set(m.symbol,[]); bySymbol.get(m.symbol).push(m); }
  const out=[];
  for(const [symbol,pairs] of bySymbol){
    const liquid=pairs.filter(p=>p.liquidityUsd>=10000 && ['USDC','USDT','USD','SOL'].includes(p.quoteSymbol));
    for(let i=0;i<liquid.length;i++) for(let j=i+1;j<liquid.length;j++){
      const a=liquid[i], b=liquid[j];
      if(a.dexId===b.dexId || !a.priceUsd || !b.priceUsd) continue;
      const buy=a.priceUsd<b.priceUsd?a:b, sell=a.priceUsd<b.priceUsd?b:a;
      const spreadBps=((sell.priceUsd/buy.priceUsd)-1)*10000;
      if(spreadBps<MIN_SPREAD_BPS) continue;
      const maxCapital=Math.max(100,Math.min(DEFAULT_CAPITAL_USD,buy.liquidityUsd*0.0025,sell.liquidityUsd*0.0025));
      const gross=maxCapital*spreadBps/10000;
      const variableCost=maxCapital*ESTIMATED_COST_BPS/10000;
      const liquidityPenalty=maxCapital/Math.max(1,Math.min(buy.liquidityUsd,sell.liquidityUsd))*gross*3;
      const costs=variableCost+Math.min(gross*0.65,liquidityPenalty)+0.01;
      const net=gross-costs;
      const score=Math.max(1,Math.min(99,Math.round(65+Math.min(20,spreadBps/10)+Math.min(10,Math.log10(Math.min(buy.liquidityUsd,sell.liquidityUsd))*1.6)-Math.min(25,liquidityPenalty))));
      out.push({
        id:`LIVE-${symbol}-${buy.dexId}-${sell.dexId}-${Date.now()}`,
        detectedAt:new Date().toISOString(), time:nowTime(),
        route:[buy.dexId,sell.dexId], pair:`${symbol}/USD`, strategy:'Cross-DEX',
        capital:round(maxCapital), gross:round(gross), costs:round(costs), net:round(net), score,
        status:net>0?'Detected':'Rejected', spreadBps:round(spreadBps,1),
        buyPrice:buy.priceUsd, sellPrice:sell.priceUsd,
        buyPair:buy.pairAddress, sellPair:sell.pairAddress,
        buyUrl:buy.url, sellUrl:sell.url,
        liquidity:round(Math.min(buy.liquidityUsd,sell.liquidityUsd)),
        steps:[[buy.dexId,`Buy ${symbol}`,`${round(maxCapital)} USD @ ${buy.priceUsd}`],[sell.dexId,`Sell ${symbol}`,`${round(maxCapital+gross)} USD @ ${sell.priceUsd}`]],
        disclaimer:'Observed cross-venue price spread. It is not executable PnL until direct pool simulation, account locking, priority fees and transaction landing are validated.'
      });
    }
  }
  return out.sort((a,b)=>b.net-a.net).slice(0,100);
}

function deriveStats(markets,opps){
  const dexSet=new Set(markets.map(m=>m.dexId));
  const totalLiquidity=markets.reduce((s,m)=>s+m.liquidityUsd,0);
  const totalVolume=markets.reduce((s,m)=>s+m.volume24h,0);
  const positive=opps.filter(o=>o.net>0);
  return {
    markets:markets.length,dexes:dexSet.size,watchlist:WATCHLIST.length,
    opportunities:opps.length,positive:positive.length,
    estimatedNet:round(positive.reduce((s,o)=>s+o.net,0)),
    totalLiquidity:round(totalLiquidity),totalVolume24h:round(totalVolume),
    medianSpreadBps:opps.length?round([...opps].sort((a,b)=>a.spreadBps-b.spreadBps)[Math.floor(opps.length/2)].spreadBps,1):0,
    lastUpdated:state.lastUpdated,source:state.source,executionMode:state.executionMode
  };
}

async function scan(){
  const started=Date.now();
  try{
    const results=await Promise.allSettled(WATCHLIST.map(fetchTokenPairs));
    const markets=[];
    results.forEach((r,i)=>{ if(r.status==='fulfilled') markets.push(...r.value); else state.errors.unshift({at:new Date().toISOString(),source:WATCHLIST[i].symbol,message:String(r.reason?.message||r.reason)}); });
    state.markets=markets;
    state.opportunities=makeOpportunities(markets);
    state.lastUpdated=new Date().toISOString();
    state.cycle++;
    state.stats=deriveStats(markets,state.opportunities);
    state.stats.scanMs=Date.now()-started;
    state.errors=state.errors.slice(0,20);
    emit('snapshot',{stats:state.stats,opportunities:state.opportunities.slice(0,30),markets:state.markets.slice(0,100)});
  }catch(err){ state.errors.unshift({at:new Date().toISOString(),source:'scanner',message:String(err.message||err)}); }
}

async function fetchRecentHeliusTransactions(address){
  if(!HELIUS_API_KEY) return [];
  const url=`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}&limit=20`;
  return await fetchJson(url);
}


function startHeliusStream(){
  if(!HELIUS_API_KEY || !DEX_PROGRAM_IDS.length || typeof WebSocket==='undefined') return;
  const endpoint=`wss://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(HELIUS_API_KEY)}`;
  let retry=1000;
  const connect=()=>{
    const ws=new WebSocket(endpoint);
    let ping;
    ws.addEventListener('open',()=>{
      retry=1000;
      ws.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'transactionSubscribe',params:[{failed:false,vote:false,accountInclude:DEX_PROGRAM_IDS},{commitment:'processed',encoding:'jsonParsed',transactionDetails:'full',showRewards:false,maxSupportedTransactionVersion:0}]}));
      ping=setInterval(()=>{try{ws.send(JSON.stringify({jsonrpc:'2.0',id:99,method:'getHealth'}))}catch{}},60000);
    });
    ws.addEventListener('message',(event)=>{
      try{
        const msg=JSON.parse(String(event.data));
        const result=msg?.params?.result;
        if(!result) return;
        const value=result.value||result;
        const sig=value?.signature || value?.transaction?.signatures?.[0] || null;
        const tx={signature:sig,slot:result.context?.slot||value.slot||null,receivedAt:new Date().toISOString(),programs:DEX_PROGRAM_IDS.filter(id=>JSON.stringify(value).includes(id)),raw:value};
        state.transactions.unshift(tx); state.transactions=state.transactions.slice(0,500);
        emit('transaction',{signature:tx.signature,slot:tx.slot,receivedAt:tx.receivedAt,programs:tx.programs});
      }catch{}
    });
    const reconnect=()=>{clearInterval(ping);setTimeout(connect,retry);retry=Math.min(30000,retry*2)};
    ws.addEventListener('close',reconnect); ws.addEventListener('error',()=>{try{ws.close()}catch{}});
  };
  connect();
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(req.method==='OPTIONS'){res.writeHead(204,corsHeaders()); return res.end();}
  if(url.pathname==='/health') return send(res,200,{ok:true,service:'tradebothub-mev-live',lastUpdated:state.lastUpdated,cycle:state.cycle,uptime:process.uptime()});
  if(url.pathname==='/api/config') return send(res,200,{executionMode:state.executionMode,watchlist:WATCHLIST,heliusConfigured:Boolean(HELIUS_API_KEY),dexProgramsConfigured:DEX_PROGRAM_IDS.length,pollIntervalMs:POLL_INTERVAL_MS,minSpreadBps:MIN_SPREAD_BPS});
  if(url.pathname==='/api/stats') return send(res,200,state.stats);
  if(url.pathname==='/api/markets') return send(res,200,{updatedAt:state.lastUpdated,data:state.markets});
  if(url.pathname==='/api/opportunities') return send(res,200,{updatedAt:state.lastUpdated,data:state.opportunities,warning:'These are observed price discrepancies, not guaranteed executable profits.'});
  if(url.pathname==='/api/errors') return send(res,200,{data:state.errors});
  if(url.pathname==='/api/transactions') return send(res,200,{configured:Boolean(HELIUS_API_KEY&&DEX_PROGRAM_IDS.length),data:state.transactions.map(({raw,...x})=>x)});
  if(url.pathname==='/api/events'){
    res.writeHead(200,corsHeaders({'content-type':'text/event-stream','connection':'keep-alive','x-accel-buffering':'no'}));
    res.write(`event: snapshot\ndata: ${JSON.stringify({stats:state.stats,opportunities:state.opportunities.slice(0,30),markets:state.markets.slice(0,100)})}\n\n`);
    const ping=setInterval(()=>{try{res.write(`event: ping\ndata: ${Date.now()}\n\n`)}catch{}},25000);
    clients.add(res); req.on('close',()=>{clearInterval(ping);clients.delete(res)}); return;
  }
  if(url.pathname==='/api/helius/address' && req.method==='GET'){
    const address=url.searchParams.get('address'); if(!address) return send(res,400,{error:'address is required'});
    if(!HELIUS_API_KEY) return send(res,503,{error:'HELIUS_API_KEY is not configured'});
    try{return send(res,200,{data:await fetchRecentHeliusTransactions(address)});}catch(e){return send(res,502,{error:String(e.message||e)});}
  }
  if(url.pathname==='/api/scan' && req.method==='POST'){ await scan(); return send(res,200,{ok:true,stats:state.stats}); }
  return send(res,404,{error:'Not found'});
});

server.listen(PORT,()=>console.log(`TradeBotHub MEV live API listening on :${PORT}`));
scan(); setInterval(scan,POLL_INTERVAL_MS).unref(); startHeliusStream();
