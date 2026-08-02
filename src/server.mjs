import http from 'node:http';
import { URL } from 'node:url';
import crypto from 'node:crypto';

const cfg = {
  port: Number(process.env.PORT || 8787),
  cors: process.env.CORS_ORIGIN || '*',
  mode: process.env.EXECUTION_MODE || 'paper',
  pollMs: Math.max(5000, Number(process.env.POLL_INTERVAL_MS || 15000)),
  minSpreadBps: Number(process.env.MIN_SPREAD_BPS || 15),
  capital: Number(process.env.DEFAULT_CAPITAL_USD || 10000),
  costBps: Number(process.env.ESTIMATED_COST_BPS || 12),
  heliusKey: process.env.HELIUS_API_KEY || '',
  dexPrograms: (process.env.DEX_PROGRAM_IDS || '').split(',').map(x=>x.trim()).filter(Boolean)
};

const state = {
  startedAt: Date.now(), market: [], opportunities: [], transactions: [], arbitrages: [], errors: [],
  searchers: new Map(), validators: new Map(), clients: new Set(), scanCount: 0, indexer: 'disabled', lastScan: null
};
const watch = [
  ['SOL','So11111111111111111111111111111111111111112'],
  ['JUP','JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'],
  ['BONK','DezXAZ8z7PnrnRJjz3wXBoRgixCa6F9pG8eZrG1pPB263'],
  ['WIF','EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLhL7Y1P2w1V']
];
const now=()=>new Date().toISOString();
const uid=(p='id')=>`${p}_${crypto.randomUUID().slice(0,8)}`;
function broadcast(type,data){ const msg=`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`; for(const r of state.clients){ try{r.write(msg)}catch{state.clients.delete(r)} } }
function err(scope,e){ const row={id:uid('err'),scope,message:String(e?.message||e),at:now()}; state.errors.unshift(row); state.errors=state.errors.slice(0,100); console.error(scope,e); }
function page(arr,req){ const limit=Math.min(250,Math.max(1,Number(req.query.limit||50))), offset=Math.max(0,Number(req.query.offset||0)); return {items:arr.slice(offset,offset+limit),total:arr.length,limit,offset}; }

async function fetchJson(url, timeout=9000){ const c=new AbortController(); const t=setTimeout(()=>c.abort(),timeout); try{const r=await fetch(url,{signal:c.signal,headers:{accept:'application/json','user-agent':'TradeBotHub-MEV/3.0'}}); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return await r.json();} finally{clearTimeout(t)} }

