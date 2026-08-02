import http from 'node:http';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';

const VERSION = '3.1.0';
const TIP_ACCOUNTS = [
  '4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE',
  'D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ',
  '9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta',
  '5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn',
  '2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD',
  '2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ',
  'wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF',
  '3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT',
  '4vieeGHPYPG2MmyPRcYjdiDmmhN3ww7hsFNap8pVN3Ey',
  '4TQLFNWK8AovT1gFvda5jfw2oJeRMKEmw7aH6MGBJ3or',
];
const DEFAULT_TOKENS = [
  {
    symbol: 'SOL',
    name: 'Wrapped SOL',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
  },
];

const CONFIG = {
  port: envNumber('PORT', 8787),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  executionMode: (process.env.EXECUTION_MODE || 'paper').toLowerCase(),
  liveTradingEnabled: envBool('LIVE_TRADING_ENABLED', false),
  pollIntervalMs: envNumber('POLL_INTERVAL_MS', 15000),
  minSpreadBps: envNumber('MIN_SPREAD_BPS', 15),
  defaultCapitalUsd: envNumber('DEFAULT_CAPITAL_USD', 10000),
  estimatedCostBps: envNumber('ESTIMATED_COST_BPS', 12),
  solanaRpcUrl:
    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  heliusApiKey: process.env.HELIUS_API_KEY || '',
  heliusSenderUrl:
    process.env.HELIUS_SENDER_URL || 'http://ewr-sender.helius-rpc.com/fast',
  dexProgramIds: csv(process.env.DEX_PROGRAM_IDS),
  signerPrivateKeyBase58: process.env.SIGNER_PRIVATE_KEY_BASE58 || '',
  signerPrivateKeyJson: process.env.SIGNER_PRIVATE_KEY_JSON || '',
  jupiterApiKey: process.env.JUPITER_API_KEY || '',
  jupiterSwapBaseUrl: process.env.JUPITER_SWAP_BASE_URL || '',
  txBroadcastMode: (process.env.TX_BROADCAST_MODE || 'rpc').toLowerCase(),
  swapSlippageBps: envNumber('SWAP_SLIPPAGE_BPS', 50),
  maxExecutionUsd: envNumber('MAX_EXECUTION_USD', 500),
  maxPriorityFeeLamports: envNumber('MAX_PRIORITY_FEE_LAMPORTS', 1000000),
  senderTipLamports: envNumber('SENDER_TIP_LAMPORTS', 5000),
  skipPreflight: envBool('SKIP_PREFLIGHT', false),
  simulateOnly: envBool('SIMULATE_ONLY', false),
  indexerLookbackLimit: envNumber('INDEXER_LOOKBACK_LIMIT', 100),
};

const state = {
  market: [],
  opportunities: [],
  transactions: [],
  arbitrages: [],
  searchers: [],
  executions: [],
  errors: [],
  lastScanAt: null,
  lastExecutionAt: null,
  lastErrorAt: null,
  indexer: {
    status: CONFIG.heliusApiKey ? 'configured' : 'disabled',
    source: CONFIG.heliusApiKey ? 'manual-ingest' : 'off',
  },
};

const sseClients = new Set();
const tokenCache = new Map();
let signerCache;

const connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');

for (const token of DEFAULT_TOKENS) {
  tokenCache.set(token.symbol.toUpperCase(), token);
  tokenCache.set(token.mint, token);
}

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

function csv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function nowIso() {
  return new Date().toISOString();
}

function logError(message, detail = null) {
  state.lastErrorAt = nowIso();
  const item = {
    id: crypto.randomUUID(),
    at: state.lastErrorAt,
    message,
    detail:
      detail instanceof Error
        ? detail.message
        : typeof detail === 'string'
          ? detail
          : detail,
  };
  state.errors.unshift(item);
  state.errors = state.errors.slice(0, 50);
  console.error(`[${item.at}] ${message}`, detail || '');
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...corsHeaders(),
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    ...corsHeaders(),
  });
  res.end(text);
}

