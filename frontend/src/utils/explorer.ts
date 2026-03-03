/**
 * Explorer base URLs per blockchain (transaction path is appended as /tx/{txHash}).
 */
const EXPLORER_BASE: Record<string, string> = {
  'ARC-TESTNET': 'https://testnet.arcscan.app',
  'BASE-SEPOLIA': 'https://sepolia.basescan.org',
  'ETH-SEPOLIA': 'https://sepolia.etherscan.io',
  'MATIC-AMOY': 'https://amoy.polygonscan.com',
};

/**
 * Returns the block explorer transaction URL for the given blockchain and tx hash,
 * or null if the chain is not supported.
 */
export function getExplorerTxUrl(blockchain: string, txHash: string): string | null {
  const base = EXPLORER_BASE[blockchain] ?? (blockchain.includes('BASE') ? EXPLORER_BASE['BASE-SEPOLIA'] : null);
  if (!base || !txHash) return null;
  return `${base}/tx/${txHash}`;
}