function normalizePair(symbol,p){
  return {symbol,dex:p.dexId||'unknown',pairAddress:p.pairAddress,price:Number(p.priceUsd||0),liquidity:Number(p.liquidity?.usd||0),volume24h:Number(p.volume?.h24||0),txns24h:Number(p.txns?.h24?.buys||0)+Number(p.txns?.h24?.sells||0),change24h:Number(p.priceChange?.h24||0),url:p.url||'',base:p.baseToken?.symbol,quote:p.quoteToken?.symbol};
}
function buildOpportunities(rows){
  const out=[]; const by=new Map(); for(const r of rows){if(!r.price||!r.liquidity)continue; const a=by.get(r.symbol)||[];a.push(r);by.set(r.symbol,a)}
  for(const [symbol,pairs] of by){
    for(let i=0;i<pairs.length;i++) for(let j=i+1;j<pairs.length;j++){
      if(pairs[i].dex===pairs[j].dex) continue;
      const buy=pairs[i].price<pairs[j].price?pairs[i]:pairs[j], sell=buy===pairs[i]?pairs[j]:pairs[i];
      const spreadBps=((sell.price-buy.price)/buy.price)*10000; if(spreadBps<cfg.minSpreadBps) continue;
      const liq=Math.min(buy.liquidity,sell.liquidity), capital=Math.max(100,Math.min(cfg.capital,liq*0.002));
      const gross=capital*spreadBps/10000, estimatedCosts=capital*cfg.costBps/10000, net=gross-estimatedCosts;
      out.push({id:uid('opp'),detectedAt:now(),symbol,strategy:'Cross-DEX',status:net>0?'quoted':'rejected',buyDex:buy.dex,sellDex:sell.dex,buyPrice:buy.price,sellPrice:sell.price,spreadBps:+spreadBps.toFixed(2),capital:+capital.toFixed(2),gross:+gross.toFixed(2),costs:+estimatedCosts.toFixed(2),net:+net.toFixed(2),liquidity:+liq.toFixed(2),score:Math.max(1,Math.min(99,Math.round(55+Math.log10(Math.max(1,liq))*5+Math.min(25,spreadBps/4)))),buyPair:buy.pairAddress,sellPair:sell.pairAddress,source:'live-market'});
    }
  }
  return out.sort((a,b)=>b.net-a.net).slice(0,250);
}
async function scan(){
  const all=[];
  for(const [symbol,mint] of watch){
    try{ const d=await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${mint}`); const pairs=(d.pairs||[]).filter(p=>p.chainId==='solana').sort((a,b)=>(b.liquidity?.usd||0)-(a.liquidity?.usd||0)).slice(0,24); all.push(...pairs.map(p=>normalizePair(symbol,p))); }
    catch(e){err(`market:${symbol}`,e)}
  }
  state.market=all; state.opportunities=buildOpportunities(all); state.lastScan=now(); state.scanCount++;
  broadcast('snapshot',snapshot()); broadcast('opportunities',state.opportunities.slice(0,40));
}
function snapshot(){
  const realized=state.arbitrages.reduce((s,x)=>s+(x.realizedNetUsd||0),0), est=state.opportunities.reduce((s,x)=>s+Math.max(0,x.net),0);
  return {version:'3.0.0',mode:cfg.mode,indexer:state.indexer,lastScan:state.lastScan,marketCount:state.market.length,opportunityCount:state.opportunities.length,transactionCount:state.transactions.length,arbitrageCount:state.arbitrages.length,searcherCount:state.searchers.size,validatorCount:state.validators.size,estimatedNetUsd:+est.toFixed(2),realizedNetUsd:+realized.toFixed(2),uptimeSeconds:Math.floor((Date.now()-state.startedAt)/1000)};
}
function parseHeliusTx(n){
  const r=n?.params?.result; if(!r)return null; const tx=r.transaction||r; const sig=tx?.transaction?.signatures?.[0]||r.signature||uid('sig'); const msg=tx?.transaction?.message; const keys=(msg?.accountKeys||[]).map(k=>typeof k==='string'?k:(k.pubkey||String(k))); const meta=tx?.meta||r.meta||{}; const programs=new Set(); for(const ix of [...(msg?.instructions||[]),...(meta?.innerInstructions||[]).flatMap(x=>x.instructions||[])]){ const p=ix.programId||keys[ix.programIdIndex]; if(p)programs.add(p); }
  return {id:sig,signature:sig,slot:r.slot||tx.slot||null,blockTime:r.blockTime||null,feePayer:keys[0]||null,feeLamports:Number(meta.fee||0),success:meta.err==null,programIds:[...programs],preBalances:meta.preBalances||[],postBalances:meta.postBalances||[],preTokenBalances:meta.preTokenBalances||[],postTokenBalances:meta.postTokenBalances||[],receivedAt:now()};
}
function analyzeTx(t){
  const known=t.programIds.filter(p=>cfg.dexPrograms.includes(p)); if(known.length<2)return;
  const solDelta=(Number(t.postBalances?.[0]||0)-Number(t.preBalances?.[0]||0))/1e9;
  const realizedNetUsd=null; // requires exact token valuation/decoder; never fabricate.
  const a={id:uid('arb'),signature:t.signature,slot:t.slot,searcher:t.feePayer,programIds:t.programIds,dexProgramCount:known.length,type:'multi-dex-candidate',confidence:55,solDelta,realizedNetUsd,status:'candidate',detectedAt:now()};
  state.arbitrages.unshift(a); state.arbitrages=state.arbitrages.slice(0,5000);
  if(t.feePayer){const s=state.searchers.get(t.feePayer)||{wallet:t.feePayer,transactions:0,candidates:0,realizedNetUsd:0,lastSeen:null};s.transactions++;s.candidates++;s.lastSeen=now();state.searchers.set(t.feePayer,s)}
  broadcast('arbitrage',a);
}
function startHelius(){
  if(!cfg.heliusKey||cfg.dexPrograms.length===0){state.indexer='disabled';return}
  const url=`wss://atlas-mainnet.helius-rpc.com/?api-key=${cfg.heliusKey}`; let ws,retry=1000,ping;
  const connect=()=>{
    state.indexer='connecting'; ws=new WebSocket(url);
    ws.on('open',()=>{state.indexer='streaming';retry=1000; ws.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'transactionSubscribe',params:[{failed:false,accountInclude:cfg.dexPrograms},{commitment:'confirmed',encoding:'jsonParsed',transactionDetails:'full',showRewards:false,maxSupportedTransactionVersion:0}]})); ping=setInterval(()=>{if(ws.readyState===1)ws.ping()},20000)});
    ws.on('message',b=>{try{const t=parseHeliusTx(JSON.parse(String(b)));if(!t)return;state.transactions.unshift(t);state.transactions=state.transactions.slice(0,10000);analyzeTx(t);broadcast('transaction',t)}catch(e){err('helius-message',e)}});
    ws.on('error',e=>err('helius',e)); ws.on('close',()=>{state.indexer='reconnecting';clearInterval(ping);setTimeout(connect,retry);retry=Math.min(30000,retry*2)});
  }; connect();
}