function corsHeaders() {
  return {
    'access-control-allow-origin': CONFIG.corsOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function getStats() {
  const signer = getSignerInfo();
  const readiness = executionReadinessSync();
  return {
    version: VERSION,
    now: nowIso(),
    mode: CONFIG.executionMode,
    liveTradingEnabled: CONFIG.liveTradingEnabled,
    canExecuteLive: readiness.canExecuteLive,
    marketCount: state.market.length,
    opportunityCount: state.opportunities.length,
    transactionCount: state.transactions.length,
    arbitrageCount: state.arbitrages.length,
    estimatedNetUsd: round2(
      state.opportunities.reduce((sum, item) => sum + Number(item.net || 0), 0),
    ),
    realizedNetUsd: 0,
    lastScanAt: state.lastScanAt,
    lastExecutionAt: state.lastExecutionAt,
    indexer: `${state.indexer.status}:${state.indexer.source}`,
    signerPublicKey: signer.publicKey,
  };
}

function broadcastSnapshot() {
  const stats = JSON.stringify(getStats());
  for (const res of sseClients) {
    res.write(`event: snapshot\n`);
    res.write(`data: ${stats}\n\n`);
  }
}

function registerSseClient(req, res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    ...corsHeaders(),
  });
  res.write(`event: snapshot\n`);
  res.write(`data: ${JSON.stringify(getStats())}\n\n`);
  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
  });
}

function getSignerInfo() {
  if (signerCache !== undefined) {
    return signerCache;
  }
  try {
    const secret = decodeSecretKey();
    if (!secret) {
      signerCache = { configured: false, keypair: null, publicKey: null };
      return signerCache;
    }
    const keypair = Keypair.fromSecretKey(secret);
    signerCache = {
      configured: true,
      keypair,
      publicKey: keypair.publicKey.toBase58(),
    };
    return signerCache;
  } catch (error) {
    signerCache = {
      configured: false,
      keypair: null,
      publicKey: null,
      error: error.message,
    };
    return signerCache;
  }
}

function decodeSecretKey() {
  const json = CONFIG.signerPrivateKeyJson.trim();
  if (json) {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('SIGNER_PRIVATE_KEY_JSON must be an array');
    }
    return Uint8Array.from(parsed.map((value) => Number(value)));
  }
  const base58 = CONFIG.signerPrivateKeyBase58.trim();
  if (!base58) {
    return null;
  }
  return bs58.decode(base58);
}

function executionReadinessSync() {
  const signer = getSignerInfo();
  const reasons = [];
  if (CONFIG.executionMode !== 'live') {
    reasons.push('EXECUTION_MODE is not live');
  }
  if (!CONFIG.liveTradingEnabled) {
    reasons.push('LIVE_TRADING_ENABLED is false');
  }
  if (!signer.configured) {
    reasons.push('Signer private key is missing');
  }
  if (signer.error) {
    reasons.push(signer.error);
  }
  if (CONFIG.txBroadcastMode === 'helius-sender' && !CONFIG.heliusApiKey) {
    reasons.push('HELIUS_API_KEY is required for helius-sender mode');
  }

  return {
    version: VERSION,
    mode: CONFIG.executionMode,
    liveTradingEnabled: CONFIG.liveTradingEnabled,
    canExecuteLive: reasons.length === 0,
    reasons,
    signerConfigured: signer.configured,
    signerPublicKey: signer.publicKey,
    rpcUrl: CONFIG.solanaRpcUrl,
    broadcastMode: CONFIG.txBroadcastMode,
    simulateOnly: CONFIG.simulateOnly,
    defaults: {
      slippageBps: CONFIG.swapSlippageBps,
      maxExecutionUsd: CONFIG.maxExecutionUsd,
      maxPriorityFeeLamports: CONFIG.maxPriorityFeeLamports,
      senderTipLamports: CONFIG.senderTipLamports,
    },
    supportedTokens: DEFAULT_TOKENS,
  };
}

