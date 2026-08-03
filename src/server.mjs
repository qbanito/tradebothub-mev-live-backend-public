import http from 'node:http';
import crypto from 'node:crypto';
import fsSync from 'node:fs';
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

const VERSION = '3.5.0';
const SOLANA_BROADCAST_LANES = ['rpc', 'helius-sender', 'jito'];
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
  dexScreenerCacheMs: envNumber('DEXSCREENER_CACHE_MS', 120000),
  dexScreenerCooldownMs: envNumber('DEXSCREENER_COOLDOWN_MS', 45000),
  dexScreenerConcurrency: envNumber('DEXSCREENER_CONCURRENCY', 4),
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
  polygonRpcUrl: process.env.POLYGON_RPC_URL || '',
  polygonChainId: envNumber('POLYGON_CHAIN_ID', 137),
  polygonAavePoolAddressesProvider:
    process.env.POLYGON_AAVE_POOL_ADDRESSES_PROVIDER ||
    '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
  polygonAavePool:
    process.env.POLYGON_AAVE_POOL || '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygonFlashExecutorOwner: process.env.POLYGON_FLASH_EXECUTOR_OWNER || '',
  polygonFlashExecutorAddress: process.env.POLYGON_FLASH_EXECUTOR_ADDRESS || '',
  polygonExecutorApprovedTargets: csv(process.env.POLYGON_EXECUTOR_APPROVED_TARGETS || ''),
  heliusApiKey: process.env.HELIUS_API_KEY || '',
  heliusSenderUrl:
    process.env.HELIUS_SENDER_URL || 'http://ewr-sender.helius-rpc.com/fast',
  dexProgramIds: csv(process.env.DEX_PROGRAM_IDS),
  signerPrivateKeyBase58: process.env.SIGNER_PRIVATE_KEY_BASE58 || '',
  signerPrivateKeyJson: process.env.SIGNER_PRIVATE_KEY_JSON || '',
  jupiterApiKey: process.env.JUPITER_API_KEY || '',
  jupiterSwapBaseUrl: process.env.JUPITER_SWAP_BASE_URL || '',
  txBroadcastMode: (process.env.TX_BROADCAST_MODE || 'rpc').toLowerCase(),
  broadcastLaneOrder: csv(process.env.BROADCAST_LANE_ORDER || ''),
  swapSlippageBps: envNumber('SWAP_SLIPPAGE_BPS', 50),
  maxExecutionUsd: envNumber('MAX_EXECUTION_USD', 500),
  maxPriorityFeeLamports: envNumber('MAX_PRIORITY_FEE_LAMPORTS', 1000000),
  senderTipLamports: envNumber('SENDER_TIP_LAMPORTS', 5000),
  jitoAuthUuid: process.env.JITO_AUTH_UUID || '',
  jitoBlockEngineUrl:
    process.env.JITO_BLOCK_ENGINE_URL || 'https://mainnet.block-engine.jito.wtf',
  jitoBundleOnly: envBool('JITO_BUNDLE_ONLY', true),
  jitoTipLamports: envNumber('JITO_TIP_LAMPORTS', 1000),
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
  advancedPlannerLimit: envNumber('ADVANCED_PLANNER_LIMIT', 12),
  flashLoanMinNetUsd: envNumber('FLASH_LOAN_MIN_NET_USD', 15),
  flashLoanMaxBorrowUsd: envNumber('FLASH_LOAN_MAX_BORROW_USD', 25000),
  evmWalletExecutionEnabled: envBool('EVM_WALLET_EXECUTION_ENABLED', true),
  shadowExecutionEnabled: envBool('SHADOW_EXECUTION_ENABLED', true),
  shadowTrackLimit: envNumber('SHADOW_TRACK_LIMIT', 8),
  shadowHorizonMs: envNumber('SHADOW_HORIZON_MS', 90000),
  shadowHistoryMaxEntries: envNumber('SHADOW_HISTORY_MAX_ENTRIES', 250),
  tradeLedgerMaxEntries: envNumber('TRADE_LEDGER_MAX_ENTRIES', 500),
  tradeLedgerPath:
    process.env.TRADE_LEDGER_PATH || '/tmp/tradebothub-mev-runtime.json',
  executionBlacklistAssets: csv(process.env.EXECUTION_BLACKLIST_ASSETS || ''),
  executionBlacklistDexes: csv(process.env.EXECUTION_BLACKLIST_DEXES || ''),
  indexerLookbackLimit: envNumber('INDEXER_LOOKBACK_LIMIT', 100),
};

function normalizeBroadcastLane(value) {
  const clean = String(value || '').trim().toLowerCase();
  if (!clean) {
    return null;
  }
  if (clean === 'helius' || clean === 'sender') {
    return 'helius-sender';
  }
  if (clean === 'jito-block-engine' || clean === 'block-engine') {
    return 'jito';
  }
  if (clean === 'fallback' || clean === 'multi-path' || clean === 'fastest' || clean === 'auto') {
    return 'auto';
  }
  return clean;
}

function requestedBroadcastLanes() {
  const mode = normalizeBroadcastLane(CONFIG.txBroadcastMode);
  if (mode === 'auto') {
    const configured = (CONFIG.broadcastLaneOrder || [])
      .map((item) => normalizeBroadcastLane(item))
      .filter((item) => item && item !== 'auto');
    return [...new Set(configured.length ? configured : ['helius-sender', 'jito', 'rpc'])];
  }
  return mode ? [mode] : ['rpc'];
}

function broadcastLaneConfig(lane) {
  if (lane === 'rpc') {
    return {
      lane,
      configured: true,
      endpoint: CONFIG.solanaRpcUrl,
      label: 'Solana RPC',
    };
  }
  if (lane === 'helius-sender') {
    return {
      lane,
      configured: Boolean(CONFIG.heliusApiKey && CONFIG.heliusSenderUrl),
      endpoint: CONFIG.heliusSenderUrl,
      label: 'Helius Sender',
      reason: CONFIG.heliusApiKey
        ? null
        : 'HELIUS_API_KEY is required for helius-sender mode',
    };
  }
  if (lane === 'jito') {
    return {
      lane,
      configured: Boolean(CONFIG.jitoBlockEngineUrl),
      endpoint: CONFIG.jitoBlockEngineUrl,
      label: 'Jito Block Engine',
      reason: CONFIG.jitoBlockEngineUrl ? null : 'JITO_BLOCK_ENGINE_URL is required for jito mode',
    };
  }
  return {
    lane,
    configured: false,
    endpoint: null,
    label: lane,
    reason: `Unsupported broadcast lane: ${lane}`,
  };
}

function activeBroadcastLanes() {
  return requestedBroadcastLanes().filter((lane) => broadcastLaneConfig(lane).configured);
}

function broadcastLaneStatus() {
  return requestedBroadcastLanes().map((lane) => {
    const meta = broadcastLaneConfig(lane);
    return {
      lane: meta.lane,
      label: meta.label,
      endpoint: meta.endpoint,
      configured: meta.configured,
      reason: meta.reason || null,
    };
  });
}

const POLYGON_MAINNET_MANIFEST = readJsonSync(
  new URL('../contracts/deployments/polygon-mainnet.json', import.meta.url),
);

const POLYGON_DEPLOYMENT = resolvePolygonDeployment();

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
    status: POLYGON_DEPLOYMENT ? 'prepared' : 'discovery',
    quoteSupport: false,
    buildSupport: false,
    executeSupport: false,
    walletSupport: Boolean(POLYGON_DEPLOYMENT),
    flashLoanStage: POLYGON_DEPLOYMENT ? 'deployed' : 'planned',
    routeProvider: POLYGON_DEPLOYMENT ? 'Aave V3 flash executor' : 'planned',
    notes: POLYGON_DEPLOYMENT
      ? `Polygon mainnet executor is deployed at ${POLYGON_DEPLOYMENT.contractAddress}, but live EVM route build/sign wiring is still being finished.`
      : 'Planner is active and the local Aave V3 contract scaffold is ready, but Polygon deployment and router wiring are still pending.',
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
    chainIds: ['base', 'arbitrum', 'polygon', 'bsc'],
    flashLoan: false,
    atomic: false,
    requiresOwnCapital: true,
    description: 'Prepared execution slots for the next chains after Solana.',
  },
  {
    id: 'atomic-arb-engine',
    name: 'Atomic arbitrage engine',
    stage: 'planned',
    chainIds: ['solana', 'base', 'arbitrum', 'polygon', 'bsc'],
    flashLoan: true,
    atomic: true,
    requiresOwnCapital: false,
    description: 'Future route for contract-based atomic bundles and post-trade settlement.',
  },
  {
    id: 'flash-loan-orchestrator',
    name: 'Flash-loan orchestrator',
    stage: 'research',
    chainIds: ['base', 'arbitrum', 'polygon', 'bsc', 'ethereum'],
    flashLoan: true,
    atomic: true,
    requiresOwnCapital: false,
    description: 'Polygon now has the first deployed executor. The broader multi-chain flash-loan router is still being wired chain by chain.',
  },
];

const CHAIN_PLANNER_META = {
  solana: {
    walletType: 'solana',
    recommendedWallets: ['Phantom', 'Solflare'],
    nativeSymbol: 'SOL',
    chainHex: null,
    routeProviders: ['Jupiter'],
    plannerSupport: true,
    gasUsd: { wallet: 0.45, atomic: 1.4 },
    bufferUsd: 2,
    flashLoanReady: false,
    atomicReady: false,
  },
  base: {
    walletType: 'evm',
    recommendedWallets: ['MetaMask', 'Coinbase Wallet'],
    nativeSymbol: 'ETH',
    chainHex: '0x2105',
    routeProviders: ['Aerodrome', 'Uniswap v3', '0x API'],
    plannerSupport: true,
    gasUsd: { wallet: 1.75, atomic: 6.5 },
    bufferUsd: 4,
    flashLoanReady: true,
    atomicReady: false,
  },
  arbitrum: {
    walletType: 'evm',
    recommendedWallets: ['MetaMask', 'Rabby'],
    nativeSymbol: 'ETH',
    chainHex: '0xa4b1',
    routeProviders: ['Camelot', 'Uniswap v3', '0x API'],
    plannerSupport: true,
    gasUsd: { wallet: 1.9, atomic: 7.5 },
    bufferUsd: 4.5,
    flashLoanReady: true,
    atomicReady: false,
  },
  bsc: {
    walletType: 'evm',
    recommendedWallets: ['MetaMask', 'Trust Wallet'],
    nativeSymbol: 'BNB',
    chainHex: '0x38',
    routeProviders: ['PancakeSwap', 'Uniswap v3'],
    plannerSupport: true,
    gasUsd: { wallet: 0.7, atomic: 3.2 },
    bufferUsd: 2.5,
    flashLoanReady: true,
    atomicReady: false,
  },
  ethereum: {
    walletType: 'evm',
    recommendedWallets: ['MetaMask', 'Rabby'],
    nativeSymbol: 'ETH',
    chainHex: '0x1',
    routeProviders: ['Uniswap v3', 'Curve', '0x API'],
    plannerSupport: true,
    gasUsd: { wallet: 11.5, atomic: 28 },
    bufferUsd: 8,
    flashLoanReady: true,
    atomicReady: false,
  },
  optimism: {
    walletType: 'evm',
    recommendedWallets: ['MetaMask', 'Rabby'],
    nativeSymbol: 'ETH',
    chainHex: '0xa',
    routeProviders: ['Velodrome', 'Uniswap v3'],
    plannerSupport: true,
    gasUsd: { wallet: 0.9, atomic: 3.8 },
    bufferUsd: 3,
    flashLoanReady: false,
    atomicReady: false,
  },
  polygon: {
    walletType: 'evm',
    recommendedWallets: ['MetaMask', 'Rabby'],
    nativeSymbol: 'POL',
    chainHex: '0x89',
    routeProviders: ['QuickSwap', 'Uniswap v3'],
    plannerSupport: true,
    gasUsd: { wallet: 0.55, atomic: 2.9 },
    bufferUsd: 2.5,
    flashLoanReady: Boolean(POLYGON_DEPLOYMENT),
    atomicReady: false,
  },
  avalanche: {
    walletType: 'evm',
    recommendedWallets: ['MetaMask', 'Core'],
    nativeSymbol: 'AVAX',
    chainHex: '0xa86a',
    routeProviders: ['Trader Joe', 'Uniswap v3'],
    plannerSupport: true,
    gasUsd: { wallet: 1.2, atomic: 4.6 },
    bufferUsd: 3.5,
    flashLoanReady: false,
    atomicReady: false,
  },
};

