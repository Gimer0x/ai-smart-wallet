import { useState, useRef, useEffect } from 'react';
import { chatApi, walletApi, marketplaceApi, type PendingAction } from '../services/api';
import { getCircleSdk, getStoredCredentials } from '../utils/circleSdk';

const CIRCLE_APP_ID = import.meta.env.VITE_CIRCLE_APP_ID;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  pendingAction?: PendingAction;
  pendingCompleted?: boolean;
}

interface ChatInterfaceProps {
  /** Optional: use this wallet for chat; backend uses default if not provided */
  walletId?: string;
  onPendingComplete?: () => void;
  /** When provided, shown when user tries to sign but user credentials are missing (enables "Sign in with Google to enable signing") */
  onRequestSignIn?: () => void;
}

export function ChatInterface({ walletId, onPendingComplete, onRequestSignIn }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: 'Hello! I\'m your smart wallet assistant. I can help you check your balance, transfer tokens, and manage your wallet. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingMessageId, setSigningMessageId] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  /** When set, this message's pending action failed due to missing user creds; show "Sign in with Google to enable signing" if onRequestSignIn provided */
  const [signNeedsCredsMessageId, setSignNeedsCredsMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput('');
    setLoading(true);

    try {
      console.log('Sending message to API:', messageToSend);
      const response = await chatApi.sendMessage(messageToSend, walletId);
      console.log('Received response from API:', response);
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: response.response,
        timestamp: new Date(),
        ...(response.pendingAction && { pendingAction: response.pendingAction }),
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignPendingAction = async (messageId: string, action: PendingAction) => {
    console.log('[Sign & send] Clicked', { messageId, actionType: action.type, action });
    setSignError(null);
    const creds = getStoredCredentials();
    const hasDevice = !!(creds?.deviceToken && creds?.deviceEncryptionKey);
    const hasUser = !!(creds?.userToken && creds?.encryptionKey);
    const hasEnv = !!(CIRCLE_APP_ID && GOOGLE_CLIENT_ID);
    console.log('[Sign & send] Credentials check', {
      hasDeviceToken: !!creds?.deviceToken,
      hasDeviceEncryptionKey: !!creds?.deviceEncryptionKey,
      hasUserToken: !!creds?.userToken,
      hasEncryptionKey: !!creds?.encryptionKey,
      hasCircleAppId: !!CIRCLE_APP_ID,
      hasGoogleClientId: !!GOOGLE_CLIENT_ID,
      credsPresent: hasDevice && hasUser && hasEnv,
    });
    if (!creds?.deviceToken || !creds?.deviceEncryptionKey || !creds?.userToken || !creds?.encryptionKey || !CIRCLE_APP_ID || !GOOGLE_CLIENT_ID) {
      const missing = [
        !creds?.deviceToken && 'deviceToken',
        !creds?.deviceEncryptionKey && 'deviceEncryptionKey',
        !creds?.userToken && 'userToken',
        !creds?.encryptionKey && 'encryptionKey',
        !CIRCLE_APP_ID && 'VITE_CIRCLE_APP_ID',
        !GOOGLE_CLIENT_ID && 'VITE_GOOGLE_CLIENT_ID',
      ].filter(Boolean) as string[];
      console.warn('[Sign & send] Missing credentials or env – aborting', { missing });
      setSignError(
        !creds?.userToken || !creds?.encryptionKey
          ? 'Missing Circle credentials. Click "Sign in with Google to enable signing" below, or log out and sign in again.'
          : 'Missing Circle credentials. Please sign in again.'
      );
      setSignNeedsCredsMessageId(messageId);
      return;
    }
    setSignNeedsCredsMessageId(null);
    setSigningMessageId(messageId);
    setSignNeedsCredsMessageId(null);
    try {
      console.log('[Sign & send] Creating Circle SDK...');
      const sdk = getCircleSdk(CIRCLE_APP_ID, GOOGLE_CLIENT_ID, creds.deviceToken, creds.deviceEncryptionKey);
      sdk.setAuthentication({ userToken: creds.userToken, encryptionKey: creds.encryptionKey });
      console.log('[Sign & send] SDK created and authentication set');
      if (action.type === 'transfer') {
        console.log('[Sign & send] Preparing transfer...', { walletId: action.walletId, amount: action.amount, destination: action.destinationAddress });
        const { challengeId } = await walletApi.prepareTransfer(action.walletId, {
          tokenId: action.tokenId,
          destinationAddress: action.destinationAddress,
          amount: action.amount,
          feeLevel: action.feeLevel,
        });
        console.log('[Sign & send] Got challengeId, executing challenge...', { challengeId });
        await new Promise<void>((resolve, reject) => {
          sdk.execute(challengeId, (err: unknown) => {
            if (err) {
              console.error('[Sign & send] SDK execute error', err);
              reject(new Error((err as Error).message || 'Signing failed'));
            } else {
              console.log('[Sign & send] Challenge completed successfully');
              resolve();
            }
          });
        });
      } else {
        console.log('[Sign & send] Preparing purchase...', { ebookId: action.ebookId, walletId: action.walletId });
        const data = await marketplaceApi.preparePurchase(action.ebookId, action.walletId);
        console.log('[Sign & send] Got purchase challengeId, executing...', { challengeId: data.challengeId });
        await new Promise<void>((resolve, reject) => {
          sdk.execute(data.challengeId, (err: unknown) => {
            if (err) {
              console.error('[Sign & send] SDK execute error', err);
              reject(new Error((err as Error).message || 'Signing failed'));
            } else {
              console.log('[Sign & send] Purchase challenge completed');
              resolve();
            }
          });
        });
        await marketplaceApi.confirmPurchase(action.walletId, action.ebookId);
        console.log('[Sign & send] Purchase confirmed');
      }
      console.log('[Sign & send] Success – updating UI and calling onPendingComplete');
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, pendingAction: undefined, pendingCompleted: true } : m))
      );
      onPendingComplete?.();
    } catch (e) {
      console.error('[Sign & send] Error', e);
      setSignError(e instanceof Error ? e.message : 'Signing failed');
    } finally {
      setSigningMessageId(null);
      console.log('[Sign & send] Flow finished');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0, background: '#ffffff' }}>
      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          padding: '2rem 0',
        }}
      >
        <div
          style={{
            maxWidth: '768px',
            width: '100%',
            margin: '0 auto',
            padding: '0 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {messages.length === 1 && messages[0].role === 'agent' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1rem',
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: 'var(--secondary)',
                  marginBottom: '0.5rem',
                  margin: 0,
                }}
              >
                Wallet Integrated AI
              </h1>
              <p
                style={{
                  fontSize: '1rem',
                  color: 'var(--secondary)',
                  opacity: 0.7,
                  marginTop: '0.5rem',
                }}
              >
                Chat with your smart wallet
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              {message.role === 'agent' && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  AI
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '85%' }}>
                <div
                  style={{
                    padding: message.role === 'user' ? '0.75rem 1rem' : '1rem 1.25rem',
                    borderRadius: message.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: message.role === 'user' ? 'var(--primary)' : '#f8f9fa',
                    color: message.role === 'user' ? 'white' : 'var(--secondary)',
                    wordWrap: 'break-word',
                    fontSize: '0.9375rem',
                    lineHeight: '1.5',
                    boxShadow: message.role === 'user' ? '0 1px 2px rgba(99, 102, 241, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                </div>
                {message.role === 'agent' && message.pendingAction && !message.pendingCompleted && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--primary)',
                      background: 'rgba(99, 102, 241, 0.06)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {message.pendingAction.type === 'transfer' ? (
                      <span>
                        Send {message.pendingAction.amount} USDC to {message.pendingAction.destinationAddress.slice(0, 10)}…
                      </span>
                    ) : (
                      <span>Purchase e-book {message.pendingAction.ebookId}</span>
                    )}
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        disabled={signingMessageId === message.id}
                        onClick={() => handleSignPendingAction(message.id, message.pendingAction!)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          cursor: signingMessageId === message.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {signingMessageId === message.id ? 'Opening…' : message.pendingAction!.type === 'transfer' ? 'Sign & send' : 'Sign & pay'}
                      </button>
                      {signError && (signingMessageId === message.id || signNeedsCredsMessageId === message.id) && (
                        <span style={{ color: '#c33', fontSize: '0.75rem' }}>{signError}</span>
                      )}
                      {signNeedsCredsMessageId === message.id && onRequestSignIn && (
                        <button
                          type="button"
                          onClick={onRequestSignIn}
                          style={{
                            padding: '0.4rem 0.75rem',
                            background: 'transparent',
                            color: 'var(--primary)',
                            border: '1px solid var(--primary)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Sign in with Google to enable signing
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {message.role === 'agent' && message.pendingCompleted && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 500 }}>✓ Completed</div>
                )}
              </div>
              {message.role === 'user' && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  U
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                AI
              </div>
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '18px 18px 18px 4px',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)', opacity: 0.4, animation: 'typing 1.4s infinite' }}></span>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)', opacity: 0.4, animation: 'typing 1.4s infinite 0.2s' }}></span>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)', opacity: 0.4, animation: 'typing 1.4s infinite 0.4s' }}></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: '1px solid rgba(0,0,0,0.08)',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
        }}
      >
        <div
          style={{
            maxWidth: '768px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: '#f8f9fa',
                borderRadius: '24px',
                border: '1px solid rgba(0,0,0,0.08)',
                padding: '0.75rem 1.25rem',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Wallet Integrated AI..."
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  color: 'var(--secondary)',
                  padding: 0,
                }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                style={{
                  padding: '0.5rem',
                  background: loading || !input.trim() ? 'transparent' : 'var(--primary)',
                  color: loading || !input.trim() ? 'var(--secondary)' : 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  opacity: loading || !input.trim() ? 0.5 : 1,
                }}
                title="Send message"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1.5 1.5L14.5 8L1.5 14.5L4 8L1.5 1.5Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--secondary)',
              opacity: 0.6,
              textAlign: 'center',
              marginTop: '0.75rem',
              marginBottom: 0,
            }}
          >
            Wallet Integrated AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}