async function executionReadiness() {
  const base = executionReadinessSync();

  let walletBalanceSol = null;
  if (base.signerPublicKey) {
    try {
      const balance = await connection.getBalance(new PublicKey(base.signerPublicKey));
      walletBalanceSol = round6(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      base.reasons = [...base.reasons, `RPC balance check failed: ${error.message}`];
    }
  }

  return {
    ...base,
    canExecuteLive: base.reasons.length === 0,
    walletBalanceSol,
  };
}

async function resolveToken(query, fallbackDecimals = null) {
  if (!query) {
    return null;
  }
  const clean = String(query).trim();
  const direct = tokenCache.get(clean) || tokenCache.get(clean.toUpperCase());
  if (direct) {
    return direct;
  }

  if (CONFIG.jupiterApiKey) {
    const url = new URL('https://api.jup.ag/tokens/v2/search');
    url.searchParams.set('query', clean);
    const response = await fetch(url, {
      headers: {
        'x-api-key': CONFIG.jupiterApiKey,
      },
    });
    if (response.ok) {
      const items = await response.json();
      const match =
        items.find((item) => item.id === clean) ||
        items.find((item) => String(item.symbol || '').toUpperCase() === clean.toUpperCase()) ||
        items[0];
      if (match) {
        const token = {
          symbol: match.symbol,
          name: match.name,
          mint: match.id,
          decimals: Number(match.decimals || fallbackDecimals || 0),
          isVerified: Boolean(match.isVerified),
        };
        tokenCache.set(token.symbol.toUpperCase(), token);
        tokenCache.set(token.mint, token);
        return token;
      }
    }
  }

  if (fallbackDecimals != null && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
    return {
      symbol: `${clean.slice(0, 4)}...`,
      name: clean,
      mint: clean,
      decimals: Number(fallbackDecimals),
    };
  }

  return null;
}

async function fetchTokenPairs(token) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${token.mint}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`DexScreener ${response.status}`);
  }
  const payload = await response.json();
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  return pairs
    .filter((pair) => pair.chainId === 'solana')
    .filter((pair) => Number(pair.priceUsd) > 0 && Number(pair.liquidity?.usd || 0) > 0)
    .map((pair) => normalizePair(token, pair))
    .sort((a, b) => b.liquidity - a.liquidity);
}

function normalizePair(token, pair) {
  return {
    symbol: token.symbol,
    name: token.name,
    tokenMint: token.mint,
    pairAddress: pair.pairAddress,
    dex: pair.dexId,
    buyDex: pair.dexId,
    sellDex: pair.dexId,
    quoteSymbol: pair.quoteToken?.symbol || 'USD',
    priceUsd: Number(pair.priceUsd),
    priceNative: Number(pair.priceNative || 0),
    liquidity: Number(pair.liquidity?.usd || 0),
    baseLiquidity: Number(pair.liquidity?.base || 0),
    quoteLiquidity: Number(pair.liquidity?.quote || 0),
    volume24h: Number(pair.volume?.h24 || 0),
    volume1h: Number(pair.volume?.h1 || 0),
    priceChange24h: Number(pair.priceChange?.h24 || 0),
    priceChange1h: Number(pair.priceChange?.h1 || 0),
    txns1h: Number(pair.txns?.h1?.buys || 0) + Number(pair.txns?.h1?.sells || 0),
    url: pair.url,
    detectedAt: nowIso(),
  };
}

