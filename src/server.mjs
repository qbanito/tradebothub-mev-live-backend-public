import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
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

const VERSION = '3.4.0';
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
const SOLANA_EXECUTION_TOKENS = [
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

const SCANNER_ASSET_CATALOG = [
  {
    symbol: 'SOL',
    name: 'Wrapped SOL',
    address: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    chainId: 'solana',
    chainName: 'Solana',
    executionSupported: true,
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    chainId: 'solana',
    chainName: 'Solana',
    executionSupported: true,
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    chainId: 'solana',
    chainName: 'Solana',
    executionSupported: true,
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
    chainId: 'solana',
    chainName: 'Solana',
    executionSupported: true,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    decimals: 18,
    chainId: 'ethereum',
    chainName: 'Ethereum',
    executionSupported: false,
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    chainId: 'ethereum',
    chainName: 'Ethereum',
    executionSupported: false,
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    decimals: 18,
    chainId: 'ethereum',
    chainName: 'Ethereum',
    executionSupported: false,
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    decimals: 18,
    chainId: 'ethereum',
    chainName: 'Ethereum',
    executionSupported: false,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: 'base',
    chainName: 'Base',
    executionSupported: false,
  },
  {
    symbol: 'AERO',
    name: 'Aerodrome',
    address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    decimals: 18,
    chainId: 'base',
    chainName: 'Base',
    executionSupported: false,
  },
  {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped BTC',
    address: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
    decimals: 8,
    chainId: 'base',
    chainName: 'Base',
    executionSupported: false,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    chainId: 'arbitrum',
    chainName: 'Arbitrum',
    executionSupported: false,
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8,
    chainId: 'arbitrum',
    chainName: 'Arbitrum',
    executionSupported: false,
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    chainId: 'arbitrum',
    chainName: 'Arbitrum',
    executionSupported: false,
  },
  {
    symbol: 'GMX',
    name: 'GMX',
    address: '0xfc5A1A6EB076aD7fD8a84bA5C3FfF3A8A0bA029A',
    decimals: 18,
    chainId: 'arbitrum',
    chainName: 'Arbitrum',
    executionSupported: false,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: 'optimism',
    chainName: 'Optimism',
    executionSupported: false,
  },
  {
    symbol: 'OP',
    name: 'Optimism',
    address: '0x4200000000000000000000000000000000000042',
    decimals: 18,
    chainId: 'optimism',
    chainName: 'Optimism',
    executionSupported: false,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    decimals: 18,
    chainId: 'polygon',
    chainName: 'Polygon',
    executionSupported: false,
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    decimals: 8,
    chainId: 'polygon',
    chainName: 'Polygon',
    executionSupported: false,
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    address: '0x53E0bca35eC356BD5ddDFebBD1Fc0fD03FaBad39',
    decimals: 18,
    chainId: 'polygon',
    chainName: 'Polygon',
    executionSupported: false,
  },
  {
    symbol: 'WBNB',
    name: 'Wrapped BNB',
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    decimals: 18,
    chainId: 'bsc',
    chainName: 'BNB Chain',
    executionSupported: false,
  },
  {
    symbol: 'BTCB',
    name: 'BTCB',
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    decimals: 18,
    chainId: 'bsc',
    chainName: 'BNB Chain',
    executionSupported: false,
  },
  {
    symbol: 'CAKE',
    name: 'PancakeSwap',
    address: '0x0E09Fabb73Bd3Ade0A17ECC321fD13a19e81cE82',
    decimals: 18,
    chainId: 'bsc',
    chainName: 'BNB Chain',
    executionSupported: false,
  },
  {
    symbol: 'WAVAX',
    name: 'Wrapped AVAX',
    address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    decimals: 18,
    chainId: 'avalanche',
    chainName: 'Avalanche',
    executionSupported: false,
  },
  {
    symbol: 'JOE',
    name: 'JOE',
    address: '0x6e84A6216eA6dACC71eE8E6b0a5B7322EEbC0fDd',
    decimals: 18,
    chainId: 'avalanche',
    chainName: 'Avalanche',
    executionSupported: false,
  },
];

const CONFIG = {
  port: envNumber('PORT', 8787),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  executionMode: (process.env.EXECUTION_MODE || 'paper').toLowerCase(),
  liveTradingEnabled: envBool('LIVE_TRADING_ENABLED', false),
  pollIntervalMs: envNumber('POLL_INTERVAL_MS', 15000),
  minSpreadBps: envNumber('MIN_SPREAD_BPS', 15),
  maxSpreadBps: envNumber('MAX_SPREAD_BPS', 1200),
  minPairLiquidityUsd: envNumber('MIN_PAIR_LIQUIDITY_USD', 50000),
  minOpportunityCapitalUsd: envNumber('MIN_OPPORTUNITY_CAPITAL_USD', 250),
  maxPairsPerToken: envNumber('MAX_PAIRS_PER_TOKEN', 8),
  maxMedianDeviationBps: envNumber('MAX_MEDIAN_DEVIATION_BPS', 1500),
  defaultCapitalUsd: envNumber('DEFAULT_CAPITAL_USD', 10000),
  estimatedCostBps: envNumber('ESTIMATED_COST_BPS', 12),
  maxMarketRows: envNumber('MAX_MARKET_ROWS', 600),
  maxOpportunities: envNumber('MAX_OPPORTUNITIES', 250),
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
  demoExecutionEnabled: envBool('DEMO_EXECUTION_ENABLED', true),
  guardrailKillSwitch: envBool('GUARDRAIL_KILL_SWITCH', false),
  executionCooldownMs: envNumber('EXECUTION_COOLDOWN_MS', 30000),
  maxDailyLossUsd: envNumber('MAX_DAILY_LOSS_USD', 250),
  maxConsecutiveFailures: envNumber('MAX_CONSECUTIVE_FAILURES', 3),
  maxTokenExposureUsd: envNumber('MAX_TOKEN_EXPOSURE_USD', 2000),
  maxPriceImpactPct: envNumber('MAX_PRICE_IMPACT_PCT', 5),
  minQuoteOutUsd: envNumber('MIN_QUOTE_OUT_USD', 20),
  tradeLedgerMaxEntries: envNumber('TRADE_LEDGER_MAX_ENTRIES', 500),
  tradeLedgerPath:
    process.env.TRADE_LEDGER_PATH || '/tmp/tradebothub-mev-runtime.json',
  executionBlacklistAssets: csv(process.env.EXECUTION_BLACKLIST_ASSETS || ''),
  executionBlacklistDexes: csv(process.env.EXECUTION_BLACKLIST_DEXES || ''),
  indexerLookbackLimit: envNumber('INDEXER_LOOKBACK_LIMIT', 100),
};

const SCANNER_CHAIN_IDS = new Set(
  csv(process.env.SCANNER_CHAIN_IDS || '').length
    ? csv(process.env.SCANNER_CHAIN_IDS || '').map((item) => item.toLowerCase())
    : [...new Set(SCANNER_ASSET_CATALOG.map((asset) => asset.chainId))],
);
const SCANNER_ASSET_KEYS = new Set(
  csv(process.env.SCANNER_ASSET_KEYS || '').map((item) => item.toLowerCase()),
);
const SCANNER_ASSETS = SCANNER_ASSET_CATALOG.filter((asset) => {
  const assetKey = `${asset.chainId}:${asset.symbol}`.toLowerCase();
  if (!SCANNER_CHAIN_IDS.has(asset.chainId)) {
    return false;
  }
  if (!SCANNER_ASSET_KEYS.size) {
    return true;
  }
  return (
    SCANNER_ASSET_KEYS.has(assetKey) ||
    SCANNER_ASSET_KEYS.has(asset.symbol.toLowerCase()) ||
    SCANNER_ASSET_KEYS.has(asset.chainId.toLowerCase())
  );
});

const EXECUTOR_REGISTRY = {
  solana: {
    chainId: 'solana',
    chainName: 'Solana',
    status: 'active',
    quoteSupport: true,
    buildSupport: true,
    executeSupport: true,
    walletSupport: true,
    flashLoanStage: 'research',
    routeProvider: 'Jupiter',
    notes: 'Wallet build and live server execution are implemented.',
  },
  base: {
    chainId: 'base',
    chainName: 'Base',
    status: 'prepared',
    quoteSupport: false,
    buildSupport: false,
    executeSupport: false,
    walletSupport: false,
    flashLoanStage: 'planned',
    routeProvider: 'planned',
    notes: 'Scanner coverage is active. Executor wiring is the next step.',
  },
  arbitrum: {
    chainId: 'arbitrum',
    chainName: 'Arbitrum',
    status: 'prepared',
    quoteSupport: false,
    buildSupport: false,
    executeSupport: false,
    walletSupport: false,
    flashLoanStage: 'planned',
    routeProvider: 'planned',
    notes: 'Good target for atomic router plus flash-loan strategy.',
  },
  bsc: {
    chainId: 'bsc',
    chainName: 'BNB Chain',
    status: 'prepared',
    quoteSupport: false,
    buildSupport: false,
    executeSupport: false,
    walletSupport: false,
    flashLoanStage: 'planned',
    routeProvider: 'planned',
    notes: 'Discovery is on. Execution router is still pending.',
  },
  ethereum: {
    chainId: 'ethereum',
    chainName: 'Ethereum',
    status: 'discovery',
    quoteSupport: false,
    buildSupport: false,
    executeSupport: false,
    walletSupport: false,
    flashLoanStage: 'planned',
    routeProvider: 'planned',
    notes: 'Scanner only for now because gas makes weak routes unusable.',
  },
  optimism: {
    chainId: 'optimism',
    chainName: 'Optimism',
    status: 'discovery',
    quoteSupport: false,
    buildSupport: false,
    executeSupport: false,
    walletSupport: false,
    flashLoanStage: 'planned',
    routeProvider: 'planned',
    notes: 'Tracked for discovery expansion.',
  },
  polygon: {
    chainId: 'polygon',
    chainName: 'Polygon',
    status: 'discovery',
    quoteSupport: false,
    buildSupport: false,
    executeSupport: false,
    walletSupport: false,
    flashLoanStage: 'planned',
    routeProvider: 'planned',
    notes: 'Tracked for discovery expansion.',
  },
  avalanche: {
    chainId: 'avalanche',
    chainName: 'Avalanche',
    status: 'discovery',
    quoteSupport: false,
    buildSupport: false,
    executeSupport: false,
    walletSupport: false,
    flashLoanStage: 'planned',
    routeProvider: 'planned',
    notes: 'Tracked for discovery expansion.',
  },
};

const STRATEGY_CATALOG = [
  {
    id: 'wallet-route',
    name: 'Wallet route execution',
    stage: 'active',
    chainIds: ['solana'],
    flashLoan: false,
    atomic: false,
    requiresOwnCapital: true,
    description: 'Backend prepares a swap and the browser wallet signs locally.',
  },
  {
    id: 'server-live-executor',
    name: 'Server live executor',
    stage: 'guarded',
    chainIds: ['solana'],
    flashLoan: false,
    atomic: false,
    requiresOwnCapital: true,
    description: 'Server-side execution is available but intentionally blocked until signer and live flags are correct.',
  },
  {
    id: 'multi-chain-router',
    name: 'Multi-chain router',
    stage: 'building',
    chainIds: ['base', 'arbitrum', 'bsc'],
    flashLoan: false,
    atomic: false,
    requiresOwnCapital: true,
    description: 'Prepared execution slots for the next chains after Solana.',
  },
  {
    id: 'atomic-arb-engine',
    name: 'Atomic arbitrage engine',
    stage: 'planned',
    chainIds: ['solana', 'base', 'arbitrum', 'bsc'],
    flashLoan: true,
    atomic: true,
    requiresOwnCapital: false,
    description: 'Future route for contract-based atomic bundles and post-trade settlement.',
  },
  {
    id: 'flash-loan-orchestrator',
    name: 'Flash-loan orchestrator',
    stage: 'research',
    chainIds: ['base', 'arbitrum', 'bsc', 'ethereum'],
    flashLoan: true,
    atomic: true,
    requiresOwnCapital: false,
    description: 'Scaffolding and readiness metadata only. Real flash-loan contracts are not deployed yet.',
  },
];

const state = {
  market: [],
  opportunities: [],
  transactions: [],
  arbitrages: [],
  searchers: [],
  executions: [],
  tradeLedger: [],
  errors: [],
  lastScanAt: null,
  lastExecutionAt: null,
  lastErrorAt: null,
  risk: {
    killSwitch: CONFIG.guardrailKillSwitch,
    killSwitchReason: CONFIG.guardrailKillSwitch
      ? 'Enabled from environment'
      : null,
    assetBlacklist: [...CONFIG.executionBlacklistAssets],
    dexBlacklist: [...CONFIG.executionBlacklistDexes],
    lastAttemptByKey: {},
  },
  indexer: {
    status: CONFIG.heliusApiKey ? 'configured' : 'disabled',
    source: CONFIG.heliusApiKey ? 'manual-ingest' : 'off',
  },
};

const sseClients = new Set();
const tokenCache = new Map();
const validationCache = new Map();
let signerCache;

const connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');

for (const token of SOLANA_EXECUTION_TOKENS) {
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

function todayKey(value = nowIso()) {
  return String(value).slice(0, 10);
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

async function loadRuntimeState() {
  try {
    const raw = await fs.readFile(CONFIG.tradeLedgerPath, 'utf8');
    const parsed = JSON.parse(raw);
    state.tradeLedger = Array.isArray(parsed.tradeLedger) ? parsed.tradeLedger : [];
    state.risk = {
      ...state.risk,
      ...(parsed.risk || {}),
      assetBlacklist: Array.isArray(parsed.risk?.assetBlacklist)
        ? parsed.risk.assetBlacklist
        : state.risk.assetBlacklist,
      dexBlacklist: Array.isArray(parsed.risk?.dexBlacklist)
        ? parsed.risk.dexBlacklist
        : state.risk.dexBlacklist,
      lastAttemptByKey:
        parsed.risk && typeof parsed.risk.lastAttemptByKey === 'object'
          ? parsed.risk.lastAttemptByKey
          : {},
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logError('Runtime state load failed', error);
    }
  }
}

async function persistRuntimeState() {
  try {
    await fs.mkdir(path.dirname(CONFIG.tradeLedgerPath), { recursive: true });
    await fs.writeFile(
      CONFIG.tradeLedgerPath,
      JSON.stringify(
        {
          tradeLedger: state.tradeLedger,
          risk: state.risk,
        },
        null,
        2,
      ),
      'utf8',
    );
  } catch (error) {
    logError('Runtime state persist failed', error);
  }
}

function isStableSymbol(symbol) {
  return ['USDC', 'USDT', 'DAI', 'USD'].includes(String(symbol || '').toUpperCase());
}

function sumRealizedNetUsd(entries) {
  return round2(
    entries.reduce((sum, item) => sum + Number(item.realizedNetUsd || 0), 0),
  );
}

function stableUsdValueFromAmount(amount, symbol) {
  return isStableSymbol(symbol) ? round2(Number(amount || 0)) : null;
}

function recordAttemptCooldown(key, at = nowIso()) {
  state.risk.lastAttemptByKey[key] = at;
}

function recentAttemptsForToday() {
  const key = todayKey();
  return state.tradeLedger.filter((item) => item.dayKey === key);
}

function consecutiveFailureCount(entries = state.tradeLedger) {
  let count = 0;
  for (const item of entries) {
    const failed = !item.success || ['rejected', 'failed', 'quote-failed'].includes(item.status);
    if (!failed) {
      break;
    }
    count += 1;
  }
  return count;
}

function tokenExposureMap(entries = recentAttemptsForToday()) {
  const map = {};
  for (const item of entries) {
    if (!item.assetSymbol) {
      continue;
    }
    map[item.assetSymbol] = round2((map[item.assetSymbol] || 0) + Number(item.notionalUsd || 0));
  }
  return map;
}

function computeRiskSummary() {
  const todayEntries = recentAttemptsForToday();
  const dailyRealizedNetUsd = sumRealizedNetUsd(todayEntries);
  const dailyLossUsd = round2(Math.max(0, -dailyRealizedNetUsd));
  const consecutiveFailures = consecutiveFailureCount();
  const exposureByAsset = tokenExposureMap(todayEntries);
  const activeCooldowns = Object.entries(state.risk.lastAttemptByKey || {})
    .map(([key, value]) => {
      const remainingMs =
        CONFIG.executionCooldownMs - (Date.now() - new Date(value).getTime());
      return {
        key,
        remainingMs: Math.max(0, remainingMs),
      };
    })
    .filter((item) => item.remainingMs > 0)
    .sort((a, b) => b.remainingMs - a.remainingMs);

  return {
    killSwitch: Boolean(state.risk.killSwitch),
    killSwitchReason: state.risk.killSwitchReason,
    blacklist: {
      assets: [...state.risk.assetBlacklist],
      dexes: [...state.risk.dexBlacklist],
    },
    limits: {
      cooldownMs: CONFIG.executionCooldownMs,
      maxDailyLossUsd: CONFIG.maxDailyLossUsd,
      maxConsecutiveFailures: CONFIG.maxConsecutiveFailures,
      maxTokenExposureUsd: CONFIG.maxTokenExposureUsd,
      maxExecutionUsd: CONFIG.maxExecutionUsd,
      maxPriceImpactPct: CONFIG.maxPriceImpactPct,
      minQuoteOutUsd: CONFIG.minQuoteOutUsd,
    },
    counters: {
      totalLedgerEntries: state.tradeLedger.length,
      todayEntries: todayEntries.length,
      dailyRealizedNetUsd,
      dailyLossUsd,
      consecutiveFailures,
    },
    exposureByAsset,
    activeCooldowns,
  };
}

function appendTradeLedger(entry) {
  const normalized = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    dayKey: todayKey(),
    ...entry,
  };
  state.tradeLedger.unshift(normalized);
  state.tradeLedger = state.tradeLedger.slice(0, CONFIG.tradeLedgerMaxEntries);
  void persistRuntimeState();
  broadcastSnapshot();
  return normalized;
}

function markExecutionView(entry) {
  const executionView = {
    id: entry.id,
    createdAt: entry.createdAt,
    signature: entry.signature || `demo-${entry.id.slice(0, 8)}`,
    slot: entry.slot ?? null,
    status: entry.status,
    inputSymbol: entry.inputSymbol,
    outputSymbol: entry.outputSymbol,
    broadcastMode: entry.mode,
    routePlan: Array.isArray(entry.routePlan)
      ? entry.routePlan.map((item) => ({
          label: item.label,
          ammKey: item.ammKey || item.label,
          percent: item.percent,
          bps: item.bps,
        }))
      : [],
  };
  state.executions.unshift(executionView);
  state.executions = state.executions.slice(0, 100);
}

function markTradeTransaction(entry) {
  if (!entry.signature) {
    return;
  }
  state.transactions.unshift({
    slot: entry.slot ?? null,
    signature: entry.signature,
    feePayer: entry.walletPublicKey || entry.feePayer || null,
    programIds: Array.isArray(entry.routePlan)
      ? entry.routePlan.map((item) => item.ammKey || item.label).filter(Boolean)
      : [],
    feeLamports: entry.feeLamports || 0,
    success: Boolean(entry.success),
    detectedAt: entry.createdAt,
  });
  state.transactions = state.transactions.slice(0, 100);
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
  const risk = computeRiskSummary();
  const activeChains = [...new Set(state.market.map((item) => item.chainId).filter(Boolean))];
  const highQualityCount = state.opportunities.filter((item) =>
    ['A', 'B'].includes(item.qualityTier),
  ).length;
  const readyOpportunityCount = state.opportunities.filter(
    (item) => item.executionSupported && item.qualityScore >= 60,
  ).length;
  const liveExecutors = readiness.executors.filter((item) => item.status === 'active').length;
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
    chainCount: activeChains.length,
    scannerAssetCount: SCANNER_ASSETS.length,
    scannerChains: activeChains,
    highQualityOpportunityCount: highQualityCount,
    readyOpportunityCount,
    executorCount: readiness.executors.length,
    liveExecutorCount: liveExecutors,
    estimatedNetUsd: round2(
      state.opportunities.reduce((sum, item) => sum + Number(item.net || 0), 0),
    ),
    realizedNetUsd: risk.counters.dailyRealizedNetUsd,
    dailyLossUsd: risk.counters.dailyLossUsd,
    tradeLedgerCount: state.tradeLedger.length,
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

  const canExecuteLive = reasons.length === 0;

  return {
    version: VERSION,
    mode: CONFIG.executionMode,
    liveTradingEnabled: CONFIG.liveTradingEnabled,
    canExecuteLive,
    walletExecutionSupported: true,
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
    supportedTokens: SOLANA_EXECUTION_TOKENS,
    executionChains: ['solana'],
    scannerAssetCount: SCANNER_ASSETS.length,
    scannerChains: [...SCANNER_CHAIN_IDS],
    executors: listExecutorCapabilities(canExecuteLive),
    strategies: listStrategyCapabilities(),
    risk: computeRiskSummary(),
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

async function fetchTokenPairs(asset) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${asset.address}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`DexScreener ${response.status}`);
  }
  const payload = await response.json();
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  return pairs
    .filter((pair) => pair.chainId === asset.chainId)
    .filter((pair) => Number(pair.priceUsd) > 0 && Number(pair.liquidity?.usd || 0) > 0)
    .map((pair) => normalizePair(asset, pair))
    .sort((a, b) => b.liquidity - a.liquidity);
}

function normalizePair(asset, pair) {
  return {
    symbol: asset.symbol,
    name: asset.name,
    tokenMint: asset.address,
    assetAddress: asset.address,
    assetKey: `${asset.chainId}:${asset.symbol}`,
    chainId: asset.chainId,
    chainName: asset.chainName,
    executionSupported: asset.executionSupported,
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

function median(values) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function deviationBps(value, baseline) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(value - baseline) / baseline * 10000;
}

function listExecutorCapabilities(solanaLiveReady = false) {
  return Object.values(EXECUTOR_REGISTRY).map((executor) => ({
    ...executor,
    liveReady: executor.chainId === 'solana' ? solanaLiveReady : false,
  }));
}

function listStrategyCapabilities() {
  return STRATEGY_CATALOG.map((strategy) => ({
    ...strategy,
    chainNames: strategy.chainIds.map(
      (chainId) => EXECUTOR_REGISTRY[chainId]?.chainName || chainId,
    ),
  }));
}

function qualityTierFromScore(score) {
  if (score >= 80) {
    return 'A';
  }
  if (score >= 65) {
    return 'B';
  }
  if (score >= 50) {
    return 'C';
  }
  return 'D';
}

function strategyHintsForOpportunity(opportunity) {
  const executor = EXECUTOR_REGISTRY[opportunity.chainId] || null;
  if (opportunity.executionSupported) {
    const flashLoanCandidate =
      opportunity.capital > CONFIG.maxExecutionUsd || opportunity.net >= 20;
    return {
      executionProfile: 'wallet-route',
      strategyLabel: flashLoanCandidate ? 'Wallet now, atomic later' : 'Wallet executable',
      flashLoanCandidate,
      requiresOwnCapital: true,
      atomicCandidate: flashLoanCandidate,
      recommendedMode: 'wallet-build',
      executorStatus: executor?.status || 'active',
    };
  }

  const flashLoanCandidate = ['base', 'arbitrum', 'bsc', 'ethereum'].includes(
    opportunity.chainId,
  );
  return {
    executionProfile: flashLoanCandidate ? 'atomic-arb-engine' : 'discovery-only',
    strategyLabel: flashLoanCandidate ? 'Atomic / flash-loan path' : 'Discovery only',
    flashLoanCandidate,
    requiresOwnCapital: !flashLoanCandidate,
    atomicCandidate: flashLoanCandidate,
    recommendedMode: flashLoanCandidate ? 'wait-executor' : 'paper',
    executorStatus: executor?.status || 'discovery',
  };
}

function qualityModel({
  buy,
  sell,
  spreadBps,
  net,
  baselinePriceUsd,
  executionSupported,
}) {
  const minLiquidity = Math.min(buy.liquidity, sell.liquidity);
  const combinedVolume24h = buy.volume24h + sell.volume24h;
  const combinedTxns1h = buy.txns1h + sell.txns1h;
  const averageDeviationBps =
    (deviationBps(buy.priceUsd, baselinePriceUsd) +
      deviationBps(sell.priceUsd, baselinePriceUsd)) /
    2;

  const spreadScore = clamp((spreadBps / 180) * 28, 0, 28);
  const liquidityScore = clamp((Math.log10(minLiquidity + 1) - 4.2) * 8, 0, 20);
  const volumeScore = clamp((Math.log10(combinedVolume24h + 1) - 3) * 5, 0, 16);
  const activityScore = clamp(combinedTxns1h / 18, 0, 10);
  const netScore = clamp(net / 3, 0, 10);
  const stabilityScore = clamp(12 - averageDeviationBps / 55, 0, 12);
  const executionScore = executionSupported ? 10 : 2;
  const qualityScore = round2(
    clamp(
      spreadScore +
        liquidityScore +
        volumeScore +
        activityScore +
        netScore +
        stabilityScore +
        executionScore,
      1,
      100,
    ),
  );

  return {
    qualityScore,
    qualityTier: qualityTierFromScore(qualityScore),
    minLiquidityUsd: round2(minLiquidity),
    maxLiquidityUsd: round2(Math.max(buy.liquidity, sell.liquidity)),
    combinedVolume24h: round2(combinedVolume24h),
    combinedTxns1h,
    priceDeviationBps: round2(averageDeviationBps),
  };
}

function deriveOpportunities(market) {
  const grouped = new Map();
  for (const item of market) {
    const current = grouped.get(item.assetKey) || [];
    current.push(item);
    grouped.set(item.assetKey, current);
  }

  const opportunities = [];
  for (const [, items] of grouped.entries()) {
    if (items.length < 2) {
      continue;
    }

    const liquidItems = items
      .filter((item) => item.liquidity >= CONFIG.minPairLiquidityUsd)
      .sort((a, b) => b.liquidity - a.liquidity)
      .slice(0, CONFIG.maxPairsPerToken);

    if (liquidItems.length < 2) {
      continue;
    }

    const baselinePriceUsd = median(liquidItems.map((item) => item.priceUsd));
    const normalizedItems = liquidItems.filter(
      (item) =>
        deviationBps(item.priceUsd, baselinePriceUsd) <=
        CONFIG.maxMedianDeviationBps,
    );

    if (normalizedItems.length < 2) {
      continue;
    }

    for (let i = 0; i < normalizedItems.length; i += 1) {
      for (let j = i + 1; j < normalizedItems.length; j += 1) {
        const first = normalizedItems[i];
        const second = normalizedItems[j];
        if (first.dex === second.dex) {
          continue;
        }

        const buy = first.priceUsd <= second.priceUsd ? first : second;
        const sell = first.priceUsd <= second.priceUsd ? second : first;
        const spreadBps = ((sell.priceUsd - buy.priceUsd) / buy.priceUsd) * 10000;
        if (
          !Number.isFinite(spreadBps) ||
          spreadBps < CONFIG.minSpreadBps ||
          spreadBps > CONFIG.maxSpreadBps
        ) {
          continue;
        }

        const capital = Math.min(
          CONFIG.defaultCapitalUsd,
          buy.liquidity * 0.01,
          sell.liquidity * 0.01,
        );
        if (capital < CONFIG.minOpportunityCapitalUsd) {
          continue;
        }

        const gross = capital * (spreadBps / 10000);
        const costs = capital * (CONFIG.estimatedCostBps / 10000);
        const net = gross - costs;
        const quality = qualityModel({
          buy,
          sell,
          spreadBps,
          net,
          baselinePriceUsd,
          executionSupported: buy.executionSupported,
        });
        const hints = strategyHintsForOpportunity({
          chainId: buy.chainId,
          executionSupported: buy.executionSupported,
          capital,
          net,
        });
        opportunities.push({
          id: crypto.randomUUID(),
          detectedAt: nowIso(),
          symbol: buy.symbol,
          chainId: buy.chainId,
          chainName: buy.chainName,
          executionSupported: buy.executionSupported,
          tokenMint: buy.tokenMint,
          assetAddress: buy.assetAddress,
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
          status: net > 0 ? (buy.executionSupported ? 'ready' : 'candidate') : 'watch',
          routePreview: [buy.dex, sell.dex],
          marketBaselineUsd: round6(baselinePriceUsd),
          quoteSymbol: buy.quoteSymbol,
          qualityScore: quality.qualityScore,
          qualityTier: quality.qualityTier,
          minLiquidityUsd: quality.minLiquidityUsd,
          maxLiquidityUsd: quality.maxLiquidityUsd,
          combinedVolume24h: quality.combinedVolume24h,
          combinedTxns1h: quality.combinedTxns1h,
          priceDeviationBps: quality.priceDeviationBps,
          executionProfile: hints.executionProfile,
          strategyLabel: hints.strategyLabel,
          flashLoanCandidate: hints.flashLoanCandidate,
          atomicCandidate: hints.atomicCandidate,
          requiresOwnCapital: hints.requiresOwnCapital,
          recommendedMode: hints.recommendedMode,
          executorStatus: hints.executorStatus,
          validationState: buy.executionSupported ? 'pending-quote' : 'discovery-only',
        });
      }
    }
  }

  return opportunities
    .sort((a, b) => b.qualityScore - a.qualityScore || b.net - a.net)
    .slice(0, CONFIG.maxOpportunities);
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
    const results = await Promise.all(SCANNER_ASSETS.map((asset) => fetchTokenPairs(asset)));
    state.market = results
      .flat()
      .sort((a, b) => b.liquidity - a.liquidity)
      .slice(0, CONFIG.maxMarketRows);
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
  opportunity = null,
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

  const entry = appendTradeLedger({
    type: 'server-live',
    mode: 'server-live',
    status: execution.status,
    success: execution.success,
    signature: execution.signature,
    slot: execution.slot,
    walletPublicKey: signer.publicKey,
    opportunityId: opportunity?.id || null,
    assetSymbol: outputToken.symbol,
    inputSymbol: inputToken.symbol,
    outputSymbol: outputToken.symbol,
    inputMint: inputToken.mint,
    outputMint: outputToken.mint,
    amountIn: String(uiAmount),
    quotedOutAmount: execution.amountOutQuoted,
    actualOutAmount: execution.amountOutQuoted,
    quotedNotionalUsd: execution.quotedOutUsd,
    notionalUsd: execution.quotedOutUsd,
    realizedNetUsd: stableUsdValueFromAmount(execution.amountOutQuoted, outputToken.symbol),
    feeLamports: execution.feeLamports,
    routePlan: execution.routePlan,
    priceImpactPct: execution.priceImpactPct,
  });
  markExecutionView({
    ...entry,
    signature: execution.signature,
    slot: execution.slot,
    inputSymbol: execution.inputSymbol,
    outputSymbol: execution.outputSymbol,
    routePlan: execution.routePlan,
  });
  markTradeTransaction({
    ...entry,
    signature: execution.signature,
    slot: execution.slot,
    feeLamports: execution.feeLamports,
    walletPublicKey: signer.publicKey,
    routePlan: execution.routePlan,
    success: true,
  });
  state.lastExecutionAt = execution.createdAt;
  rebuildActivityViews();
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

function validationCacheKey(opportunityId, usd, slippageBps) {
  return `${opportunityId}:${round2(usd)}:${Number(slippageBps)}`;
}

function getCachedValidation(key) {
  const entry = validationCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt < Date.now()) {
    validationCache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCachedValidation(key, payload) {
  validationCache.set(key, {
    payload,
    expiresAt: Date.now() + 30000,
  });
}

function findOpportunity(id) {
  return state.opportunities.find((item) => item.id === id) || null;
}

function safeUsdAmount(opportunity, requestedUsd) {
  const opportunityCap = Number(opportunity.capital || CONFIG.maxExecutionUsd);
  const fallback = Math.min(opportunityCap, CONFIG.maxExecutionUsd, 250);
  const chosen = Number.isFinite(Number(requestedUsd)) ? Number(requestedUsd) : fallback;
  return round2(clamp(chosen, 25, Math.max(25, Math.min(opportunityCap, CONFIG.maxExecutionUsd))));
}

async function validateSolanaOpportunity(opportunity, options = {}) {
  const usdc = tokenCache.get('USDC');
  const asset = await resolveToken(opportunity.tokenMint || opportunity.assetAddress);
  if (!usdc || !asset) {
    throw new Error('Token metadata is missing for Solana validation');
  }

  const amountUsd = safeUsdAmount(opportunity, options.usd);
  const slippageBps = clamp(
    Number(options.slippageBps || CONFIG.swapSlippageBps),
    1,
    500,
  );
  const key = validationCacheKey(opportunity.id, amountUsd, slippageBps);
  const cached = getCachedValidation(key);
  if (cached) {
    return cached;
  }

  const rawUsdcIn = humanToRawAmount(amountUsd.toFixed(usdc.decimals), usdc.decimals);
  const buyQuote = await fetchSwapQuote({
    inputMint: usdc.mint,
    outputMint: asset.mint,
    rawAmount: rawUsdcIn,
    slippageBps,
  });
  const sellQuote = await fetchSwapQuote({
    inputMint: asset.mint,
    outputMint: usdc.mint,
    rawAmount: BigInt(String(buyQuote.outAmount)),
    slippageBps,
  });

  const quotedTokenOut = Number(rawToHuman(buyQuote.outAmount, asset.decimals));
  const quotedUsdBack = Number(rawToHuman(sellQuote.outAmount, usdc.decimals));
  const roundTripNetUsd = round2(quotedUsdBack - amountUsd);
  const roundTripDriftBps = round2(((quotedUsdBack - amountUsd) / amountUsd) * 10000);
  const maxPriceImpactPct = round6(
    Math.max(
      Number(buyQuote.priceImpactPct || 0),
      Number(sellQuote.priceImpactPct || 0),
    ),
  );
  const executable = quotedTokenOut > 0 && quotedUsdBack > 0 && maxPriceImpactPct <= 5;
  const profitValidated = roundTripNetUsd > 0 && opportunity.net > 0;

  const payload = {
    opportunityId: opportunity.id,
    checkedAt: nowIso(),
    chainId: opportunity.chainId,
    chainName: opportunity.chainName,
    executorStatus: 'active',
    validationMode: 'live-quote-roundtrip',
    status: executable ? (profitValidated ? 'validated' : 'routable') : 'weak',
    statusLabel: executable ? (profitValidated ? 'Quote OK' : 'Route OK') : 'Weak route',
    executable,
    profitValidated,
    amountUsd,
    slippageBps,
    quotedTokenOut: round6(quotedTokenOut),
    quotedUsdBack: round2(quotedUsdBack),
    roundTripNetUsd,
    roundTripDriftBps,
    maxPriceImpactPct,
    routeIn: (buyQuote.routePlan || []).map((item) => item.swapInfo?.label).filter(Boolean),
    routeOut: (sellQuote.routePlan || []).map((item) => item.swapInfo?.label).filter(Boolean),
    warning: profitValidated
      ? null
      : 'A live route exists, but this does not prove cross-DEX arbitrage profit after execution.',
    recommendedMode: profitValidated ? 'wallet-build' : 'paper',
  };
  setCachedValidation(key, payload);
  return payload;
}

async function validateOpportunity(opportunity, options = {}) {
  const executor = EXECUTOR_REGISTRY[opportunity.chainId];
  if (!executor) {
    return {
      opportunityId: opportunity.id,
      checkedAt: nowIso(),
      chainId: opportunity.chainId,
      chainName: opportunity.chainName,
      executorStatus: 'unknown',
      validationMode: 'none',
      status: 'unknown',
      statusLabel: 'Unknown chain',
      executable: false,
      profitValidated: false,
      warning: 'No executor metadata exists for this chain.',
      recommendedMode: 'paper',
    };
  }

  if (opportunity.chainId === 'solana' && executor.quoteSupport) {
    try {
      return await validateSolanaOpportunity(opportunity, options);
    } catch (error) {
      return {
        opportunityId: opportunity.id,
        checkedAt: nowIso(),
        chainId: opportunity.chainId,
        chainName: opportunity.chainName,
        executorStatus: executor.status,
        validationMode: 'live-quote-roundtrip',
        status: 'quote-failed',
        statusLabel: 'Quote failed',
        executable: false,
        profitValidated: false,
        warning: error.message,
        recommendedMode: 'paper',
      };
    }
  }

  return {
    opportunityId: opportunity.id,
    checkedAt: nowIso(),
    chainId: opportunity.chainId,
    chainName: opportunity.chainName,
    executorStatus: executor.status,
    validationMode: 'executor-metadata',
    status: executor.status === 'prepared' ? 'prepared' : 'discovery-only',
    statusLabel: executor.status === 'prepared' ? 'Executor pending' : 'Discovery only',
    executable: false,
    profitValidated: false,
    warning: `${executor.chainName} scanner is live, but execution is not active on this chain yet.`,
    recommendedMode: executor.status === 'prepared' ? 'wait-executor' : 'paper',
  };
}

async function handleOpportunityValidation(res, body) {
  const ids = Array.isArray(body.ids)
    ? body.ids.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const limit = clamp(Number(body.limit || ids.length || 5), 1, 10);
  const selected = (
    ids.length
      ? ids.map((id) => findOpportunity(id)).filter(Boolean)
      : state.opportunities.slice(0, limit)
  ).slice(0, limit);

  if (!selected.length) {
    sendJson(res, 404, {
      ok: false,
      error: 'No matching opportunities were found for validation',
    });
    return;
  }

  const items = await Promise.all(
    selected.map((item) =>
      validateOpportunity(item, {
        usd: body.usd,
        slippageBps: body.slippageBps,
      }),
    ),
  );

  sendJson(res, 200, { items });
}

function opportunityAttemptKey(opportunity, body = {}) {
  if (opportunity?.id) {
    return `opportunity:${opportunity.id}`;
  }
  if (body.inputToken && body.outputToken) {
    return `pair:${String(body.inputToken).toUpperCase()}-${String(body.outputToken).toUpperCase()}`;
  }
  if (body.outputMint || body.outputToken) {
    return `asset:${String(body.outputMint || body.outputToken).toUpperCase()}`;
  }
  return 'global';
}

function normalizeRouteLabels(routePlan = []) {
  return routePlan.map((item) => ({
    label: item.label || item.swapInfo?.label || 'route',
    ammKey: item.ammKey || item.swapInfo?.ammKey || null,
    percent: item.percent ?? null,
    bps: item.bps ?? null,
  }));
}

function priceImpactWithinLimit(priceImpactPct) {
  return Number(priceImpactPct || 0) <= CONFIG.maxPriceImpactPct;
}

function findOpportunityForRequest(body = {}) {
  if (!body.opportunityId) {
    return null;
  }
  return findOpportunity(String(body.opportunityId).trim());
}

function assetExposureForKey(assetSymbol, summary) {
  if (!assetSymbol) {
    return 0;
  }
  return Number(summary.exposureByAsset?.[assetSymbol] || 0);
}

function checkRiskGuardrails({
  body = {},
  opportunity = null,
  swapUsdValue = 0,
  priceImpactPct = 0,
  routePlan = [],
  mode = 'wallet-build',
}) {
  const summary = computeRiskSummary();
  if (state.risk.killSwitch) {
    return {
      ok: false,
      status: 423,
      code: 'kill_switch',
      error: state.risk.killSwitchReason || 'Kill switch is enabled',
      summary,
    };
  }

  if (mode === 'demo' && !CONFIG.demoExecutionEnabled) {
    return {
      ok: false,
      status: 403,
      code: 'demo_disabled',
      error: 'DEMO_EXECUTION_ENABLED is false',
      summary,
    };
  }

  if (summary.counters.dailyLossUsd >= CONFIG.maxDailyLossUsd) {
    return {
      ok: false,
      status: 409,
      code: 'daily_loss_limit',
      error: `Daily loss limit reached (${CONFIG.maxDailyLossUsd} USD)`,
      summary,
    };
  }

  if (summary.counters.consecutiveFailures >= CONFIG.maxConsecutiveFailures) {
    return {
      ok: false,
      status: 409,
      code: 'consecutive_failures',
      error: `Consecutive failure limit reached (${CONFIG.maxConsecutiveFailures})`,
      summary,
    };
  }

  if (Number(swapUsdValue || 0) > CONFIG.maxExecutionUsd) {
    return {
      ok: false,
      status: 400,
      code: 'max_execution_usd',
      error: `Swap size exceeds MAX_EXECUTION_USD (${CONFIG.maxExecutionUsd})`,
      summary,
    };
  }

  if (Number(swapUsdValue || 0) < CONFIG.minQuoteOutUsd) {
    return {
      ok: false,
      status: 400,
      code: 'min_quote_out_usd',
      error: `Swap quote is below MIN_QUOTE_OUT_USD (${CONFIG.minQuoteOutUsd})`,
      summary,
    };
  }

  if (!priceImpactWithinLimit(priceImpactPct)) {
    return {
      ok: false,
      status: 400,
      code: 'price_impact_limit',
      error: `Price impact exceeds MAX_PRICE_IMPACT_PCT (${CONFIG.maxPriceImpactPct})`,
      summary,
    };
  }

  const assetSymbol = opportunity?.symbol || body.outputToken || body.inputToken || null;
  if (
    assetSymbol &&
    state.risk.assetBlacklist.some(
      (item) => item.toUpperCase() === String(assetSymbol).toUpperCase(),
    )
  ) {
    return {
      ok: false,
      status: 403,
      code: 'asset_blacklisted',
      error: `${assetSymbol} is blacklisted`,
      summary,
    };
  }

  const routeLabels = normalizeRouteLabels(routePlan).map((item) =>
    String(item.label || '').toLowerCase(),
  );
  const blockedDex = state.risk.dexBlacklist.find((item) =>
    routeLabels.some((label) => label.includes(String(item).toLowerCase())),
  );
  if (blockedDex) {
    return {
      ok: false,
      status: 403,
      code: 'dex_blacklisted',
      error: `Route touches blacklisted venue ${blockedDex}`,
      summary,
    };
  }

  const currentExposure = assetExposureForKey(assetSymbol, summary);
  if (currentExposure + Number(swapUsdValue || 0) > CONFIG.maxTokenExposureUsd) {
    return {
      ok: false,
      status: 409,
      code: 'token_exposure_limit',
      error: `Token exposure limit reached for ${assetSymbol}`,
      summary,
    };
  }

  const cooldownKey = opportunityAttemptKey(opportunity, body);
  const lastAttempt = state.risk.lastAttemptByKey[cooldownKey];
  if (lastAttempt) {
    const remainingMs =
      CONFIG.executionCooldownMs - (Date.now() - new Date(lastAttempt).getTime());
    if (remainingMs > 0) {
      return {
        ok: false,
        status: 429,
        code: 'cooldown_active',
        error: `Cooldown is active for ${cooldownKey}`,
        summary: {
          ...summary,
          cooldownKey,
          cooldownRemainingMs: remainingMs,
        },
      };
    }
  }

  return {
    ok: true,
    summary,
    cooldownKey,
  };
}

function keyAtIndex(accountKeys = [], index = -1) {
  const item = accountKeys[index];
  if (!item) {
    return null;
  }
  if (typeof item === 'string') {
    return item;
  }
  if (typeof item.pubkey === 'string') {
    return item.pubkey;
  }
  if (item.pubkey?.toBase58) {
    return item.pubkey.toBase58();
  }
  return null;
}

function tokenBalanceDelta(meta, owner, mint) {
  const balances = [
    ...(meta?.preTokenBalances || []).map((item) => ({ ...item, phase: 'pre' })),
    ...(meta?.postTokenBalances || []).map((item) => ({ ...item, phase: 'post' })),
  ].filter(
    (item) =>
      item.owner === owner &&
      item.mint === mint,
  );
  if (!balances.length) {
    return null;
  }
  const pre = balances
    .filter((item) => item.phase === 'pre')
    .reduce(
      (sum, item) => sum + Number(item.uiTokenAmount?.uiAmount || 0),
      0,
    );
  const post = balances
    .filter((item) => item.phase === 'post')
    .reduce(
      (sum, item) => sum + Number(item.uiTokenAmount?.uiAmount || 0),
      0,
    );
  return round6(post - pre);
}

function nativeSolDelta(tx, owner) {
  const accountKeys = tx?.transaction?.message?.accountKeys || [];
  const index = accountKeys.findIndex((_, itemIndex) => keyAtIndex(accountKeys, itemIndex) === owner);
  if (index < 0) {
    return null;
  }
  const pre = Number(tx?.meta?.preBalances?.[index] || 0);
  const post = Number(tx?.meta?.postBalances?.[index] || 0);
  return round6((post - pre) / LAMPORTS_PER_SOL);
}

async function fetchExecutionReceipt({
  signature,
  walletPublicKey,
  inputToken,
  outputToken,
}) {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  if (!tx) {
    return {
      signature,
      status: 'pending-chain',
      success: false,
      failureReason: 'Transaction metadata is not available yet',
      feeLamports: null,
    };
  }

  const inputDelta =
    inputToken.symbol === 'SOL'
      ? nativeSolDelta(tx, walletPublicKey)
      : tokenBalanceDelta(tx.meta, walletPublicKey, inputToken.mint);
  const outputDelta =
    outputToken.symbol === 'SOL'
      ? nativeSolDelta(tx, walletPublicKey)
      : tokenBalanceDelta(tx.meta, walletPublicKey, outputToken.mint);

  return {
    signature,
    slot: tx.slot,
    status: tx.meta?.err ? 'failed' : 'confirmed',
    success: !tx.meta?.err,
    failureReason: tx.meta?.err ? JSON.stringify(tx.meta.err) : null,
    feeLamports: Number(tx.meta?.fee || 0),
    actualInputDelta: inputDelta == null ? null : round6(Math.abs(inputDelta)),
    actualOutputDelta: outputDelta == null ? null : round6(Math.max(0, outputDelta)),
  };
}

function walletExecutionNetUsd({
  inputSymbol,
  outputSymbol,
  amountIn,
  actualOutputDelta,
  feeLamports,
}) {
  if (isStableSymbol(outputSymbol) && isStableSymbol(inputSymbol)) {
    return round2(Number(actualOutputDelta || 0) - Number(amountIn || 0));
  }
  if (isStableSymbol(outputSymbol)) {
    return round2(Number(actualOutputDelta || 0));
  }
  if (isStableSymbol(inputSymbol)) {
    return round2(-Number(amountIn || 0));
  }
  if (feeLamports != null) {
    return null;
  }
  return null;
}

async function registerWalletExecutionReport(body) {
  const inputToken = await resolveToken(body.inputToken || body.inputMint, body.inputDecimals);
  const outputToken = await resolveToken(body.outputToken || body.outputMint, body.outputDecimals);
  if (!inputToken || !outputToken) {
    throw new Error('Input or output token is unsupported for wallet report');
  }
  const walletPublicKey = String(body.walletPublicKey || body.userPublicKey || '').trim();
  const signature = String(body.signature || '').trim();
  if (!walletPublicKey || !signature) {
    throw new Error('walletPublicKey and signature are required');
  }

  const receipt = await fetchExecutionReceipt({
    signature,
    walletPublicKey,
    inputToken,
    outputToken,
  });
  const actualNetUsd = walletExecutionNetUsd({
    inputSymbol: inputToken.symbol,
    outputSymbol: outputToken.symbol,
    amountIn: body.amountIn,
    actualOutputDelta: receipt.actualOutputDelta,
    feeLamports: receipt.feeLamports,
  });
  const entry = appendTradeLedger({
    type: 'wallet-report',
    mode: 'wallet',
    status: receipt.status,
    success: receipt.success,
    signature,
    slot: receipt.slot,
    walletPublicKey,
    opportunityId: body.opportunityId || null,
    assetSymbol: outputToken.symbol,
    inputSymbol: inputToken.symbol,
    outputSymbol: outputToken.symbol,
    inputMint: inputToken.mint,
    outputMint: outputToken.mint,
    amountIn: String(body.amountIn || body.amount || ''),
    quotedOutAmount: body.amountOutQuoted || null,
    actualOutAmount: receipt.actualOutputDelta,
    quotedNotionalUsd: round2(Number(body.swapUsdValue || 0)),
    notionalUsd: round2(Number(body.swapUsdValue || 0)),
    realizedNetUsd: actualNetUsd,
    feeLamports: receipt.feeLamports,
    failureReason: receipt.failureReason,
    routePlan: normalizeRouteLabels(body.routePlan || []),
    priceImpactPct: Number(body.priceImpactPct || 0),
  });
  markExecutionView(entry);
  markTradeTransaction(entry);
  state.lastExecutionAt = entry.createdAt;
  rebuildActivityViews();
  return entry;
}

async function handleExecutionReport(res, body) {
  const entry = await registerWalletExecutionReport(body);
  sendJson(res, 200, {
    ok: true,
    entry,
    risk: computeRiskSummary(),
  });
}

async function handleDemoExecution(res, body) {
  const opportunity = findOpportunityForRequest(body);
  if (!opportunity) {
    sendJson(res, 404, {
      ok: false,
      error: 'Opportunity not found',
    });
    return;
  }

  const validation = await validateOpportunity(opportunity, {
    usd: body.usd,
    slippageBps: body.slippageBps,
  });
  const guardrails = checkRiskGuardrails({
    body,
    opportunity,
    swapUsdValue: validation.amountUsd || opportunity.capital,
    priceImpactPct: validation.maxPriceImpactPct || 0,
    routePlan: [
      ...(validation.routeIn || []).map((label) => ({ label })),
      ...(validation.routeOut || []).map((label) => ({ label })),
    ],
    mode: 'demo',
  });
  if (!guardrails.ok) {
    const rejected = appendTradeLedger({
      type: 'demo-execution',
      mode: 'demo',
      status: 'rejected',
      success: false,
      opportunityId: opportunity.id,
      assetSymbol: opportunity.symbol,
      inputSymbol: 'USDC',
      outputSymbol: opportunity.symbol,
      quotedNotionalUsd: round2(Number(validation.amountUsd || opportunity.capital)),
      notionalUsd: round2(Number(validation.amountUsd || opportunity.capital)),
      quotedNetUsd: round2(Number(opportunity.net || 0)),
      realizedNetUsd: null,
      failureReason: guardrails.error,
      routePlan: [
        ...(validation.routeIn || []).map((label) => ({ label })),
        ...(validation.routeOut || []).map((label) => ({ label })),
      ],
      priceImpactPct: validation.maxPriceImpactPct || 0,
    });
    sendJson(res, guardrails.status, {
      ok: false,
      error: guardrails.error,
      code: guardrails.code,
      risk: guardrails.summary,
      entry: rejected,
    });
    return;
  }

  recordAttemptCooldown(guardrails.cooldownKey);
  state.lastExecutionAt = nowIso();
  const realizedNetUsd = Number(validation.roundTripNetUsd || 0);
  const entry = appendTradeLedger({
    type: 'demo-execution',
    mode: 'demo',
    status: validation.status === 'validated' ? 'confirmed' : 'weak',
    success: validation.status === 'validated',
    opportunityId: opportunity.id,
    assetSymbol: opportunity.symbol,
    inputSymbol: 'USDC',
    outputSymbol: opportunity.symbol,
    quotedNotionalUsd: round2(Number(validation.amountUsd || opportunity.capital)),
    notionalUsd: round2(Number(validation.amountUsd || opportunity.capital)),
    quotedNetUsd: round2(Number(opportunity.net || 0)),
    realizedNetUsd,
    validationStatus: validation.status,
    validationLabel: validation.statusLabel,
    failureReason: validation.warning,
    routePlan: [
      ...(validation.routeIn || []).map((label) => ({ label })),
      ...(validation.routeOut || []).map((label) => ({ label })),
    ],
    priceImpactPct: validation.maxPriceImpactPct || 0,
  });
  markExecutionView(entry);
  rebuildActivityViews();
  sendJson(res, 200, {
    ok: true,
    entry,
    validation,
    risk: computeRiskSummary(),
  });
}

function handleKillSwitchUpdate(res, body) {
  const enabled = Boolean(body.enabled);
  state.risk.killSwitch = enabled;
  state.risk.killSwitchReason = enabled
    ? String(body.reason || 'Enabled from dashboard')
    : null;
  void persistRuntimeState();
  sendJson(res, 200, {
    ok: true,
    risk: computeRiskSummary(),
  });
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

async function handleExecutionBuild(res, body) {
  const walletPublicKey = String(body.userPublicKey || body.walletPublicKey || '').trim();
  if (!walletPublicKey) {
    sendJson(res, 400, {
      ok: false,
      error: 'userPublicKey is required to build a wallet transaction',
    });
    return;
  }

  const context = await buildExecutionContext(body);
  const swapUsdValue = Number(context.quote.swapUsdValue || 0);
  const opportunity = findOpportunityForRequest(body);
  const guardrails = checkRiskGuardrails({
    body,
    opportunity,
    swapUsdValue,
    priceImpactPct: Number(context.quote.priceImpactPct || 0),
    routePlan: context.quote.routePlan || [],
    mode: 'wallet-build',
  });
  if (!guardrails.ok) {
    sendJson(res, guardrails.status, {
      ok: false,
      error: guardrails.error,
      code: guardrails.code,
      risk: guardrails.summary,
      swapUsdValue: round2(swapUsdValue),
    });
    return;
  }

  const swapResponse = await buildSwapTransaction(context.quote, walletPublicKey);
  sendJson(res, 200, {
    ok: true,
    mode: 'wallet',
    walletExecutionSupported: true,
    opportunityId: opportunity?.id || null,
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
    })),
    swapBuild: {
      swapTransaction: swapResponse.swapTransaction,
      lastValidBlockHeight: swapResponse.lastValidBlockHeight,
      prioritizationFeeLamports: swapResponse.prioritizationFeeLamports,
      computeUnitLimit: swapResponse.computeUnitLimit,
    },
    risk: guardrails.summary,
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
  const opportunity = findOpportunityForRequest(body);
  const guardrails = checkRiskGuardrails({
    body,
    opportunity,
    swapUsdValue,
    priceImpactPct: Number(context.quote.priceImpactPct || 0),
    routePlan: context.quote.routePlan || [],
    mode: 'server-live',
  });
  if (!guardrails.ok) {
    sendJson(res, guardrails.status, {
      ok: false,
      error: guardrails.error,
      code: guardrails.code,
      risk: guardrails.summary,
      swapUsdValue: round2(swapUsdValue),
    });
    return;
  }
  recordAttemptCooldown(guardrails.cooldownKey);

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
    opportunity,
  });
  sendJson(res, 200, {
    ok: true,
    execution,
    swapBuild: {
      lastValidBlockHeight: swapResponse.lastValidBlockHeight,
      prioritizationFeeLamports: swapResponse.prioritizationFeeLamports,
      computeUnitLimit: swapResponse.computeUnitLimit,
    },
    risk: computeRiskSummary(),
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
        items: SOLANA_EXECUTION_TOKENS,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/execution/status') {
      sendJson(res, 200, await executionReadiness());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/execution/capabilities') {
      sendJson(res, 200, {
        items: listExecutorCapabilities(executionReadinessSync().canExecuteLive),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/strategies') {
      sendJson(res, 200, {
        items: listStrategyCapabilities(),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/executions') {
      sendJson(res, 200, {
        items: state.executions.slice(0, limitFrom(url, 100)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/trade-ledger') {
      sendJson(res, 200, {
        items: state.tradeLedger.slice(0, limitFrom(url, 150)),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/risk/status') {
      sendJson(res, 200, computeRiskSummary());
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

    if (req.method === 'POST' && url.pathname === '/api/opportunities/validate') {
      const body = await readBody(req);
      await handleOpportunityValidation(res, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/opportunities/demo-execute') {
      const body = await readBody(req);
      await handleDemoExecution(res, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/execution/quote') {
      const body = await readBody(req);
      await handleExecutionQuote(res, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/execution/build') {
      const body = await readBody(req);
      await handleExecutionBuild(res, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/execution/report') {
      const body = await readBody(req);
      await handleExecutionReport(res, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/execution/execute') {
      const body = await readBody(req);
      await handleExecutionExecute(res, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/risk/kill-switch') {
      const body = await readBody(req);
      handleKillSwitchUpdate(res, body);
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
  await loadRuntimeState();
  rebuildActivityViews();
  await scanMarket();
  setInterval(() => {
    void scanMarket();
  }, CONFIG.pollIntervalMs);
});