function send(res,status,body,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':cfg.cors==='*'?'*':cfg.cors,...headers});res.end(JSON.stringify(body))}
async function readBody(req){let raw='';for await(const c of req){raw+=c;if(raw.length>1_000_000)throw new Error('Body too large')}return raw?JSON.parse(raw):{}}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':cfg.cors==='*'?'*':cfg.cors,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'});return res.end()}
    const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);req.query=Object.fromEntries(u.searchParams.entries());
    if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,...snapshot()});
    if(req.method==='GET'&&u.pathname==='/api/stats')return send(res,200,snapshot());
    if(req.method==='GET'&&u.pathname==='/api/market')return send(res,200,page(state.market,req));
    if(req.method==='GET'&&u.pathname==='/api/opportunities')return send(res,200,page(state.opportunities,req));
    if(req.method==='GET'&&u.pathname==='/api/transactions')return send(res,200,page(state.transactions,req));
    if(req.method==='GET'&&u.pathname==='/api/arbitrages')return send(res,200,page(state.arbitrages,req));
    if(req.method==='GET'&&u.pathname==='/api/searchers')return send(res,200,page([...state.searchers.values()].sort((a,b)=>b.candidates-a.candidates),req));
    if(req.method==='GET'&&u.pathname==='/api/validators')return send(res,200,page([...state.validators.values()],req));
    if(req.method==='GET'&&u.pathname==='/api/errors')return send(res,200,page(state.errors,req));
    if(req.method==='POST'&&u.pathname==='/api/admin/scan'){await scan();return send(res,200,{ok:true,...snapshot()})}
    if(req.method==='POST'&&u.pathname==='/api/simulate'){const body=await readBody(req);const {capital=10000,spreadBps=20,costBps=cfg.costBps,minProfit=0}=body;const gross=Number(capital)*Number(spreadBps)/10000,costs=Number(capital)*Number(costBps)/10000,net=gross-costs;return send(res,200,{mode:'paper',status:net>=Number(minProfit)?'passed':'rejected',capital:+Number(capital).toFixed(2),gross:+gross.toFixed(2),costs:+costs.toFixed(2),net:+net.toFixed(2),warning:'Simulation is an estimate, not a signed or landed transaction.'})}
    if(req.method==='GET'&&u.pathname==='/api/stream'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive','access-control-allow-origin':'*'});res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);state.clients.add(res);const t=setInterval(()=>res.write(`event: ping\ndata: ${Date.now()}\n\n`),15000);req.on('close',()=>{clearInterval(t);state.clients.delete(res)});return}
    return send(res,404,{error:'Not found'});
  }catch(e){err('http',e);return send(res,500,{error:'Internal server error',message:String(e?.message||e)})}
});
server.listen(cfg.port,()=>console.log(`TradeBotHub MEV v3 listening on ${cfg.port}`));
scan().catch(e=>err('initial-scan',e)); setInterval(()=>scan().catch(e=>err('scan',e)),cfg.pollMs).unref(); startHelius();