function deriveOpportunities(market) {
  const grouped = new Map();
  for (const item of market) {
    const current = grouped.get(item.symbol) || [];
    current.push(item);
    grouped.set(item.symbol, current);
  }

  const opportunities = [];
  for (const [symbol, items] of grouped.entries()) {
    if (items.length < 2) {
      continue;
    }
    const sorted = [...items].sort((a, b) => a.priceUsd - b.priceUsd);
    const buy = sorted[0];
    const sell = sorted[sorted.length - 1];
    if (!buy || !sell || buy.dex === sell.dex) {
      continue;
    }
    const spreadBps = ((sell.priceUsd - buy.priceUsd) / buy.priceUsd) * 10000;
    if (!Number.isFinite(spreadBps) || spreadBps < CONFIG.minSpreadBps) {
      continue;
    }
    const capital = Math.min(
      CONFIG.defaultCapitalUsd,
      buy.liquidity * 0.02,
      sell.liquidity * 0.02,
    );
    const gross = capital * (spreadBps / 10000);
    const costs = capital * (CONFIG.estimatedCostBps / 10000);
    const net = gross - costs;
    opportunities.push({
      id: crypto.randomUUID(),
      detectedAt: nowIso(),
      symbol,
      tokenMint: buy.tokenMint,
      buyDex: buy.dex,
      sellDex: sell.dex,
      buyPriceUsd: round6(buy.priceUsd),
      sellPriceUsd: round6(sell.priceUsd),
      spreadBps: round2(spreadBps),
      capital: round2(capital),
      gross: round2(gross),
      costs: round2(costs),
      net: round2(net),
      score: Math.max(1, Math.round(spreadBps - CONFIG.estimatedCostBps)),
      status: net > 0 ? 'candidate' : 'watch',
      routePreview: [buy.dex, sell.dex],
    });
  }

  return opportunities.sort((a, b) => b.net - a.net).slice(0, 150);
}

function rebuildActivityViews() {
  const searcherMap = new Map();
  const arbitrages = [];

  for (const tx of state.transactions) {
    if (tx.feePayer) {
      const current = searcherMap.get(tx.feePayer) || {
        wallet: tx.feePayer,
        candidates: 0,
        transactions: 0,
        lastSeen: tx.detectedAt,
      };
      current.transactions += 1;
      current.lastSeen = tx.detectedAt;
      if ((tx.programIds?.length || 0) > 1) {
        current.candidates += 1;
      }
      searcherMap.set(tx.feePayer, current);
    }

    if ((tx.programIds?.length || 0) > 1) {
      arbitrages.push({
        slot: tx.slot,
        signature: tx.signature,
        searcher: tx.feePayer,
        dexProgramCount: tx.programIds.length,
        type: 'candidate',
        confidence: tx.success ? 85 : 55,
        realizedNetUsd: null,
      });
    }
  }

  state.searchers = [...searcherMap.values()]
    .sort((a, b) => b.transactions - a.transactions)
    .slice(0, 100);
  state.arbitrages = arbitrages.slice(0, 100);
}

async function scanMarket() {
  try {
    const results = await Promise.all(DEFAULT_TOKENS.map((token) => fetchTokenPairs(token)));
    state.market = results.flat().sort((a, b) => b.liquidity - a.liquidity).slice(0, 250);
    state.opportunities = deriveOpportunities(state.market);
    state.lastScanAt = nowIso();
    broadcastSnapshot();
  } catch (error) {
    logError('Market scan failed', error);
  }
}

function humanToRawAmount(value, decimals) {
  const input = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(input)) {
    throw new Error('Amount must be a positive number');
  }
  const [whole, fractional = ''] = input.split('.');
  const padded = `${fractional}${'0'.repeat(decimals)}`.slice(0, decimals);
  return BigInt(`${whole}${padded}`.replace(/^0+(?=\d)/, '') || '0');
}

