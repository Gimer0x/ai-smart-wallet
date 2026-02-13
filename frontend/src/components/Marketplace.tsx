import { useState, useEffect } from 'react';
import { marketplaceApi } from '../services/api';
import { getCircleSdk, getStoredCredentials } from '../utils/circleSdk';

const CIRCLE_APP_ID = import.meta.env.VITE_CIRCLE_APP_ID;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface EBook {
  id: string;
  title: string;
  author: string;
  price: number;
  description: string;
  category?: string;
}

interface MarketplaceProps {
  walletId?: string;
}

export function Marketplace({ walletId }: MarketplaceProps) {
  const [ebooks, setEbooks] = useState<EBook[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [purchasePending, setPurchasePending] = useState<{
    ebookId: string;
    ebookTitle: string;
    amount: string;
    challengeId: string;
  } | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const activeWalletId = walletId ?? undefined;

  useEffect(() => {
    loadEbooks();
    if (activeWalletId) {
      loadPurchasedEbooks();
    }
  }, [activeWalletId]);

  const loadEbooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketplaceApi.getAllEbooks();
      setEbooks(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load e-books');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchasedEbooks = async () => {
    if (!activeWalletId) return;
    
    try {
      const purchased = await marketplaceApi.getPurchasedEbooks(activeWalletId);
      setPurchasedIds(new Set(purchased.map((ebook: EBook) => ebook.id)));
    } catch (err: any) {
      console.error('Failed to load purchased e-books:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEbooks();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await marketplaceApi.searchEbooks(searchQuery);
      setEbooks(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to search e-books');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = async (ebook: EBook) => {
    if (!activeWalletId) {
      setError('Select a wallet first.');
      return;
    }
    try {
      setError(null);
      const data = await marketplaceApi.preparePurchase(ebook.id, activeWalletId);
      setPurchasePending({
        ebookId: ebook.id,
        ebookTitle: ebook.title,
        amount: data.amount,
        challengeId: data.challengeId,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to prepare purchase');
    }
  };

  const handleConfirmPurchase = async () => {
    if (!purchasePending || !activeWalletId) return;
    const creds = getStoredCredentials();
    if (!creds?.deviceToken || !creds?.deviceEncryptionKey || !creds?.userToken || !creds?.encryptionKey || !CIRCLE_APP_ID || !GOOGLE_CLIENT_ID) {
      setError('Missing Circle credentials. Please sign in again.');
      setPurchasePending(null);
      return;
    }
    setPurchaseLoading(true);
    setError(null);
    try {
      const sdk = getCircleSdk(CIRCLE_APP_ID, GOOGLE_CLIENT_ID, creds.deviceToken, creds.deviceEncryptionKey);
      sdk.setAuthentication({ userToken: creds.userToken, encryptionKey: creds.encryptionKey });
      await new Promise<void>((resolve, reject) => {
        sdk.execute(purchasePending.challengeId, (err: unknown) => {
          if (err) reject(new Error((err as Error).message || 'Signing failed'));
          else resolve();
        });
      });
      await marketplaceApi.confirmPurchase(activeWalletId, purchasePending.ebookId);
      setPurchasedIds((prev) => new Set(prev).add(purchasePending.ebookId));
      setPurchasePending(null);
      loadPurchasedEbooks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const filteredEbooks = ebooks;

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading e-books...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p style={{ color: 'var(--secondary)', opacity: 0.8 }}>Error: {error}</p>
        <button onClick={loadEbooks} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {!activeWalletId && (
        <div style={{ padding: '1rem', marginBottom: '1rem', background: 'rgba(255,200,0,0.15)', borderRadius: '8px', fontSize: '0.875rem' }}>
          Select a wallet in the sidebar to purchase e-books.
        </div>
      )}
      {purchasePending && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Confirm purchase</h3>
            <p style={{ margin: 0 }}>
              Buy &quot;{purchasePending.ebookTitle}&quot; for {purchasePending.amount} USDC?
            </p>
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>You will be asked to sign in the app.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={purchaseLoading}
                style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {purchaseLoading ? 'Opening...' : 'Sign & pay'}
              </button>
              <button
                type="button"
                onClick={() => setPurchasePending(null)}
                disabled={purchaseLoading}
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #999', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>E-Book Marketplace</h2>
            <p style={{ color: 'var(--secondary)', opacity: 0.7, fontSize: '0.875rem', margin: 0 }}>
              Browse {ebooks.length} available e-books
            </p>
          </div>
          <button 
            onClick={() => {
              loadEbooks();
              if (activeWalletId) {
                loadPurchasedEbooks();
              }
            }} 
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            Refresh
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by title, author, or category..."
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              fontSize: '0.875rem',
              outline: 'none',
              color: 'var(--secondary)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0,0,0,0.1)';
            }}
          />
          <button
            onClick={handleSearch}
            style={{ width: 'auto', padding: '0.75rem 1.5rem', fontSize: '0.875rem' }}
          >
            Search
          </button>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                loadEbooks();
              }}
              style={{
                width: 'auto',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                background: 'transparent',
                color: 'var(--secondary)',
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* E-Books Grid */}
        {filteredEbooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary)', opacity: 0.7 }}>
            <p>No e-books found. Try a different search term.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {filteredEbooks.map((ebook) => (
              <div
                key={ebook.id}
                style={{
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  backgroundColor: 'white',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {purchasedIds.has(ebook.id) && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      ✓ Purchased
                    </span>
                  )}
                  {ebook.category && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--accent)',
                        color: 'var(--secondary)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {ebook.category}
                    </span>
                  )}
                </div>
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--secondary)',
                    marginBottom: '0.5rem',
                    marginTop: 0,
                  }}
                >
                  {ebook.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--secondary)',
                    opacity: 0.7,
                    marginBottom: '0.75rem',
                  }}
                >
                  by {ebook.author}
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--secondary)',
                    opacity: 0.8,
                    marginBottom: '1rem',
                    lineHeight: '1.5',
                  }}
                >
                  {ebook.description}
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
                      {ebook.price} USDC
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', opacity: 0.6 }}>ID: {ebook.id}</div>
                  </div>
                  {!purchasedIds.has(ebook.id) && activeWalletId && (
                    <button
                      type="button"
                      onClick={() => handleBuyClick(ebook)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      Buy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