const CHAIN_SIMULATION_META = {
  solana: {
    latencyBps: 4,
    routeDriftBps: 5,
    mevBps: 2,
    gasVarianceUsd: 0.35,
    atomicGasVarianceUsd: 0.9,
    approvalUsd: 0.1,
    quoteExpiryUsd: 0.35,
    revertReserveUsd: 0.45,
    baseFailRiskPct: 10,
  },
  base: {
    latencyBps: 7,
    routeDriftBps: 9,
    mevBps: 9,
    gasVarianceUsd: 1.8,
    atomicGasVarianceUsd: 4.6,
    approvalUsd: 0.85,
    quoteExpiryUsd: 1.1,
    revertReserveUsd: 1.6,
    baseFailRiskPct: 19,
  },
  arbitrum: {
    latencyBps: 7,
    routeDriftBps: 10,
    mevBps: 11,
    gasVarianceUsd: 2.1,
    atomicGasVarianceUsd: 5.1,
    approvalUsd: 0.95,
    quoteExpiryUsd: 1.15,
    revertReserveUsd: 1.8,
    baseFailRiskPct: 21,
  },
  bsc: {
    latencyBps: 6,
    routeDriftBps: 8,
    mevBps: 8,
    gasVarianceUsd: 0.85,
    atomicGasVarianceUsd: 2.7,
    approvalUsd: 0.65,
    quoteExpiryUsd: 0.8,
    revertReserveUsd: 1.2,
    baseFailRiskPct: 17,
  },
  ethereum: {
    latencyBps: 9,
    routeDriftBps: 12,
    mevBps: 14,
    gasVarianceUsd: 6.5,
    atomicGasVarianceUsd: 14,
    approvalUsd: 1.4,
    quoteExpiryUsd: 2.2,
    revertReserveUsd: 3,
    baseFailRiskPct: 26,
  },
  optimism: {
    latencyBps: 6,
    routeDriftBps: 8,
    mevBps: 7,
    gasVarianceUsd: 0.95,
    atomicGasVarianceUsd: 3.1,
    approvalUsd: 0.7,
    quoteExpiryUsd: 0.75,
    revertReserveUsd: 1.15,
    baseFailRiskPct: 18,
  },
  polygon: {
    latencyBps: 6,
    routeDriftBps: 8,
    mevBps: 6,
    gasVarianceUsd: 0.55,
    atomicGasVarianceUsd: 2.1,
    approvalUsd: 0.5,
    quoteExpiryUsd: 0.7,
    revertReserveUsd: 1,
    baseFailRiskPct: 16,
  },
  avalanche: {
    latencyBps: 7,
    routeDriftBps: 9,
    mevBps: 8,
    gasVarianceUsd: 1.1,
    atomicGasVarianceUsd: 3.6,
    approvalUsd: 0.8,
    quoteExpiryUsd: 0.9,
    revertReserveUsd: 1.4,
    baseFailRiskPct: 19,
  },
};

const FLASH_LOAN_PROVIDER_CATALOG = [
  {
    id: 'aave-v3-base',
    provider: 'Aave V3',
    chainId: 'base',
    chainName: 'Base',
    assetSymbols: ['WETH', 'cbBTC', 'AERO'],
    feeBps: 9,
    maxBorrowUsd: 25000,
    status: 'mapped',
    settlement: 'single-chain atomic',
    notes: 'Good fit for Base atomic router when the route stays onchain.',
  },
  {
    id: 'balancer-base',
    provider: 'Balancer',
    chainId: 'base',
    chainName: 'Base',
    assetSymbols: ['WETH', 'cbBTC'],
    feeBps: 0,
    maxBorrowUsd: 18000,
    status: 'research',
    settlement: 'single-tx callback',
    notes: 'Balancer style flash loans can reduce fee drag, but route support is narrower.',
  },
  {
    id: 'aave-v3-arbitrum',
    provider: 'Aave V3',
    chainId: 'arbitrum',
    chainName: 'Arbitrum',
    assetSymbols: ['WETH', 'WBTC', 'ARB', 'GMX'],
    feeBps: 9,
    maxBorrowUsd: 30000,
    status: 'mapped',
    settlement: 'single-chain atomic',
    notes: 'Best default provider for Arbitrum routes we already rank.',
  },
  {
    id: 'uniswap-v3-arbitrum',
    provider: 'Uniswap v3 flash swap',
    chainId: 'arbitrum',
    chainName: 'Arbitrum',
    assetSymbols: ['WETH', 'WBTC'],
    feeBps: 5,
    maxBorrowUsd: 20000,
    status: 'research',
    settlement: 'pool callback',
    notes: 'Useful when the arb is already centered around Uniswap liquidity.',
  },
  {
    id: 'venus-bsc',
    provider: 'Venus',
    chainId: 'bsc',
    chainName: 'BNB Chain',
    assetSymbols: ['WBNB', 'BTCB'],
    feeBps: 8,
    maxBorrowUsd: 22000,
    status: 'mapped',
    settlement: 'single-chain atomic',
    notes: 'Primary flash liquidity lane for BNB Chain.',
  },
  {
    id: 'pancakeswap-bsc',
    provider: 'PancakeSwap flash swap',
    chainId: 'bsc',
    chainName: 'BNB Chain',
    assetSymbols: ['WBNB', 'BTCB'],
    feeBps: 5,
    maxBorrowUsd: 18000,
    status: 'research',
    settlement: 'pool callback',
    notes: 'Lower fee path when the route is centered around Pancake pools.',
  },
  {
    id: 'aave-v3-polygon',
    provider: 'Aave V3',
    chainId: 'polygon',
    chainName: 'Polygon',
    assetSymbols: ['WETH', 'WBTC', 'USDC', 'WMATIC'],
    feeBps: 9,
    maxBorrowUsd: 22000,
    status: 'mapped',
    settlement: 'single-chain atomic',
    notes: 'Primary Polygon flash-liquidity lane for the first deployed executor.',
  },
  {
    id: 'aave-v3-ethereum',
    provider: 'Aave V3',
    chainId: 'ethereum',
    chainName: 'Ethereum',
    assetSymbols: ['WETH', 'WBTC', 'LINK', 'UNI'],
    feeBps: 9,
    maxBorrowUsd: 40000,
    status: 'mapped',
    settlement: 'single-chain atomic',
    notes: 'Powerful but gas heavy. Best for larger spreads only.',
  },
];

const EVM_PRIVATE_LANE_CATALOG = [
  {
    id: 'flashbots-ethereum',
    provider: 'Flashbots relay',
    chainId: 'ethereum',
    chainName: 'Ethereum',
    status: 'mapped',
    submissionMode: 'signed-bundle',
    privacy: 'private bundle',
    simulationSupport: true,
    notes: 'Closest match to the classic searcher flow from the reviewed MEV repo.',
  },
  {
    id: 'private-rpc-base',
    provider: 'Private RPC lane',
    chainId: 'base',
    chainName: 'Base',
    status: 'mapped',
    submissionMode: 'private-rpc',
    privacy: 'private mempool',
    simulationSupport: false,
    notes: 'Use private send plus local route replay while bundle-native flow matures.',
  },
  {
    id: 'private-rpc-arbitrum',
    provider: 'Private RPC lane',
    chainId: 'arbitrum',
    chainName: 'Arbitrum',
    status: 'mapped',
    submissionMode: 'private-rpc',
    privacy: 'private mempool',
    simulationSupport: false,
    notes: 'Best current lane for Arbitrum router intents before a true bundle path is wired.',
  },
  {
    id: 'private-rpc-polygon',
    provider: 'Private RPC lane',
    chainId: 'polygon',
    chainName: 'Polygon',
    status: POLYGON_DEPLOYMENT ? 'mapped' : 'research',
    submissionMode: 'private-rpc',
    privacy: 'private mempool',
    simulationSupport: false,
    notes: 'Pairs naturally with the deployed Polygon executor once router calldata is finalized.',
  },
  {
    id: 'private-rpc-bsc',
    provider: 'Private RPC lane',
    chainId: 'bsc',
    chainName: 'BNB Chain',
    status: 'research',
    submissionMode: 'private-rpc',
    privacy: 'private mempool',
    simulationSupport: false,
    notes: 'Useful after Pancake-style router execution is fully wired.',
  },
];