function rawToHuman(value, decimals) {
  const raw = BigInt(String(value ?? '0'));
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fractional = raw % divisor;
  if (fractional === 0n) {
    return whole.toString();
  }
  return `${whole}.${fractional.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

function getSwapBaseUrl() {
  if (CONFIG.jupiterSwapBaseUrl) {
    return CONFIG.jupiterSwapBaseUrl.replace(/\/$/, '');
  }
  return CONFIG.jupiterApiKey
    ? 'https://api.jup.ag/swap/v1'
    : 'https://lite-api.jup.ag/swap/v1';
}

function getSwapHeaders() {
  const headers = { accept: 'application/json' };
  if (CONFIG.jupiterApiKey) {
    headers['x-api-key'] = CONFIG.jupiterApiKey;
  }
  return headers;
}

async function fetchSwapQuote({
  inputMint,
  outputMint,
  rawAmount,
  slippageBps,
}) {
  const url = new URL(`${getSwapBaseUrl()}/quote`);
  url.searchParams.set('inputMint', inputMint);
  url.searchParams.set('outputMint', outputMint);
  url.searchParams.set('amount', String(rawAmount));
  url.searchParams.set('slippageBps', String(slippageBps));
  url.searchParams.set('instructionVersion', 'V2');
  const response = await fetch(url, {
    headers: getSwapHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Quote failed with ${response.status}`);
  }
  return payload;
}

