import { WalletList } from './WalletList';
import { WalletBalance } from './WalletBalance';
import { TransactionList } from './TransactionList';
import { TransferForm } from './TransferForm';

interface DashboardViewProps {
  view: string;
  selectedWalletId: string | null;
  onSelectWallet: (walletId: string) => void;
  refreshKey: number;
  onTransferComplete: () => void;
}

export function DashboardView({
  view,
  selectedWalletId,
  onSelectWallet,
  refreshKey,
  onTransferComplete,
}: DashboardViewProps) {
  switch (view) {
    case 'wallets':
      return (
        <WalletList
          onSelectWallet={onSelectWallet}
          selectedWalletId={selectedWalletId}
        />
      );

    case 'balance':
      if (!selectedWalletId) {
        return (
          <div className="card">
            <p>Please select a wallet first from the Wallets view.</p>
          </div>
        );
      }
      return <WalletBalance key={`balance-${refreshKey}`} walletId={selectedWalletId} />;

    case 'transactions':
      if (!selectedWalletId) {
        return (
          <div className="card">
            <p>Please select a wallet first from the Wallets view.</p>
          </div>
        );
      }
      return <TransactionList key={`tx-${refreshKey}`} walletId={selectedWalletId} />;

    case 'transfer':
      if (!selectedWalletId) {
        return (
          <div className="card">
            <p>Please select a wallet first from the Wallets view.</p>
          </div>
        );
      }
      return (
        <TransferForm
          key={`transfer-${refreshKey}`}
          walletId={selectedWalletId}
          onTransferComplete={onTransferComplete}
        />
      );

    default:
      return (
        <div className="card">
          <p>Select a view from the sidebar.</p>
        </div>
      );
  }
}