const EVM_MARKET_ADAPTER_CATALOG = [
  {
    id: 'uniswap-v3-router',
    dex: 'uniswap',
    chainIds: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc'],
    family: 'amm-v3',
    quoteMode: 'quoter+pool-state',
    routerStyle: 'router-exact-input',
    batchReadSupport: true,
    privateRelayPreferred: true,
    status: 'mapped',
    notes: 'Best fit for private execution plus pool snapshotting across the main EVM chains we rank.',
  },
  {
    id: 'sushiswap-v2-router',
    dex: 'sushiswap',
    chainIds: ['ethereum', 'polygon', 'arbitrum'],
    family: 'amm-v2',
    quoteMode: 'reserve-math',
    routerStyle: 'pair-swap',
    batchReadSupport: true,
    privateRelayPreferred: true,
    status: 'mapped',
    notes: 'Directly matches the reusable reserve-based logic pattern from the reviewed Flashbots repo.',
  },
  {
    id: 'pancakeswap-router',
    dex: 'pancakeswap',
    chainIds: ['bsc', 'base', 'arbitrum'],
    family: 'amm-v2',
    quoteMode: 'reserve-math',
    routerStyle: 'pair-swap',
    batchReadSupport: true,
    privateRelayPreferred: true,
    status: 'mapped',
    notes: 'Good candidate for batch reserve reads and simple pair-level route simulation.',
  },
  {
    id: 'quickswap-router',
    dex: 'quickswap',
    chainIds: ['polygon'],
    family: 'amm-mixed',
    quoteMode: 'router-quote',
    routerStyle: 'router-exact-input',
    batchReadSupport: true,
    privateRelayPreferred: true,
    status: 'mapped',
    notes: 'Important Polygon fallback beside Uniswap and a natural fit for the current executor direction.',
  },
  {
    id: 'aerodrome-router',
    dex: 'aerodrome',
    chainIds: ['base'],
    family: 'amm-cl',
    quoteMode: 'router/quoter',
    routerStyle: 'router-exact-input',
    batchReadSupport: false,
    privateRelayPreferred: true,
    status: 'mapped',
    notes: 'Priority adapter for Base routes where concentrated liquidity matters more than pair math.',
  },
  {
    id: 'camelot-router',
    dex: 'camelot',
    chainIds: ['arbitrum'],
    family: 'amm-mixed',
    quoteMode: 'router-quote',
    routerStyle: 'router-exact-input',
    batchReadSupport: false,
    privateRelayPreferred: true,
    status: 'mapped',
    notes: 'Useful for Arbitrum routes that are not well served by Uniswap math alone.',
  },
  {
    id: 'balancer-vault',
    dex: 'balancer',
    chainIds: ['ethereum', 'polygon'],
    family: 'vault',
    quoteMode: 'vault-query',
    routerStyle: 'vault-swap',
    batchReadSupport: false,
    privateRelayPreferred: true,
    status: 'research',
    notes: 'Needs pool specialization handling, but it can materially improve execution quality on certain routes.',
  },
  {
    id: 'curve-stableswap',
    dex: 'curve',
    chainIds: ['ethereum'],
    family: 'stableswap',
    quoteMode: 'pool-get-dy',
    routerStyle: 'pool-exchange',
    batchReadSupport: false,
    privateRelayPreferred: true,
    status: 'research',
    notes: 'High-value for stable routes once the pool adapter is implemented chain by chain.',
  },
  {
    id: 'custom-router',
    dex: 'custom-router',
    chainIds: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc'],
    family: 'aggregator/custom',
    quoteMode: 'custom-calldata',
    routerStyle: 'allowlist-required',
    batchReadSupport: false,
    privateRelayPreferred: false,
    status: 'research',
    notes: 'Address-like route labels or custom routers need calldata templates and allowlist review first.',
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
  shadow: {
    pending: [],
    history: [],
    lastSweepAt: null,
  },
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
const dexScreenerPairCache = new Map();
let signerCache;
let dexScreenerCooldownUntil = 0;
let dexScreenerLastRateLimitLogAt = 0;

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

function cleanAddress(value) {
  return String(value || '').trim();
}

function cleanHash(value) {
  return String(value || '').trim();
}

function readJsonSync(fileUrl) {
  try {
    return JSON.parse(fsSync.readFileSync(fileUrl, 'utf8'));
  } catch {
    return null;
  }
}

function resolvePolygonDeployment() {
  const manifest = POLYGON_MAINNET_MANIFEST || {};
  const executor = manifest.executor || {};
  const contractAddress =
    cleanAddress(CONFIG.polygonFlashExecutorAddress) ||
    cleanAddress(executor.deployedAddress);
  if (!contractAddress) {
    return null;
  }
  const owner =
    cleanAddress(CONFIG.polygonFlashExecutorOwner) ||
    cleanAddress(executor.owner);
  const approvedTargets = (
    CONFIG.polygonExecutorApprovedTargets.length
      ? CONFIG.polygonExecutorApprovedTargets
      : Array.isArray(executor.approvedTargets)
        ? executor.approvedTargets
        : []
  )
    .map((item) => cleanAddress(item))
    .filter(Boolean);
  const deploymentTxHash =
    cleanHash(executor.deploymentTxHash) ||
    cleanHash(manifest.deploymentTxHash);
  const explorerUrl =
    String(executor.explorerUrl || '').trim() ||
    `https://polygon.blockscout.com/address/${contractAddress}?tab=contract`;
  const txUrl =
    String(executor.txUrl || '').trim() ||
    (deploymentTxHash
      ? `https://polygon.blockscout.com/tx/${deploymentTxHash}`
      : '');
  const verifiedUrl = String(executor.verifiedUrl || '').trim() || '';
  return {
    chainId: String(manifest.chainId || CONFIG.polygonChainId || 137),
    chainName: manifest.chainName || 'Polygon',
    contractName: executor.contractName || 'PolygonAaveFlashExecutor',
    contractAddress,
    owner,
    deploymentTxHash,
    approvedTargets,
    explorerUrl,
    txUrl,
    verifiedUrl,
    deployedAt: String(executor.deployedAt || '').trim() || null,
    status: approvedTargets.length ? 'deployed' : 'deployed-needs-allowlist',
    statusLabel: approvedTargets.length ? 'Deployed' : 'Deployed / allowlist pending',
  };
}

function executorDeploymentForChain(chainId) {
  if (chainId === 'polygon') {
    return POLYGON_DEPLOYMENT;
  }
  return null;
}

const EVM_ROUTE_TARGET_REGISTRY = {
  ethereum: {
    uniswap: {
      targetAddress: cleanAddress(process.env.ETHEREUM_UNISWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.ETHEREUM_UNISWAP_ROUTER || ''),
      defaultAddress: '',
      envVar: 'ETHEREUM_UNISWAP_ROUTER',
      label: 'Uniswap router',
    },
    sushiswap: {
      targetAddress: cleanAddress(process.env.ETHEREUM_SUSHISWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.ETHEREUM_SUSHISWAP_ROUTER || ''),
      defaultAddress: '',
      envVar: 'ETHEREUM_SUSHISWAP_ROUTER',
      label: 'SushiSwap router',
    },
    balancer: {
      targetAddress: cleanAddress(process.env.ETHEREUM_BALANCER_VAULT || ''),
      spenderAddress: cleanAddress(process.env.ETHEREUM_BALANCER_VAULT || ''),
      defaultAddress: '',
      envVar: 'ETHEREUM_BALANCER_VAULT',
      label: 'Balancer vault',
    },
    curve: {
      targetAddress: cleanAddress(process.env.ETHEREUM_CURVE_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.ETHEREUM_CURVE_ROUTER || ''),
      defaultAddress: '',
      envVar: 'ETHEREUM_CURVE_ROUTER',
      label: 'Curve router',
    },
  },
  base: {
    uniswap: {
      targetAddress: cleanAddress(process.env.BASE_UNISWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.BASE_UNISWAP_ROUTER || ''),
      defaultAddress: '0x2626664c2603336E57B271c5C0b26F421741e481',
      envVar: 'BASE_UNISWAP_ROUTER',
      label: 'Uniswap router',
    },
    aerodrome: {
      targetAddress: cleanAddress(process.env.BASE_AERODROME_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.BASE_AERODROME_ROUTER || ''),
      defaultAddress: '',
      envVar: 'BASE_AERODROME_ROUTER',
      label: 'Aerodrome router',
    },
    pancakeswap: {
      targetAddress: cleanAddress(process.env.BASE_PANCAKESWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.BASE_PANCAKESWAP_ROUTER || ''),
      defaultAddress: '',
      envVar: 'BASE_PANCAKESWAP_ROUTER',
      label: 'PancakeSwap router',
    },
  },
  arbitrum: {
    uniswap: {
      targetAddress: cleanAddress(process.env.ARBITRUM_UNISWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.ARBITRUM_UNISWAP_ROUTER || ''),
      defaultAddress: '',
      envVar: 'ARBITRUM_UNISWAP_ROUTER',
      label: 'Uniswap router',
    },
    camelot: {
      targetAddress: cleanAddress(process.env.ARBITRUM_CAMELOT_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.ARBITRUM_CAMELOT_ROUTER || ''),
      defaultAddress: '',
      envVar: 'ARBITRUM_CAMELOT_ROUTER',
      label: 'Camelot router',
    },
    sushiswap: {
      targetAddress: cleanAddress(process.env.ARBITRUM_SUSHISWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.ARBITRUM_SUSHISWAP_ROUTER || ''),
      defaultAddress: '',
      envVar: 'ARBITRUM_SUSHISWAP_ROUTER',
      label: 'SushiSwap router',
    },
  },
  polygon: {
    uniswap: {
      targetAddress: cleanAddress(process.env.POLYGON_UNISWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.POLYGON_UNISWAP_ROUTER || ''),
      defaultAddress: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      envVar: 'POLYGON_UNISWAP_ROUTER',
      label: 'Uniswap router',
    },
    quickswap: {
      targetAddress: cleanAddress(process.env.POLYGON_QUICKSWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.POLYGON_QUICKSWAP_ROUTER || ''),
      defaultAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      envVar: 'POLYGON_QUICKSWAP_ROUTER',
      label: 'QuickSwap router',
    },
    sushiswap: {
      targetAddress: cleanAddress(process.env.POLYGON_SUSHISWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.POLYGON_SUSHISWAP_ROUTER || ''),
      defaultAddress: '',
      envVar: 'POLYGON_SUSHISWAP_ROUTER',
      label: 'SushiSwap router',
    },
    balancer: {
      targetAddress: cleanAddress(process.env.POLYGON_BALANCER_VAULT || ''),
      spenderAddress: cleanAddress(process.env.POLYGON_BALANCER_VAULT || ''),
      defaultAddress: '',
      envVar: 'POLYGON_BALANCER_VAULT',
      label: 'Balancer vault',
    },
  },
  bsc: {
    pancakeswap: {
      targetAddress: cleanAddress(process.env.BSC_PANCAKESWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.BSC_PANCAKESWAP_ROUTER || ''),
      defaultAddress: '',
      envVar: 'BSC_PANCAKESWAP_ROUTER',
      label: 'PancakeSwap router',
    },
    uniswap: {
      targetAddress: cleanAddress(process.env.BSC_UNISWAP_ROUTER || ''),
      spenderAddress: cleanAddress(process.env.BSC_UNISWAP_ROUTER || ''),
      defaultAddress: '',
      envVar: 'BSC_UNISWAP_ROUTER',
      label: 'Uniswap router',
    },
  },
};

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
    state.shadow = {
      ...state.shadow,
      ...(parsed.shadow || {}),
      pending: Array.isArray(parsed.shadow?.pending) ? parsed.shadow.pending : [],
      history: Array.isArray(parsed.shadow?.history) ? parsed.shadow.history : [],
    };
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
          shadow: state.shadow,
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

function resetRuntimeState(options = {}) {
  const clearShadow = Boolean(options.clearShadow);
  state.tradeLedger = [];
  state.executions = [];
  state.transactions = [];
  state.arbitrages = [];
  state.risk.killSwitch = CONFIG.guardrailKillSwitch;
  state.risk.killSwitchReason = CONFIG.guardrailKillSwitch
    ? 'Enabled from environment'
    : null;
  state.risk.lastAttemptByKey = {};
  if (clearShadow) {
    state.shadow.pending = [];
    state.shadow.history = [];
    state.shadow.lastSweepAt = null;
  }
  state.lastExecutionAt = null;
  rebuildActivityViews();
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
    if (!item.success) {
      continue;
    }
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

function shadowFingerprint(input) {
  return [
    input.chainId,
    input.symbol,
    input.buyDex,
    input.sellDex,
    round2(Number(input.capital || input.predictedCapitalUsd || 0)),
  ].join(':');
}

function routeSignatureLabel(item) {
  return [item.buyDex, item.sellDex].filter(Boolean).join(' -> ') || 'planned';
}

function recentShadowFingerprints() {
  const threshold = Date.now() - CONFIG.shadowHorizonMs * 2;
  const recentHistory = state.shadow.history.filter(
    (item) => new Date(item.queuedAt || item.createdAt || 0).getTime() >= threshold,
  );
  return new Set([
    ...state.shadow.pending.map((item) => item.fingerprint),
    ...recentHistory.map((item) => item.fingerprint),
  ]);
}

function queueShadowCandidates() {
  if (!CONFIG.shadowExecutionEnabled) {
    return;
  }
  const now = Date.now();
  const recentFingerprints = recentShadowFingerprints();
  let changed = false;
  const candidates = state.opportunities
    .filter((item) => Number(item.net || 0) > 0)
    .sort((a, b) => b.qualityScore - a.qualityScore || Number(b.net || 0) - Number(a.net || 0))
    .slice(0, CONFIG.shadowTrackLimit);

  for (const item of candidates) {
    const fingerprint = shadowFingerprint(item);
    if (recentFingerprints.has(fingerprint)) {
      continue;
    }
    state.shadow.pending.push({
      id: crypto.randomUUID(),
      fingerprint,
      queuedAt: nowIso(),
      evaluateAfter: new Date(now + CONFIG.shadowHorizonMs).toISOString(),
      opportunityId: item.id,
      chainId: item.chainId,
      chainName: item.chainName,
      symbol: item.symbol,
      buyDex: item.buyDex,
      sellDex: item.sellDex,
      routeLabel: routeSignatureLabel(item),
      predictedNetUsd: round2(Number(item.net || 0)),
      predictedSpreadBps: round2(Number(item.spreadBps || 0)),
      predictedCapitalUsd: round2(Number(item.capital || 0)),
      qualityScore: round2(Number(item.qualityScore || 0)),
      qualityTier: item.qualityTier,
    });
    recentFingerprints.add(fingerprint);
    changed = true;
  }

  if (state.shadow.pending.length > CONFIG.shadowTrackLimit * 3) {
    state.shadow.pending = state.shadow.pending.slice(-CONFIG.shadowTrackLimit * 3);
    changed = true;
  }
  if (changed) {
    void persistRuntimeState();
  }
}

function findObservedShadowOpportunity(shadowItem) {
  const exact = state.opportunities.find((item) =>
    item.chainId === shadowItem.chainId &&
    item.symbol === shadowItem.symbol &&
    item.buyDex === shadowItem.buyDex &&
    item.sellDex === shadowItem.sellDex
  );
  if (exact) {
    return exact;
  }
  return state.opportunities
    .filter((item) => item.chainId === shadowItem.chainId && item.symbol === shadowItem.symbol)
    .sort((a, b) => b.qualityScore - a.qualityScore || Number(b.net || 0) - Number(a.net || 0))[0] || null;
}

function evaluatePendingShadowCandidates() {
  if (!CONFIG.shadowExecutionEnabled || !state.shadow.pending.length) {
    return;
  }
  const now = Date.now();
  const remaining = [];
  let changed = false;

  for (const item of state.shadow.pending) {
    const evaluateAt = new Date(item.evaluateAfter || 0).getTime();
    if (!Number.isFinite(evaluateAt) || evaluateAt > now) {
      remaining.push(item);
      continue;
    }

    const observed = findObservedShadowOpportunity(item);
    const predictedNetUsd = round2(Number(item.predictedNetUsd || 0));
    const observedNetUsd = observed ? round2(Number(observed.net || 0)) : 0;
    const observedSpreadBps = observed ? round2(Number(observed.spreadBps || 0)) : 0;
    const survived = observedNetUsd > 0;
    const status = observed
      ? survived
        ? 'survived'
        : 'decayed'
      : 'disappeared';
    const capturePct = predictedNetUsd > 0
      ? round2((observedNetUsd / predictedNetUsd) * 100)
      : 0;
    const absErrorUsd = round2(Math.abs(observedNetUsd - predictedNetUsd));
    const toleranceUsd = Math.max(5, round2(predictedNetUsd * 0.25));
    const calibration = absErrorUsd <= toleranceUsd
      ? 'tight'
      : absErrorUsd <= Math.max(10, round2(predictedNetUsd * 0.6))
        ? 'drifted'
        : 'missed';

    state.shadow.history.unshift({
      id: crypto.randomUUID(),
      fingerprint: item.fingerprint,
      queuedAt: item.queuedAt,
      evaluatedAt: nowIso(),
      evaluateAfter: item.evaluateAfter,
      chainId: item.chainId,
      chainName: item.chainName,
      symbol: item.symbol,
      buyDex: item.buyDex,
      sellDex: item.sellDex,
      routeLabel: item.routeLabel,
      predictedNetUsd,
      predictedSpreadBps: round2(Number(item.predictedSpreadBps || 0)),
      predictedCapitalUsd: round2(Number(item.predictedCapitalUsd || 0)),
      observedNetUsd,
      observedSpreadBps,
      observedQualityScore: observed ? round2(Number(observed.qualityScore || 0)) : null,
      status,
      survived,
      capturePct: round2(capturePct),
      absErrorUsd,
      calibration,
      matchedOpportunityId: observed?.id || null,
      observedRouteLabel: observed ? routeSignatureLabel(observed) : null,
    });
    changed = true;
  }

  state.shadow.pending = remaining;
  state.shadow.history = state.shadow.history.slice(0, CONFIG.shadowHistoryMaxEntries);
  state.shadow.lastSweepAt = nowIso();
  if (changed) {
    void persistRuntimeState();
  }
}

function computeShadowSummary() {
  const items = state.shadow.history || [];
  const evaluated = items.length;
  const survivedCount = items.filter((item) => item.status === 'survived').length;
  const decayedCount = items.filter((item) => item.status === 'decayed').length;
  const disappearedCount = items.filter((item) => item.status === 'disappeared').length;
  const tightCount = items.filter((item) => item.calibration === 'tight').length;
  const avgCapturePct = evaluated
    ? round2(items.reduce((sum, item) => sum + Number(item.capturePct || 0), 0) / evaluated)
    : 0;
  const avgAbsErrorUsd = evaluated
    ? round2(items.reduce((sum, item) => sum + Number(item.absErrorUsd || 0), 0) / evaluated)
    : 0;
  const accuracyPct = evaluated ? round2((tightCount / evaluated) * 100) : 0;

  return {
    enabled: CONFIG.shadowExecutionEnabled,
    pendingCount: state.shadow.pending.length,
    evaluatedCount: evaluated,
    survivedCount,
    decayedCount,
    disappearedCount,
    tightCount,
    avgCapturePct,
    avgAbsErrorUsd,
    accuracyPct,
    horizonMs: CONFIG.shadowHorizonMs,
    trackLimit: CONFIG.shadowTrackLimit,
    lastSweepAt: state.shadow.lastSweepAt,
  };
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

async function readJsonOrText(response) {
  const raw = await response.text();
  const text = raw.trim();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
      raw: text,
    };
  }
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
  const shadow = computeShadowSummary();
  const activeChains = [...new Set(state.market.map((item) => item.chainId).filter(Boolean))];
  const highQualityCount = state.opportunities.filter((item) =>
    ['A', 'B'].includes(item.qualityTier),
  ).length;
  const readyOpportunityCount = state.opportunities.filter(
    (item) => item.executionSupported && item.qualityScore >= 60,
  ).length;
  const flashLoanCandidateCount = state.opportunities.filter(
    (item) => item.flashLoanCandidate,
  ).length;
  const planReadyCount = state.opportunities.filter((item) => {
    const executor = EXECUTOR_REGISTRY[item.chainId];
    return Boolean(executor?.status === 'prepared' && Number(item.net || 0) > 0);
  }).length;
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
    flashLoanCandidateCount,
    planReadyCount,
    shadowPendingCount: shadow.pendingCount,
    shadowEvaluatedCount: shadow.evaluatedCount,
    shadowAccuracyPct: shadow.accuracyPct,
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
  const lanes = broadcastLaneStatus();
  const activeLanes = activeBroadcastLanes();
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
  if (!activeLanes.length) {
    reasons.push('No configured broadcast lanes are available');
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
    broadcastLanes: lanes,
    activeBroadcastLanes: activeLanes,
    simulateOnly: CONFIG.simulateOnly,
    defaults: {
      slippageBps: CONFIG.swapSlippageBps,
      maxExecutionUsd: CONFIG.maxExecutionUsd,
      maxPriorityFeeLamports: CONFIG.maxPriorityFeeLamports,
      senderTipLamports: CONFIG.senderTipLamports,
      jitoTipLamports: CONFIG.jitoTipLamports,
      advancedPlannerLimit: CONFIG.advancedPlannerLimit,
      flashLoanMinNetUsd: CONFIG.flashLoanMinNetUsd,
      flashLoanMaxBorrowUsd: CONFIG.flashLoanMaxBorrowUsd,
    },
    supportedTokens: SOLANA_EXECUTION_TOKENS,
    executionChains: ['solana'],
    evmWalletExecutionSupported: CONFIG.evmWalletExecutionEnabled,
    flashLoanProviderCount: FLASH_LOAN_PROVIDER_CATALOG.length,
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
  const cacheKey = `${asset.chainId}:${asset.address}`;
  const cached = dexScreenerPairCache.get(cacheKey);
  const now = Date.now();
  const cacheIsFresh =
    cached &&
    now - cached.fetchedAt <= Number(CONFIG.dexScreenerCacheMs || 0);

  if (cacheIsFresh) {
    return cached.pairs;
  }

  if (dexScreenerCooldownUntil > now) {
    if (cached?.pairs?.length) {
      return cached.pairs;
    }
    return [];
  }

  const url = `https://api.dexscreener.com/latest/dex/tokens/${asset.address}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    if (response.status === 429) {
      dexScreenerCooldownUntil = Date.now() + Number(CONFIG.dexScreenerCooldownMs || 0);
      state.indexer = {
        status: 'degraded',
        source: 'dexscreener-cache',
      };
      if (Date.now() - dexScreenerLastRateLimitLogAt > 5000) {
        dexScreenerLastRateLimitLogAt = Date.now();
        logError(
          'DexScreener rate limit hit; using cached scanner data where available',
          `cooldown_ms=${CONFIG.dexScreenerCooldownMs}`,
        );
      }
      if (cached?.pairs?.length) {
        return cached.pairs;
      }
      return [];
    }
    throw new Error(`DexScreener ${response.status}`);
  }
  const payload = await response.json();
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  const normalized = pairs
    .filter((pair) => pair.chainId === asset.chainId)
    .filter((pair) => Number(pair.priceUsd) > 0 && Number(pair.liquidity?.usd || 0) > 0)
    .map((pair) => normalizePair(asset, pair))
    .sort((a, b) => b.liquidity - a.liquidity);
  dexScreenerPairCache.set(cacheKey, {
    fetchedAt: now,
    pairs: normalized,
  });
  return normalized;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(Number(limit || 1), items.length || 1));

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
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
  return Object.values(EXECUTOR_REGISTRY).map((executor) => {
    const meta = chainPlannerMeta(executor.chainId);
    const deployment = executorDeploymentForChain(executor.chainId);
    return {
      ...executor,
      liveReady: executor.chainId === 'solana' ? solanaLiveReady : false,
      plannerSupport: meta.plannerSupport,
      walletType: meta.walletType,
      recommendedWallets: meta.recommendedWallets,
      routeProviders: meta.routeProviders,
      chainHex: meta.chainHex,
      flashLoanReady: meta.flashLoanReady,
      atomicReady: meta.atomicReady,
      flashLoanProviders: flashLoanProvidersForChain(executor.chainId).length,
      deployment,
    };
  });
}

function listStrategyCapabilities() {
  return STRATEGY_CATALOG.map((strategy) => ({
    ...strategy,
    chainNames: strategy.chainIds.map(
      (chainId) => EXECUTOR_REGISTRY[chainId]?.chainName || chainId,
    ),
  }));
}

function chainPlannerMeta(chainId) {
  return (
    CHAIN_PLANNER_META[chainId] || {
      walletType: chainId === 'solana' ? 'solana' : 'evm',
      recommendedWallets: chainId === 'solana' ? ['Phantom'] : ['MetaMask'],
      nativeSymbol: chainId === 'solana' ? 'SOL' : 'ETH',
      chainHex: null,
      routeProviders: ['planned'],
      plannerSupport: false,
      gasUsd: { wallet: 2, atomic: 7 },
      bufferUsd: 3,
      flashLoanReady: false,
      atomicReady: false,
    }
  );
}

function flashLoanProvidersForChain(chainId) {
  return FLASH_LOAN_PROVIDER_CATALOG.filter((item) => item.chainId === chainId);
}

function privateExecutionLanesForChain(chainId) {
  return EVM_PRIVATE_LANE_CATALOG.filter((item) => item.chainId === chainId);
}

function normalizeDexKey(label) {
  const value = String(label || '').trim().toLowerCase();
  if (!value) {
    return '';
  }
  if (/^0x[a-f0-9]{40}$/i.test(value)) {
    return 'custom-router';
  }
  return value;
}

function selectMarketAdapter(chainId, dexLabel) {
  const dex = normalizeDexKey(dexLabel);
  if (!dex) {
    return null;
  }
  return (
    EVM_MARKET_ADAPTER_CATALOG.find(
      (item) => item.dex === dex && item.chainIds.includes(chainId),
    ) || null
  );
}

function marketAdaptersForOpportunity(opportunity) {
  if (!opportunity || opportunity.chainId === 'solana') {
    return [];
  }
  return [
    { role: 'buy', adapter: selectMarketAdapter(opportunity.chainId, opportunity.buyDex) },
    { role: 'sell', adapter: selectMarketAdapter(opportunity.chainId, opportunity.sellDex) },
  ]
    .filter((item) => item.adapter)
    .map((item) => ({
      role: item.role,
      id: item.adapter.id,
      dex: item.adapter.dex,
      family: item.adapter.family,
      quoteMode: item.adapter.quoteMode,
      routerStyle: item.adapter.routerStyle,
      batchReadSupport: item.adapter.batchReadSupport,
      privateRelayPreferred: item.adapter.privateRelayPreferred,
      status: item.adapter.status,
      notes: item.adapter.notes,
    }));
}

function resolveRouteTargetDescriptor(chainId, dexLabel, role = 'route') {
  const rawLabel = String(dexLabel || '').trim();
  const normalized = normalizeDexKey(rawLabel);
  if (!normalized) {
    return {
      role,
      dexLabel: rawLabel || 'unknown',
      normalizedDex: normalized,
      targetAddress: '',
      spenderAddress: '',
      configured: false,
      source: 'missing-label',
      envVar: null,
      label: 'Unknown target',
    };
  }

  if (/^0x[a-f0-9]{40}$/i.test(rawLabel)) {
    return {
      role,
      dexLabel: rawLabel,
      normalizedDex: normalized,
      targetAddress: rawLabel,
      spenderAddress: rawLabel,
      configured: true,
      source: 'route-label-address',
      envVar: null,
      label: 'Custom route target',
    };
  }

  const configured = EVM_ROUTE_TARGET_REGISTRY?.[chainId]?.[normalized] || null;
  const envTargetAddress = cleanAddress(configured?.targetAddress || '');
  const envSpenderAddress = cleanAddress(configured?.spenderAddress || '');
  const defaultTargetAddress = cleanAddress(configured?.defaultAddress || '');
  const targetAddress = envTargetAddress || defaultTargetAddress;
  const spenderAddress = envSpenderAddress || targetAddress;
  let source = 'unmapped';
  if (envTargetAddress) {
    source = 'env-config';
  } else if (defaultTargetAddress) {
    source = 'official-default';
  } else if (configured) {
    source = 'mapped-missing-config';
  }

  return {
    role,
    dexLabel: rawLabel,
    normalizedDex: normalized,
    targetAddress,
    spenderAddress,
    configured: Boolean(targetAddress),
    source,
    envVar: configured?.envVar || null,
    label: configured?.label || `${rawLabel} target`,
  };
}

function executionPreflightStatusLabel(value) {
  if (value === 'ready') {
    return 'Executor-ready';
  }
  if (value === 'partial') {
    return 'Partially ready';
  }
  return 'Not ready';
}

function executionPreflightSourceLabel(value) {
  if (value === 'env-config') {
    return 'Env config';
  }
  if (value === 'official-default') {
    return 'Official default';
  }
  if (value === 'route-label-address') {
    return 'Inline route address';
  }
  if (value === 'mapped-missing-config') {
    return 'Mapped, missing target';
  }
  if (value === 'missing-label') {
    return 'Missing route label';
  }
  return 'Unmapped';
}

function buildExecutorPreflight(opportunity, plan) {
  if (!opportunity || plan.walletType === 'solana') {
    return null;
  }

  const deployment = executorDeploymentForChain(opportunity.chainId);
  const targetDescriptors = [
    resolveRouteTargetDescriptor(opportunity.chainId, opportunity.buyDex, 'buy'),
    resolveRouteTargetDescriptor(opportunity.chainId, opportunity.sellDex, 'sell'),
  ];
  const uniqueTargets = [];
  const seenTargetKeys = new Set();
  for (const item of targetDescriptors) {
    const key = item.targetAddress
      ? item.targetAddress.toLowerCase()
      : `${item.role}:${item.normalizedDex}:${item.envVar || item.dexLabel}`;
    if (seenTargetKeys.has(key)) {
      continue;
    }
    seenTargetKeys.add(key);
    uniqueTargets.push(item);
  }

  const approvedTargets = new Set(
    (deployment?.approvedTargets || []).map((item) => String(item).toLowerCase()),
  );
  const missingTargetConfig = uniqueTargets.filter((item) => !item.targetAddress);
  const missingAllowlistTargets = uniqueTargets.filter(
    (item) => item.targetAddress && !approvedTargets.has(item.targetAddress.toLowerCase()),
  );
  const routeTargetsReady = !missingTargetConfig.length;
  const allowlistReady = !missingAllowlistTargets.length;
  const privateReady = Boolean(plan.privateSubmitReady);
  const adapterReady = Boolean(plan.adapterCoverageReady);
  const flashExecutorRelevant = opportunity.chainId === 'polygon' && plan.capitalSource === 'flash-loan';
  const flashExecutorReady = Boolean(
    flashExecutorRelevant &&
      deployment &&
      routeTargetsReady &&
      allowlistReady &&
      adapterReady &&
      privateReady &&
      plan.flashLoanProvider,
  );
  const privateRouteReady = Boolean(
    !flashExecutorRelevant &&
      routeTargetsReady &&
      adapterReady &&
      privateReady,
  );

  let status = 'not-ready';
  if (flashExecutorReady || privateRouteReady) {
    status = 'ready';
  } else if (
    routeTargetsReady ||
    adapterReady ||
    privateReady ||
    Boolean(plan.flashLoanProvider) ||
    Boolean(deployment)
  ) {
    status = 'partial';
  }

  const actionItems = [];
  if (flashExecutorRelevant && !deployment) {
    actionItems.push('Deploy or register the Polygon flash executor before attempting atomic execution.');
  }
  if (missingTargetConfig.length) {
    actionItems.push(
      `Configure route targets for ${missingTargetConfig
        .map((item) => item.envVar || item.dexLabel)
        .join(', ')}.`,
    );
  }
  if (missingAllowlistTargets.length) {
    actionItems.push(
      `Allowlist ${missingAllowlistTargets.map((item) => item.targetAddress).join(', ')} in the executor contract.`,
    );
  }
  if (!adapterReady) {
    actionItems.push('Finish mapping both route legs to production-grade EVM adapters.');
  }
  if (!privateReady) {
    actionItems.push('Map a private submission lane before treating the route as protected from public mempool leakage.');
  }
  if (flashExecutorRelevant && !plan.flashLoanProvider) {
    actionItems.push('Choose a mapped flash-liquidity provider for the atomic callback path.');
  }

  return {
    chainId: opportunity.chainId,
    chainName: opportunity.chainName,
    status,
    statusLabel: executionPreflightStatusLabel(status),
    flashExecutorRelevant,
    deployment: deployment
      ? {
          contractAddress: deployment.contractAddress,
          owner: deployment.owner,
          approvedTargets: deployment.approvedTargets,
          status: deployment.status,
          statusLabel: deployment.statusLabel,
          explorerUrl: deployment.explorerUrl,
        }
      : null,
    routeTargetsReady,
    allowlistReady,
    adapterReady,
    privateReady,
    flashExecutorReady,
    privateRouteReady,
    targetDescriptors: uniqueTargets.map((item) => ({
      role: item.role,
      dexLabel: item.dexLabel,
      normalizedDex: item.normalizedDex,
      label: item.label,
      targetAddress: item.targetAddress || null,
      spenderAddress: item.spenderAddress || null,
      configured: item.configured,
      source: item.source,
      sourceLabel: executionPreflightSourceLabel(item.source),
      envVar: item.envVar,
      allowlisted: item.targetAddress
        ? approvedTargets.has(item.targetAddress.toLowerCase())
        : false,
    })),
    missingTargetConfig: missingTargetConfig.map((item) => ({
      role: item.role,
      dexLabel: item.dexLabel,
      envVar: item.envVar,
    })),
    missingAllowlistTargets: missingAllowlistTargets.map((item) => ({
      role: item.role,
      dexLabel: item.dexLabel,
      targetAddress: item.targetAddress,
      envVar: item.envVar,
    })),
    actionItems,
  };
}

function choosePrivateExecutionLane(opportunity, options = {}) {
  if (!opportunity || opportunity.chainId === 'solana') {
    return null;
  }
  const lanes = privateExecutionLanesForChain(opportunity.chainId);
  if (!lanes.length) {
    return null;
  }
  const preferSimulation = Boolean(options.preferSimulation);
  const preferPrivacy = options.capitalSource === 'flash-loan' || Number(options.projectedNetUsd || 0) >= 15;
  return (
    lanes.find(
      (item) =>
        item.status === 'mapped' &&
        (!preferSimulation || item.simulationSupport) &&
        (!preferPrivacy || item.privacy),
    ) ||
    lanes.find((item) => item.status === 'mapped') ||
    lanes[0]
  );
}

function routePlanFromOpportunity(opportunity) {
  return [opportunity.buyDex, opportunity.sellDex]
    .filter(Boolean)
    .map((label) => ({ label }));
}

function chainSimulationMeta(chainId) {
  return (
    CHAIN_SIMULATION_META[chainId] || {
      latencyBps: 7,
      routeDriftBps: 8,
      mevBps: 8,
      gasVarianceUsd: 1.5,
      atomicGasVarianceUsd: 4,
      approvalUsd: 0.6,
      quoteExpiryUsd: 1,
      revertReserveUsd: 1.5,
      baseFailRiskPct: 20,
    }
  );
}

function simulationStatusLabel(netUsd, minRequiredNetUsd) {
  if (netUsd >= Math.max(0, Number(minRequiredNetUsd || 0))) {
    return 'tradable';
  }
  if (netUsd > 0) {
    return 'thin';
  }
  return 'fail';
}

function simulationConfidenceLabel(score) {
  if (score >= 75) {
    return 'High confidence';
  }
  if (score >= 50) {
    return 'Medium confidence';
  }
  if (score >= 30) {
    return 'Low confidence';
  }
  return 'Very low confidence';
}

async function buildSimulationReference(opportunity, plan, options = {}) {
  if (opportunity.chainId === 'solana' && opportunity.executionSupported) {
    try {
      const validation = await validateSolanaOpportunity(opportunity, {
        usd: options.capitalUsd || options.usd || plan.requiredCapitalUsd,
        slippageBps: options.slippageBps,
      });
      return {
        source: validation.validationMode,
        validation,
        validatedNetUsd: round2(
          Number(validation.roundTripNetUsd || 0) -
            Number(plan.estimatedGasUsd || 0) -
            Number(plan.plannerBufferUsd || 0),
        ),
      };
    } catch (error) {
      return {
        source: 'planner-only',
        validationError: error.message,
        validatedNetUsd: null,
      };
    }
  }

  return {
    source: 'planner-only',
    validation: null,
    validatedNetUsd: null,
  };
}

function buildExecutionRealitySimulation(opportunity, plan, reference, swapUsdValue) {
  const meta = chainSimulationMeta(opportunity.chainId);
  const routePlan = routePlanFromOpportunity(opportunity);
  const routeComplexity = Math.max(1, routePlan.length);
  const capitalUsd = Number(swapUsdValue || 0);
  const baseNetUsd = round2(
    Number.isFinite(Number(reference.validatedNetUsd))
      ? Number(reference.validatedNetUsd)
      : Number(plan.projectedNetUsd || 0),
  );
  const routeDriftBps =
    meta.routeDriftBps +
    routeComplexity * 2 +
    (reference.source === 'planner-only' ? 4 : 0) +
    (plan.capitalSource === 'flash-loan' ? 5 : 0);
  const latencyBps =
    meta.latencyBps +
    (plan.walletType === 'evm' ? 2 : 0) +
    (reference.source === 'planner-only' ? 3 : 0);
  const mevBps =
    meta.mevBps +
    (plan.capitalSource === 'flash-loan' ? 6 : 0) +
    (opportunity.atomicCandidate ? 3 : 0);
  const gasVarianceUsd =
    meta.gasVarianceUsd +
    (plan.capitalSource === 'flash-loan' ? meta.atomicGasVarianceUsd : 0);
  const approvalUsd = plan.walletType === 'evm' ? meta.approvalUsd : 0;
  const quoteExpiryUsd = reference.source === 'planner-only' ? meta.quoteExpiryUsd : 0.2;
  const revertReserveUsd =
    meta.revertReserveUsd +
    (plan.flashLoanProvider ? 1.1 : 0) +
    (plan.warnings?.length ? 0.45 : 0);

  const buildScenario = (id, label, multiplier) => {
    const routeDriftUsd = round2(capitalUsd * ((routeDriftBps * multiplier) / 10000));
    const latencyUsd = round2(capitalUsd * ((latencyBps * multiplier) / 10000));
    const mevUsd = round2(capitalUsd * ((mevBps * multiplier) / 10000));
    const gasUsd = round2(gasVarianceUsd * multiplier);
    const approvalReserve = round2(approvalUsd * multiplier);
    const quoteExpiryReserve = round2(quoteExpiryUsd * multiplier);
    const revertReserve = round2(revertReserveUsd * multiplier);
    const totalPenaltyUsd = round2(
      routeDriftUsd +
        latencyUsd +
        mevUsd +
        gasUsd +
        approvalReserve +
        quoteExpiryReserve +
        revertReserve,
    );
    const netUsd = round2(baseNetUsd - totalPenaltyUsd);
    const priceImpactPct = round6(((routeDriftBps + latencyBps + mevBps) * multiplier) / 100);
    const failRiskPct = clamp(
      round2(
        meta.baseFailRiskPct +
          routeComplexity * 2 +
          (reference.source === 'planner-only' ? 12 : 0) +
          (plan.capitalSource === 'flash-loan' ? 10 : 0) +
          (multiplier - 1) * 18,
      ),
      5,
      98,
    );
    return {
      id,
      label,
      multiplier,
      netUsd,
      totalPenaltyUsd,
      priceImpactPct,
      failRiskPct,
      status: simulationStatusLabel(netUsd, plan.minRequiredNetUsd),
      deductions: {
        routeDriftUsd,
        latencyUsd,
        mevUsd,
        gasUsd,
        approvalUsd: approvalReserve,
        quoteExpiryUsd: quoteExpiryReserve,
        revertReserveUsd: revertReserve,
      },
    };
  };

  const scenarios = [
    {
      id: 'base',
      label: reference.source === 'planner-only' ? 'Planner base' : 'Live quote base',
      multiplier: 0,
      netUsd: baseNetUsd,
      totalPenaltyUsd: 0,
      priceImpactPct: reference.validation?.maxPriceImpactPct || 0,
      failRiskPct: clamp(meta.baseFailRiskPct + (reference.source === 'planner-only' ? 10 : 0), 5, 95),
      status: simulationStatusLabel(baseNetUsd, plan.minRequiredNetUsd),
      deductions: {
        routeDriftUsd: 0,
        latencyUsd: 0,
        mevUsd: 0,
        gasUsd: 0,
        approvalUsd: 0,
        quoteExpiryUsd: 0,
        revertReserveUsd: 0,
      },
    },
    buildScenario('realistic', 'Realistic execution', 1),
    buildScenario('stressed', 'Stressed execution', 1.65),
    buildScenario('worst', 'Worst reasonable case', 2.35),
  ];
  const defaultScenario = scenarios.find((item) => item.id === 'realistic') || scenarios[1];

  let confidencePct = 52;
  if (reference.source !== 'planner-only') {
    confidencePct += 18;
  } else {
    confidencePct -= 10;
  }
  if (plan.status === 'live-ready') {
    confidencePct += 20;
  } else if (plan.status === 'plan-ready') {
    confidencePct += 8;
  } else if (plan.status === 'sim-ready') {
    confidencePct += 4;
  } else if (plan.status === 'atomic-later') {
    confidencePct -= 10;
  } else {
    confidencePct -= 18;
  }
  if (opportunity.executionSupported) {
    confidencePct += 10;
  }
  if (plan.capitalSource === 'flash-loan') {
    confidencePct -= 14;
  }
  if (plan.flashLoanProvider?.status === 'mapped') {
    confidencePct += 5;
  }
  if (plan.privateRelay?.status === 'mapped') {
    confidencePct += 6;
  } else if (plan.walletType === 'evm') {
    confidencePct -= 8;
  }
  if (plan.adapterCoverageReady) {
    confidencePct += 5;
  } else if (plan.walletType === 'evm') {
    confidencePct -= 10;
  }
  if (plan.walletType === 'evm' && EXECUTOR_REGISTRY[opportunity.chainId]?.status !== 'active') {
    confidencePct -= 15;
  }
  if (Number(opportunity.qualityScore || 0) >= 80) {
    confidencePct += 5;
  } else if (Number(opportunity.qualityScore || 0) < 60) {
    confidencePct -= 5;
  }
  confidencePct -= Math.min(12, (plan.warnings?.length || 0) * 4);
  confidencePct = clamp(round2(confidencePct), 5, 95);

  const realismWarnings = [];
  if (reference.source === 'planner-only') {
    realismWarnings.push('This chain is still using planner assumptions instead of a live round-trip quote.');
  }
  if (plan.capitalSource === 'flash-loan') {
    realismWarnings.push('Flash-loan execution is still contract-planned here, so this simulation includes execution drag reserves instead of a deployed atomic callback.');
  }
  if (plan.walletType === 'evm' && !plan.privateRelay) {
    realismWarnings.push('No private submission lane is mapped for this chain yet, so public mempool leakage would still be a real execution risk.');
  }
  if (plan.walletType === 'evm' && !plan.adapterCoverageReady) {
    realismWarnings.push('At least one route leg is still missing a fully mapped EVM adapter, so route assembly is less reliable than the headline spread suggests.');
  }
  if (plan.walletType === 'evm' && EXECUTOR_REGISTRY[opportunity.chainId]?.status !== 'active') {
    realismWarnings.push('EVM routing is not live yet, so MEV and route-expiry penalties are modeled rather than observed.');
  }

  return {
    profile: 'execution-realism-v1',
    referenceSource: reference.source,
    confidencePct,
    confidenceLabel: simulationConfidenceLabel(confidencePct),
    defaultScenarioId: defaultScenario.id,
    defaultScenario,
    routeComplexity,
    baseNetUsd,
    scenarios,
    realismWarnings,
    liveValidation:
      reference.validation
        ? {
            status: reference.validation.status,
            statusLabel: reference.validation.statusLabel,
            amountUsd: reference.validation.amountUsd,
            quotedUsdBack: reference.validation.quotedUsdBack,
            roundTripNetUsd: reference.validation.roundTripNetUsd,
            maxPriceImpactPct: reference.validation.maxPriceImpactPct,
          }
        : null,
  };
}

function plannerGasUsd(chainId, preferFlashLoan = false) {
  const meta = chainPlannerMeta(chainId);
  return round2(preferFlashLoan ? meta.gasUsd.atomic : meta.gasUsd.wallet);
}

function plannerBufferUsd(chainId, preferFlashLoan = false) {
  const meta = chainPlannerMeta(chainId);
  return round2(Number(meta.bufferUsd || 0) + (preferFlashLoan ? 1.5 : 0));
}

function plannerWalletType(chainId) {
  return chainPlannerMeta(chainId).walletType;
}

function plannerRecommendedWallets(chainId) {
  return [...chainPlannerMeta(chainId).recommendedWallets];
}

function chooseFlashLoanProvider(opportunity, capitalUsd) {
  const matches = flashLoanProvidersForChain(opportunity.chainId).filter((provider) => {
    return (
      !provider.assetSymbols?.length ||
      provider.assetSymbols.includes(opportunity.symbol)
    );
  });
  if (!matches.length) {
    return null;
  }
  return (
    matches.find(
      (provider) =>
        Number(capitalUsd || 0) <= Math.min(provider.maxBorrowUsd, CONFIG.flashLoanMaxBorrowUsd),
    ) || matches[0]
  );
}

function plannerStatusLabel(status) {
  if (status === 'live-ready') {
    return 'Live ready now';
  }
  if (status === 'plan-ready') {
    return 'Plan ready';
  }
  if (status === 'sim-ready') {
    return 'Simulation ready';
  }
  if (status === 'atomic-later') {
    return 'Atomic later';
  }
  return 'Research only';
}

function plannerStepsForOpportunity({
  opportunity,
  walletType,
  preferFlashLoan,
  provider,
  privateLane,
  adapters,
  routeProviders,
  requiredCapitalUsd,
}) {
  const steps = [];
  if (walletType === 'solana') {
    steps.push({
      stage: 'wallet',
      title: 'Connect Solana wallet',
      detail: 'Use Phantom or Solflare to sign the route prepared by the backend.',
    });
    steps.push({
      stage: 'quote',
      title: 'Validate route on Jupiter',
      detail: `Confirm ${opportunity.symbol} route feasibility before signing.`,
    });
    steps.push({
      stage: 'execute',
      title: 'Broadcast live swap',
      detail: 'Send the prepared transaction and report the signature back to the ledger.',
    });
    return steps;
  }

  steps.push({
    stage: 'wallet',
    title: 'Connect EVM wallet',
    detail: `Use ${plannerRecommendedWallets(opportunity.chainId).join(' or ')} on ${opportunity.chainName}.`,
  });
  steps.push({
    stage: 'market-data',
    title: 'Snapshot route state',
    detail: adapters.length
      ? `Read ${adapters.map((item) => `${item.role}:${item.dex}`).join(', ')} using ${adapters.some((item) => item.batchReadSupport) ? 'batch reserve or pool snapshots' : 'router-level quote calls'}.`
      : `No EVM adapter is mapped yet for ${opportunity.buyDex} -> ${opportunity.sellDex}.`,
  });
  steps.push({
    stage: 'planner',
    title: 'Assemble route intent',
    detail: `Route through ${routeProviders.join(', ')} without crossing chains.`,
  });
  if (preferFlashLoan) {
    steps.push({
      stage: 'capital',
      title: 'Borrow capital atomically',
      detail: provider
        ? `${provider.provider} is the mapped flash-liquidity source for roughly ${round2(requiredCapitalUsd)} USD.`
        : 'No mapped flash-liquidity source is ready for this asset pair yet.',
    });
    steps.push({
      stage: 'settlement',
      title: 'Repay inside one transaction',
      detail: 'The future router contract must repay principal plus fee before the transaction ends.',
    });
    return steps;
  }

  steps.push({
    stage: 'capital',
    title: 'Fund own-capital route',
    detail: `Planner expects about ${round2(requiredCapitalUsd)} USD of wallet capital on ${opportunity.chainName}.`,
  });
  steps.push({
    stage: 'simulation',
    title: 'Replay before send',
    detail: privateLane?.simulationSupport
      ? `${privateLane.provider} can simulate the transaction shape before private submission.`
      : 'Local route replay is still needed before private submission on this chain.',
  });
  steps.push({
    stage: 'privacy',
    title: 'Submit through private lane',
    detail: privateLane
      ? `${privateLane.provider} (${privateLane.submissionMode}) is the current preferred private lane.`
      : 'No private lane is mapped yet, so public mempool leakage would still be a risk.',
  });
  steps.push({
    stage: 'settlement',
    title: 'Sign router intent',
    detail: 'The wallet path is planned, but an EVM router contract still has to be wired before live send.',
  });
  return steps;
}

function buildOpportunityExecutionPlan(opportunity, options = {}) {
  const executor = EXECUTOR_REGISTRY[opportunity.chainId] || null;
  const meta = chainPlannerMeta(opportunity.chainId);
  const walletType = plannerWalletType(opportunity.chainId);
  const requestedCapitalUsd = clamp(
    Number(options.capitalUsd || options.usd || opportunity.capital || CONFIG.defaultCapitalUsd),
    25,
    CONFIG.flashLoanMaxBorrowUsd,
  );
  const preferFlashLoan =
    options.preferFlashLoan != null
      ? Boolean(options.preferFlashLoan)
      : Boolean(opportunity.flashLoanCandidate);
  const provider = preferFlashLoan ? chooseFlashLoanProvider(opportunity, requestedCapitalUsd) : null;
  const requiredCapitalUsd = preferFlashLoan
    ? round2(
        Math.min(
          requestedCapitalUsd,
          provider?.maxBorrowUsd || requestedCapitalUsd,
          CONFIG.flashLoanMaxBorrowUsd,
        ),
      )
    : round2(requestedCapitalUsd);
  const flashLoanFeeUsd = provider
    ? round2(requiredCapitalUsd * (Number(provider.feeBps || 0) / 10000))
    : 0;
  const estimatedGasUsd = plannerGasUsd(opportunity.chainId, preferFlashLoan);
  const plannerBuffer = plannerBufferUsd(opportunity.chainId, preferFlashLoan);
  const minRequiredNetUsd = round2(
    flashLoanFeeUsd + estimatedGasUsd + plannerBuffer + CONFIG.flashLoanMinNetUsd,
  );
  const projectedNetUsd = round2(
    Number(opportunity.net || 0) - flashLoanFeeUsd - estimatedGasUsd - plannerBuffer,
  );
  const routeProviders = meta.routeProviders || [executor?.routeProvider || 'planned'];
  const adapters = marketAdaptersForOpportunity(opportunity);
  const adapterCoverageReady =
    walletType === 'solana'
      ? true
      : adapters.length >= 2 && adapters.every((item) => item.status === 'mapped');
  const batchReadReady =
    walletType === 'solana'
      ? true
      : adapters.length >= 1 && adapters.every((item) => item.batchReadSupport || item.status === 'mapped');
  const privateLane = choosePrivateExecutionLane(opportunity, {
    capitalSource: preferFlashLoan ? 'flash-loan' : 'own-capital',
    projectedNetUsd,
    preferSimulation: preferFlashLoan,
  });
  const privateSubmitReady =
    walletType === 'solana'
      ? true
      : Boolean(privateLane && privateLane.status === 'mapped');
  const warnings = [];

  if (walletType === 'evm' && !CONFIG.evmWalletExecutionEnabled) {
    warnings.push('EVM wallet execution is disabled by environment.');
  }
  if (walletType === 'evm' && !adapters.length) {
    warnings.push('No mapped EVM market adapters match this route yet.');
  }
  if (walletType === 'evm' && adapters.some((item) => item.status !== 'mapped')) {
    warnings.push('Part of this EVM route still depends on research-stage adapters.');
  }
  if (walletType === 'evm' && !privateLane) {
    warnings.push('No private submission lane is mapped for this chain yet.');
  }
  if (preferFlashLoan && !provider) {
    warnings.push('No mapped flash-loan provider matches this chain and asset mix yet.');
  }
  if (preferFlashLoan && provider && provider.status !== 'mapped') {
    warnings.push(`${provider.provider} is only at ${provider.status} stage for this route.`);
  }
  if (projectedNetUsd <= 0) {
    warnings.push('Planner costs wipe out the current estimated spread.');
  }
  if (executor?.status !== 'active' && walletType === 'evm') {
    warnings.push('EVM execution still needs router wiring before live broadcast.');
  }
  if (!preferFlashLoan && requiredCapitalUsd > CONFIG.maxExecutionUsd && opportunity.chainId === 'solana') {
    warnings.push('Own-capital route exceeds the current live execution cap.');
  }

  let status = 'research';
  if (opportunity.chainId === 'solana' && opportunity.executionSupported) {
    status = preferFlashLoan ? 'atomic-later' : 'live-ready';
  } else if (executor?.status === 'prepared' && projectedNetUsd > 0 && adapterCoverageReady) {
    status = 'plan-ready';
  } else if ((provider || privateLane || adapters.length) && projectedNetUsd > 0) {
    status = 'sim-ready';
  }

  const capitalSource = preferFlashLoan ? 'flash-loan' : 'own-capital';
  const preflight = buildExecutorPreflight(opportunity, {
    walletType,
    capitalSource,
    adapterCoverageReady,
    privateSubmitReady,
    flashLoanProvider: provider
      ? {
          id: provider.id,
          provider: provider.provider,
        }
      : null,
  });
  return {
    id: `${opportunity.id}:${capitalSource}`,
    createdAt: nowIso(),
    opportunityId: opportunity.id,
    symbol: opportunity.symbol,
    chainId: opportunity.chainId,
    chainName: opportunity.chainName,
    buyDex: opportunity.buyDex,
    sellDex: opportunity.sellDex,
    qualityTier: opportunity.qualityTier,
    qualityScore: opportunity.qualityScore,
    quotedOpportunityNetUsd: round2(Number(opportunity.net || 0)),
    requestedCapitalUsd,
    requiredCapitalUsd,
    capitalSource,
    preferFlashLoan,
    walletType,
    chainHex: meta.chainHex,
    nativeSymbol: meta.nativeSymbol,
    recommendedWallets: plannerRecommendedWallets(opportunity.chainId),
    routeProviders,
    marketAdapters: adapters,
    adapterCoverageReady,
    batchReadReady,
    executorStatus: executor?.status || 'unknown',
    plannerSupport: meta.plannerSupport,
    privateRelay: privateLane
      ? {
          id: privateLane.id,
          provider: privateLane.provider,
          status: privateLane.status,
          submissionMode: privateLane.submissionMode,
          privacy: privateLane.privacy,
          simulationSupport: privateLane.simulationSupport,
          notes: privateLane.notes,
        }
      : null,
    privateSubmitReady,
    executionPreflight: preflight,
    flashLoanProvider: provider
      ? {
          id: provider.id,
          provider: provider.provider,
          feeBps: provider.feeBps,
          maxBorrowUsd: provider.maxBorrowUsd,
          status: provider.status,
          settlement: provider.settlement,
          notes: provider.notes,
        }
      : null,
    flashLoanFeeUsd,
    estimatedGasUsd,
    plannerBufferUsd: plannerBuffer,
    minRequiredNetUsd,
    projectedNetUsd,
    executableNow: opportunity.chainId === 'solana' && opportunity.executionSupported,
    simulationReady:
      projectedNetUsd > 0 &&
      (
        opportunity.executionSupported ||
        executor?.status === 'prepared' ||
        Boolean(provider) ||
        adapterCoverageReady ||
        privateSubmitReady
      ),
    status,
    statusLabel: plannerStatusLabel(status),
    recommendedMode:
      status === 'live-ready'
        ? 'wallet-build'
        : status === 'atomic-later'
          ? 'advanced-sim'
          : status === 'plan-ready' || status === 'sim-ready'
            ? 'advanced-sim'
            : 'paper',
    steps: plannerStepsForOpportunity({
      opportunity,
      walletType,
      preferFlashLoan,
      provider,
      privateLane,
      adapters,
      routeProviders,
      requiredCapitalUsd,
    }),
    warnings,
  };
}

function buildAdvancedPlannerBoard(options = {}) {
  const limit = clamp(
    Number(options.limit || CONFIG.advancedPlannerLimit),
    1,
    25,
  );
  const selected = state.opportunities
    .filter((item) => Number(item.net || 0) > 0)
    .sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) {
        return b.qualityScore - a.qualityScore;
      }
      return Number(b.net || 0) - Number(a.net || 0);
    })
    .slice(0, limit);
  const items = selected.map((opportunity) =>
    buildOpportunityExecutionPlan(opportunity, {
      capitalUsd: options.capitalUsd,
      preferFlashLoan:
        options.preferFlashLoan != null ? options.preferFlashLoan : opportunity.flashLoanCandidate,
    }),
  );
  return {
    generatedAt: nowIso(),
    summary: {
      totalCandidates: items.length,
      liveReadyCount: items.filter((item) => item.status === 'live-ready').length,
      planReadyCount: items.filter((item) => item.status === 'plan-ready').length,
      simReadyCount: items.filter((item) => item.status === 'sim-ready').length,
      flashLoanReadyCount: items.filter(
        (item) => item.capitalSource === 'flash-loan' && item.simulationReady,
      ).length,
      evmWalletCount: items.filter((item) => item.walletType === 'evm').length,
      privateLaneReadyCount: items.filter((item) => item.privateSubmitReady).length,
      adapterCoverageReadyCount: items.filter((item) => item.adapterCoverageReady).length,
    },
    items,
  };
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

  const flashLoanCandidate = ['base', 'arbitrum', 'polygon', 'bsc', 'ethereum'].includes(
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
    const results = await mapWithConcurrency(
      SCANNER_ASSETS,
      CONFIG.dexScreenerConcurrency,
      async (asset) => {
        try {
          return await fetchTokenPairs(asset);
        } catch (error) {
          logError(`Pair fetch failed for ${asset.chainId}:${asset.symbol}`, error);
          return [];
        }
      },
    );
    state.market = results
      .flat()
      .sort((a, b) => b.liquidity - a.liquidity)
      .slice(0, CONFIG.maxMarketRows);
    state.opportunities = deriveOpportunities(state.market);
    evaluatePendingShadowCandidates();
    queueShadowCandidates();
    state.lastScanAt = nowIso();
    if (dexScreenerCooldownUntil > Date.now()) {
      state.indexer = {
        status: 'degraded',
        source: 'dexscreener-cache',
      };
    } else {
      state.indexer = {
        status: 'active',
        source: 'dexscreener-live',
      };
    }
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
  const payload = await readJsonOrText(response);
  if (!response.ok) {
    const message = String(payload.error || payload.raw || `Quote failed with ${response.status}`).trim();
    if (response.status === 429 || /rate limit/i.test(message)) {
      throw new Error('Live quote provider rate limited this request. Wait a few seconds and try again.');
    }
    throw new Error(message || `Quote failed with ${response.status}`);
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
  const payload = await readJsonOrText(response);
  if (!response.ok) {
    const message = String(payload.error || payload.raw || `Swap build failed with ${response.status}`).trim();
    if (response.status === 429 || /rate limit/i.test(message)) {
      throw new Error('Swap builder provider rate limited this request. Wait a few seconds and try again.');
    }
    throw new Error(message || `Swap build failed with ${response.status}`);
  }
  return payload;
}

async function attachCompetitiveTip(transaction, signer, lamports) {
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
      lamports,
    }),
  );
  return new VersionedTransaction(decompiled.compileToV0Message(altAccounts));
}

function sharedTipLamportsForLanes(lanes) {
  let lamports = 0;
  if (lanes.includes('helius-sender')) {
    lamports = Math.max(lamports, Number(CONFIG.senderTipLamports || 0));
  }
  if (lanes.includes('jito')) {
    lamports = Math.max(lamports, Number(CONFIG.jitoTipLamports || 0));
  }
  return lamports;
}

async function submitViaHeliusSender(serializedBase64) {
  const response = await fetch(CONFIG.heliusSenderUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'sendTransaction',
      params: [
        serializedBase64,
        {
          encoding: 'base64',
          skipPreflight: true,
          maxRetries: 0,
        },
      ],
    }),
  });
  const payload = await readJsonOrText(response);
  if (!response.ok || payload.error) {
    throw new Error(payload?.error?.message || payload?.error || 'Helius Sender broadcast failed');
  }
  return {
    signature: payload.result,
    lane: 'helius-sender',
  };
}

async function submitViaJito(serializedBase64) {
  const url = new URL('/api/v1/transactions', CONFIG.jitoBlockEngineUrl);
  if (CONFIG.jitoBundleOnly) {
    url.searchParams.set('bundleOnly', 'true');
  }
  const headers = { 'content-type': 'application/json' };
  if (CONFIG.jitoAuthUuid) {
    headers['x-jito-auth'] = CONFIG.jitoAuthUuid;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'sendTransaction',
      params: [
        serializedBase64,
        {
          encoding: 'base64',
        },
      ],
    }),
  });
  const payload = await readJsonOrText(response);
  if (!response.ok || payload.error) {
    throw new Error(payload?.error?.message || payload?.error || 'Jito broadcast failed');
  }
  return {
    signature: payload.result,
    lane: 'jito',
    bundleId: response.headers.get('x-bundle-id') || null,
  };
}

async function submitViaRpc(serializedBytes) {
  const signature = await connection.sendRawTransaction(serializedBytes, {
    skipPreflight: CONFIG.skipPreflight,
    maxRetries: 3,
  });
  return {
    signature,
    lane: 'rpc',
  };
}

async function submitSignedTransaction(lane, serializedBase64, serializedBytes) {
  if (lane === 'helius-sender') {
    return submitViaHeliusSender(serializedBase64);
  }
  if (lane === 'jito') {
    return submitViaJito(serializedBase64);
  }
  if (lane === 'rpc') {
    return submitViaRpc(serializedBytes);
  }
  throw new Error(`Unsupported broadcast lane: ${lane}`);
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

  const lanes = activeBroadcastLanes();
  if (!lanes.length) {
    throw new Error('No configured broadcast lanes are available');
  }

  let transaction = VersionedTransaction.deserialize(
    Buffer.from(swapResponse.swapTransaction, 'base64'),
  );

  const sharedTipLamports = sharedTipLamportsForLanes(lanes);
  if (sharedTipLamports > 0) {
    transaction = await attachCompetitiveTip(transaction, signer.keypair, sharedTipLamports);
  }

  transaction.sign([signer.keypair]);
  const serializedBytes = Buffer.from(transaction.serialize());
  const serializedBase64 = serializedBytes.toString('base64');
  const laneErrors = [];
  let signature = null;
  let landedLane = null;
  let bundleId = null;

  for (const lane of lanes) {
    try {
      const submission = await submitSignedTransaction(lane, serializedBase64, serializedBytes);
      signature = submission.signature;
      bundleId = submission.bundleId || bundleId;

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

      landedLane = lane;
      break;
    } catch (error) {
      laneErrors.push({
        lane,
        message: error.message || String(error),
      });
    }
  }

  if (!signature || !landedLane) {
    const detail = laneErrors.map((item) => `${item.lane}: ${item.message}`).join(' | ');
    throw new Error(detail ? `All broadcast lanes failed. ${detail}` : 'All broadcast lanes failed');
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
      Number(sharedTipLamports || 0),
    success: true,
    broadcastMode: CONFIG.txBroadcastMode,
    broadcastLane: landedLane,
    broadcastAttempts: laneErrors.length + 1,
    broadcastErrors: laneErrors,
    bundleId,
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

  const plan = buildOpportunityExecutionPlan(opportunity, {
    capitalUsd: options.usd,
    preferFlashLoan:
      options.preferFlashLoan != null
        ? options.preferFlashLoan
        : opportunity.flashLoanCandidate,
  });

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
    validationMode: 'advanced-planner',
    status: executor.status === 'prepared' || plan.status === 'sim-ready' ? 'prepared' : 'discovery-only',
    statusLabel:
      executor.status === 'prepared' || plan.status === 'sim-ready'
        ? plan.statusLabel
        : 'Discovery only',
    executable: false,
    profitValidated: plan.projectedNetUsd > 0,
    warning:
      plan.warnings[0] ||
      `${executor.chainName} scanner is live, but execution is not active on this chain yet.`,
    recommendedMode: plan.recommendedMode,
    projectedNetUsd: plan.projectedNetUsd,
    minRequiredNetUsd: plan.minRequiredNetUsd,
    walletType: plan.walletType,
    capitalSource: plan.capitalSource,
    flashLoanProvider: plan.flashLoanProvider?.provider || null,
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
  limitUsd = CONFIG.maxExecutionUsd,
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

  if (Number(swapUsdValue || 0) > Number(limitUsd || CONFIG.maxExecutionUsd)) {
    return {
      ok: false,
      status: 400,
      code: 'max_execution_usd',
      error: `Swap size exceeds allowed limit (${Number(limitUsd || CONFIG.maxExecutionUsd)} USD)`,
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

function handleAdvancedPlan(res, body) {
  const opportunity = findOpportunityForRequest(body);
  if (!opportunity) {
    sendJson(res, 404, {
      ok: false,
      error: 'Opportunity not found',
    });
    return;
  }

  const plan = buildOpportunityExecutionPlan(opportunity, {
    capitalUsd: body.capitalUsd || body.usd,
    preferFlashLoan: body.preferFlashLoan,
  });
  sendJson(res, 200, {
    ok: true,
    plan,
  });
}

async function handleAdvancedSimulation(res, body) {
  const opportunity = findOpportunityForRequest(body);
  if (!opportunity) {
    sendJson(res, 404, {
      ok: false,
      error: 'Opportunity not found',
    });
    return;
  }

  const plan = buildOpportunityExecutionPlan(opportunity, {
    capitalUsd: body.capitalUsd || body.usd,
    preferFlashLoan: body.preferFlashLoan,
  });
  const swapUsdValue = Number(plan.requiredCapitalUsd || opportunity.capital || 0);
  const reference = await buildSimulationReference(opportunity, plan, body);
  const simulation = buildExecutionRealitySimulation(opportunity, plan, reference, swapUsdValue);
  const defaultScenario = simulation.defaultScenario;
  const guardrails = checkRiskGuardrails({
    body,
    opportunity,
    swapUsdValue,
    priceImpactPct: Number(defaultScenario.priceImpactPct || 0),
    routePlan: routePlanFromOpportunity(opportunity),
    mode: 'demo',
    limitUsd:
      plan.capitalSource === 'flash-loan'
        ? CONFIG.flashLoanMaxBorrowUsd
        : CONFIG.maxExecutionUsd,
  });

  if (!guardrails.ok) {
    const rejected = appendTradeLedger({
      type: 'advanced-simulation',
      mode: plan.capitalSource === 'flash-loan' ? 'demo-atomic' : 'demo-evm',
      status: 'rejected',
      success: false,
      opportunityId: opportunity.id,
      assetSymbol: opportunity.symbol,
      inputSymbol: opportunity.symbol,
      outputSymbol: opportunity.symbol,
      quotedNotionalUsd: round2(swapUsdValue),
      notionalUsd: round2(swapUsdValue),
      quotedNetUsd: round2(Number(opportunity.net || 0)),
      realizedNetUsd: null,
      failureReason: guardrails.error,
      routePlan: routePlanFromOpportunity(opportunity),
      priceImpactPct: Number(defaultScenario.priceImpactPct || 0),
    });
    sendJson(res, guardrails.status, {
      ok: false,
      error: guardrails.error,
      code: guardrails.code,
      risk: guardrails.summary,
      plan,
      simulation,
      entry: rejected,
    });
    return;
  }

  recordAttemptCooldown(guardrails.cooldownKey);
  state.lastExecutionAt = nowIso();
  const success = Number(defaultScenario.netUsd || 0) > 0;
  const entry = appendTradeLedger({
    type: 'advanced-simulation',
    mode: plan.capitalSource === 'flash-loan' ? 'demo-atomic' : 'demo-evm',
    status: success ? 'simulated' : 'weak',
    success,
    opportunityId: opportunity.id,
    assetSymbol: opportunity.symbol,
    inputSymbol: opportunity.symbol,
      outputSymbol: opportunity.symbol,
      quotedNotionalUsd: round2(swapUsdValue),
      notionalUsd: round2(swapUsdValue),
      quotedNetUsd: round2(Number(opportunity.net || 0)),
      realizedNetUsd: round2(Number(defaultScenario.netUsd || 0)),
      validationStatus: plan.status,
      validationLabel: plan.statusLabel,
      failureReason: [...(plan.warnings || []), ...(simulation.realismWarnings || [])].join(' | ') || null,
      routePlan: routePlanFromOpportunity(opportunity),
      priceImpactPct: Number(defaultScenario.priceImpactPct || 0),
      flashLoanProvider: plan.flashLoanProvider?.provider || null,
  });
  markExecutionView({
    ...entry,
    inputSymbol: opportunity.symbol,
    outputSymbol: opportunity.symbol,
    broadcastMode: entry.mode,
  });
  rebuildActivityViews();
  sendJson(res, 200, {
    ok: true,
    plan,
    simulation,
    entry,
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

async function handleRuntimeReset(res, body) {
  resetRuntimeState({
    clearShadow: Boolean(body.clearShadow),
  });
  await persistRuntimeState();
  sendJson(res, 200, {
    ok: true,
    resetAt: nowIso(),
    cleared: {
      tradeLedger: true,
      executions: true,
      transactions: true,
      arbitrages: true,
      cooldowns: true,
      shadow: Boolean(body.clearShadow),
    },
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

    if (req.method === 'GET' && url.pathname === '/api/execution/planner') {
      const preferFlashLoanParam = url.searchParams.get('preferFlashLoan');
      sendJson(res, 200, buildAdvancedPlannerBoard({
        limit: url.searchParams.get('limit'),
        capitalUsd: url.searchParams.get('capitalUsd'),
        preferFlashLoan:
          preferFlashLoanParam == null
            ? undefined
            : preferFlashLoanParam === 'true',
      }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/strategies') {
      sendJson(res, 200, {
        items: listStrategyCapabilities(),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/flash-loans/providers') {
      sendJson(res, 200, {
        items: FLASH_LOAN_PROVIDER_CATALOG.map((item) => ({
          ...item,
          walletType: plannerWalletType(item.chainId),
        })),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/evm/private-lanes') {
      sendJson(res, 200, {
        items: EVM_PRIVATE_LANE_CATALOG.map((item) => ({
          ...item,
          walletType: 'evm',
        })),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/evm/market-adapters') {
      sendJson(res, 200, {
        items: EVM_MARKET_ADAPTER_CATALOG.map((item) => ({
          ...item,
          walletType: 'evm',
        })),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/shadow-executions') {
      sendJson(res, 200, {
        summary: computeShadowSummary(),
        items: state.shadow.history.slice(0, limitFrom(url, 50)),
        pending: state.shadow.pending.slice(0, limitFrom(url, 20)),
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

    if (req.method === 'POST' && url.pathname === '/api/admin/runtime-reset') {
      const body = await readBody(req);
      await handleRuntimeReset(res, body);
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

    if (req.method === 'POST' && url.pathname === '/api/opportunities/advanced-plan') {
      const body = await readBody(req);
      handleAdvancedPlan(res, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/opportunities/advanced-simulate') {
      const body = await readBody(req);
      await handleAdvancedSimulation(res, body);
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