async function buildSwapTransaction(quoteResponse, userPublicKey) {
  const response = await fetch(`${getSwapBaseUrl()}/swap`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...getSwapHeaders(),
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: CONFIG.maxPriorityFeeLamports,
          priorityLevel: 'veryHigh',
        },
      },
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Swap build failed with ${response.status}`);
  }
  return payload;
}

async function attachSenderTip(transaction, signer) {
  const altLookups = transaction.message.addressTableLookups || [];
  const altResponses = await Promise.all(
    altLookups.map((lookup) => connection.getAddressLookupTable(lookup.accountKey)),
  );
  const altAccounts = altResponses.map((item) => {
    if (!item.value) {
      throw new Error('Address lookup table missing while preparing Sender transaction');
    }
    return item.value;
  });

  const decompiled = TransactionMessage.decompile(transaction.message, {
    addressLookupTableAccounts: altAccounts,
  });
  decompiled.instructions.push(
    SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey: new PublicKey(
        TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)],
      ),
      lamports: CONFIG.senderTipLamports,
    }),
  );
  return new VersionedTransaction(decompiled.compileToV0Message(altAccounts));
}

async function broadcastSwap({
  swapResponse,
  quoteResponse,
  inputToken,
  outputToken,
  uiAmount,
}) {
  const signer = getSignerInfo();
  if (!signer.keypair) {
    throw new Error('Signer is not configured');
  }

  let transaction = VersionedTransaction.deserialize(
    Buffer.from(swapResponse.swapTransaction, 'base64'),
  );

  if (CONFIG.txBroadcastMode === 'helius-sender') {
    transaction = await attachSenderTip(transaction, signer.keypair);
  }

  transaction.sign([signer.keypair]);
  const serialized = Buffer.from(transaction.serialize()).toString('base64');
  let signature;

  if (CONFIG.txBroadcastMode === 'helius-sender') {
    const response = await fetch(CONFIG.heliusSenderUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'sendTransaction',
        params: [
          serialized,
          {
            encoding: 'base64',
            skipPreflight: true,
            maxRetries: 0,
          },
        ],
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) {
      throw new Error(payload?.error?.message || 'Helius Sender broadcast failed');
    }
    signature = payload.result;
  } else {
    signature = await connection.sendRawTransaction(Buffer.from(transaction.serialize()), {
      skipPreflight: CONFIG.skipPreflight,
      maxRetries: 3,
    });
  }

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: transaction.message.recentBlockhash,
      lastValidBlockHeight: swapResponse.lastValidBlockHeight,
    },
    'confirmed',
  );

  if (confirmation.value.err) {
    throw new Error(JSON.stringify(confirmation.value.err));
  }

  const status = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  });
  const slot = status.value[0]?.slot || null;
  const execution = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    signature,
    slot,
    status: 'confirmed',
    inputSymbol: inputToken.symbol,
    outputSymbol: outputToken.symbol,
    inputMint: inputToken.mint,
    outputMint: outputToken.mint,
    amountIn: String(uiAmount),
    amountOutQuoted: rawToHuman(quoteResponse.outAmount, outputToken.decimals),
    quotedOutUsd: round2(Number(quoteResponse.swapUsdValue || 0)),
    priceImpactPct: Number(quoteResponse.priceImpactPct || 0),
    routePlan: (quoteResponse.routePlan || []).map((item) => ({
      ammKey: item.swapInfo?.ammKey,
      label: item.swapInfo?.label,
      percent: item.percent,
      bps: item.bps,
    })),
    feePayer: signer.publicKey,
    feeLamports:
      Number(swapResponse.prioritizationFeeLamports || 0) +
      (CONFIG.txBroadcastMode === 'helius-sender'
        ? Number(CONFIG.senderTipLamports || 0)
        : 0),
    success: true,
    broadcastMode: CONFIG.txBroadcastMode,
  };

  state.executions.unshift(execution);
  state.executions = state.executions.slice(0, 100);
  state.transactions.unshift({
    slot,
    signature,
    feePayer: signer.publicKey,
    programIds: execution.routePlan.map((item) => item.ammKey).filter(Boolean),
    feeLamports: execution.feeLamports,
    success: true,
    detectedAt: execution.createdAt,
  });
  state.transactions = state.transactions.slice(0, 100);
  state.lastExecutionAt = execution.createdAt;
  rebuildActivityViews();
  broadcastSnapshot();
  return execution;
}

async function buildExecutionContext(body) {
  const inputToken = await resolveToken(
    body.inputToken || body.inputMint,
    body.inputDecimals,
  );
  const outputToken = await resolveToken(
    body.outputToken || body.outputMint,
    body.outputDecimals,
  );
  if (!inputToken || !outputToken) {
    throw new Error('Input or output token is unsupported. Add JUPITER_API_KEY for dynamic token lookup.');
  }
  const slippageBps = Number(body.slippageBps || CONFIG.swapSlippageBps);
  const amount = String(body.amount || '').trim();
  if (!amount) {
    throw new Error('Amount is required');
  }
  const rawAmount = humanToRawAmount(amount, inputToken.decimals);
  if (rawAmount <= 0n) {
    throw new Error('Amount must be greater than zero');
  }
  const quote = await fetchSwapQuote({
    inputMint: inputToken.mint,
    outputMint: outputToken.mint,
    rawAmount,
    slippageBps,
  });
  return { inputToken, outputToken, slippageBps, amount, rawAmount, quote };
}

async function handleExecutionQuote(res, body) {
  const context = await buildExecutionContext(body);
  sendJson(res, 200, {
    ok: true,
    mode: CONFIG.executionMode,
    liveTradingEnabled: CONFIG.liveTradingEnabled,
    inputToken: context.inputToken,
    outputToken: context.outputToken,
    amountIn: context.amount,
    amountOutQuoted: rawToHuman(
      context.quote.outAmount,
      context.outputToken.decimals,
    ),
    amountOutMin: rawToHuman(
      context.quote.otherAmountThreshold,
      context.outputToken.decimals,
    ),
    swapUsdValue: round2(Number(context.quote.swapUsdValue || 0)),
    priceImpactPct: Number(context.quote.priceImpactPct || 0),
    slippageBps: context.slippageBps,
    routePlan: (context.quote.routePlan || []).map((item) => ({
      label: item.swapInfo?.label,
      inputMint: item.swapInfo?.inputMint,
      outputMint: item.swapInfo?.outputMint,
      percent: item.percent,
      bps: item.bps,
      inAmount: item.swapInfo?.inAmount,
      outAmount: item.swapInfo?.outAmount,
    })),
    quote: context.quote,
  });
}

async function handleExecutionExecute(res, body) {
  const readiness = await executionReadiness();
  if (!readiness.canExecuteLive) {
    sendJson(res, 403, {
      ok: false,
      error: 'Live execution is blocked',
      readiness,
    });
    return;
  }
  if (CONFIG.simulateOnly) {
    sendJson(res, 409, {
      ok: false,
      error: 'SIMULATE_ONLY is true',
    });
    return;
  }

  const context = await buildExecutionContext(body);
  const swapUsdValue = Number(context.quote.swapUsdValue || 0);
  if (swapUsdValue > CONFIG.maxExecutionUsd) {
    sendJson(res, 400, {
      ok: false,
      error: `Swap size exceeds MAX_EXECUTION_USD (${CONFIG.maxExecutionUsd})`,
      swapUsdValue: round2(swapUsdValue),
    });
    return;
  }

  const swapResponse = await buildSwapTransaction(
    context.quote,
    getSignerInfo().publicKey,
  );
  const execution = await broadcastSwap({
    swapResponse,
    quoteResponse: context.quote,
    inputToken: context.inputToken,
    outputToken: context.outputToken,
    uiAmount: context.amount,
  });
  sendJson(res, 200, {
    ok: true,
    execution,
    swapBuild: {
      lastValidBlockHeight: swapResponse.lastValidBlockHeight,
      prioritizationFeeLamports: swapResponse.prioritizationFeeLamports,
      computeUnitLimit: swapResponse.computeUnitLimit,
    },
  });
}

function limitFrom(url, fallback) {
  const value = Number(url.searchParams.get('limit') || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function simulate(body) {
  const capital = Number(body.capital || CONFIG.defaultCapitalUsd);
  const spreadBps = Number(body.spreadBps || 0);
  const minProfit = Number(body.minProfit || 0);
  const gross = capital * (spreadBps / 10000);
  const costs = capital * (CONFIG.estimatedCostBps / 10000);
  const net = gross - costs;
  return {
    status: net >= minProfit ? 'pass' : 'fail',
    capital: round2(capital),
    spreadBps: round2(spreadBps),
    gross: round2(gross),
    costs: round2(costs),
    net: round2(net),
    warning:
      'Simulation uses public routing estimates and fixed costs. It is not a realized PnL guarantee.',
  };
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function round6(value) {
  return Math.round(Number(value || 0) * 1000000) / 1000000;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'tradebothub-mev-live-api',
        ...getStats(),
        readiness: await executionReadiness(),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/stats') {
      sendJson(res, 200, getStats());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/market') {
      sendJson(res, 200, {
        items: state.market.slice(0, limitFrom(url, 250)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/opportunities') {
      sendJson(res, 200, {
        items: state.opportunities.slice(0, limitFrom(url, 150)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/transactions') {
      sendJson(res, 200, {
        items: state.transactions.slice(0, limitFrom(url, 100)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/arbitrages') {
      sendJson(res, 200, {
        items: state.arbitrages.slice(0, limitFrom(url, 100)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/searchers') {
      sendJson(res, 200, {
        items: state.searchers.slice(0, limitFrom(url, 100)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/errors') {
      sendJson(res, 200, {
        items: state.errors.slice(0, limitFrom(url, 50)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/tokens') {
      sendJson(res, 200, {
        items: DEFAULT_TOKENS,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/execution/status') {
      sendJson(res, 200, await executionReadiness());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/executions') {
      sendJson(res, 200, {
        items: state.executions.slice(0, limitFrom(url, 100)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/stream') {
      registerSseClient(req, res);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/scan') {
      await scanMarket();
      sendJson(res, 200, { ok: true, lastScanAt: state.lastScanAt });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/simulate') {
      const body = await readBody(req);
      sendJson(res, 200, simulate(body));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/execution/quote') {
      const body = await readBody(req);
      await handleExecutionQuote(res, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/execution/execute') {
      const body = await readBody(req);
      await handleExecutionExecute(res, body);
      return;
    }

    sendText(res, 404, 'Not found');
  } catch (error) {
    logError('Request failed', error);
    sendJson(res, 500, {
      ok: false,
      error: error.message,
    });
  }
});

server.listen(CONFIG.port, async () => {
  console.log(`TradeBotHub backend v${VERSION} listening on ${CONFIG.port}`);
  await scanMarket();
  setInterval(() => {
    void scanMarket();
  }, CONFIG.pollIntervalMs);
});
