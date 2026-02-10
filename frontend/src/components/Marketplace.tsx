import { useState, useEffect } from 'react';
import { marketplaceApi } from '../services/api';
// import dotenv from 'dotenv';

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

  // Get wallet ID from env or prop
  const activeWalletId = walletId || import.meta.env.VITE_PRIMARY_WALLET_ID;

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
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                      }}
                    >
                      {ebook.price} USDC
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--secondary)',
                        opacity: 0.6,
                      }}
                    >
                      ID: {ebook.id}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

