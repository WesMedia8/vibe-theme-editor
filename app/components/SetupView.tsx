'use client'

import { useState, useRef, useEffect } from 'react'

interface SetupViewProps {
  isShopifyConnected: boolean
  shopDomain: string | null
  anthropicKey: string | null
  onAnthropicKey: (key: string) => void
  onShopifyConnected: () => void
}

export default function SetupView({
  isShopifyConnected,
  shopDomain,
  anthropicKey,
  onAnthropicKey,
  onShopifyConnected,
}: SetupViewProps) {
  const [shopInput, setShopInput] = useState('')
  const [keyInput, setKeyInput] = useState(anthropicKey || '')
  const [keyMasked, setKeyMasked] = useState(true)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyValid, setKeyValid] = useState<boolean | null>(anthropicKey ? true : null)
  const [shopError, setShopError] = useState('')
  const [keyError, setKeyError] = useState('')
  const [titleChars, setTitleChars] = useState('')
  const titleRef = useRef<string>('Vibe Theme Editor')
  const titleIndexRef = useRef(0)
  const animDoneRef = useRef(false)

  // Typewriter effect for title
  useEffect(() => {
    if (animDoneRef.current) return
    const text = titleRef.current
    let i = 0
    const interval = setInterval(() => {
      if (i <= text.length) {
        setTitleChars(text.slice(0, i))
        i++
      } else {
        clearInterval(interval)
        animDoneRef.current = true
      }
    }, 40)
    return () => clearInterval(interval)
  }, [])

  function handleShopConnect() {
    let shop = shopInput.trim()
    if (!shop) {
      setShopError('Enter your store domain')
      return
    }
    // Normalize: remove https://, trailing slashes, etc.
    shop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!shop.includes('.')) {
      shop = `${shop}.myshopify.com`
    }
    setShopError('')
    window.location.href = `/api/auth/shopify?shop=${encodeURIComponent(shop)}`
  }

  async function handleTestKey() {
    const key = keyInput.trim()
    if (!key) {
      setKeyError('Enter your API key')
      return
    }
    setIsTestingKey(true)
    setKeyError('')
    try {
      // Test by making a simple models list request
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      })
      if (res.ok || res.status === 200) {
        setKeyValid(true)
        onAnthropicKey(key)
      } else if (res.status === 401) {
        setKeyValid(false)
        setKeyError('Invalid API key')
      } else {
        // Might be a CORS issue in browser, just save it
        setKeyValid(true)
        onAnthropicKey(key)
      }
    } catch {
      // CORS or network error - save key anyway, we'll validate on use
      setKeyValid(true)
      onAnthropicKey(key)
    } finally {
      setIsTestingKey(false)
    }
  }

  function handleSaveKey() {
    const key = keyInput.trim()
    if (!key) {
      setKeyError('Enter your API key')
      return
    }
    if (!key.startsWith('sk-ant-')) {
      setKeyError('Anthropic API keys start with sk-ant-')
      return
    }
    setKeyError('')
    setKeyValid(true)
    onAnthropicKey(key)
  }

  const canEnterEditor = isShopifyConnected && (anthropicKey || keyValid === true)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div className="bg-grid" style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.6,
        pointerEvents: 'none',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 400,
        background: 'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Corner decorations */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-muted)',
        letterSpacing: '0.15em',
      }}>
        v0.1.0
      </div>
      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-muted)',
        letterSpacing: '0.05em',
      }}>
        shopify × claude
      </div>

      {/* Main content */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        padding: '0 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          {/* Icon */}
          <div style={{
            width: 56,
            height: 56,
            margin: '0 auto 20px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 8h20M4 14h12M4 20h16" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="22" cy="20" r="4" fill="none" stroke="var(--cyan)" strokeWidth="1.5"/>
              <path d="M20.5 20l1 1 2-2" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{
              position: 'absolute',
              inset: -1,
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: 10,
            minHeight: 36,
          }}>
            <span className="text-cyan-glow" style={{ color: 'var(--cyan)' }}>
              {titleChars}
            </span>
            <span className="typing-cursor" style={{
              opacity: animDoneRef.current ? 0 : 1,
            }} />
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            lineHeight: 1.6,
          }}>
            AI-powered Shopify theme editing.{' '}
            <span style={{ color: 'var(--text-muted)' }}>
              Chat with Claude, preview diffs, push live.
            </span>
          </p>
        </div>

        {/* Setup cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Step 1: Shopify */}
          <div style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${isShopifyConnected ? 'rgba(0, 230, 118, 0.3)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            transition: 'border-color 0.2s ease',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: isShopifyConnected ? 0 : 16,
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isShopifyConnected ? 'var(--green-muted)' : 'var(--bg-overlay)',
                border: `1px solid ${isShopifyConnected ? 'rgba(0, 230, 118, 0.3)' : 'var(--border-default)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: isShopifyConnected ? 'var(--green)' : 'var(--text-muted)',
                flexShrink: 0,
              }}>
                {isShopifyConnected ? '\u2713' : '1'}
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: isShopifyConnected ? 'var(--green)' : 'var(--text-primary)',
              }}>
                Connect Shopify Store
              </span>
              {isShopifyConnected && shopDomain && (
                <span style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}>
                  {shopDomain}
                </span>
              )}
            </div>

            {!isShopifyConnected && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <input
                    className="input input-mono"
                    type="text"
                    placeholder="my-store.myshopify.com"
                    value={shopInput}
                    onChange={e => {
                      setShopInput(e.target.value)
                      setShopError('')
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleShopConnect()}
                    style={{ marginBottom: shopError ? 6 : 0 }}
                  />
                  {shopError && (
                    <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>
                      {shopError}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleShopConnect}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.5C4 1.5 1.5 4 1.5 7S4 12.5 7 12.5 12.5 10 12.5 7 10 1.5 7 1.5z" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M4.5 5.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-2.5 3.5-2.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="7" cy="10.5" r="0.5" fill="currentColor"/>
                  </svg>
                  Connect via OAuth
                </button>
                <p style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}>
                  You&apos;ll be redirected to Shopify to authorize access to your theme files.
                  Requires <code style={{ fontFamily: 'var(--font-mono)' }}>read_themes</code> and{' '}
                  <code style={{ fontFamily: 'var(--font-mono)' }}>write_themes</code> scopes.
                </p>
              </>
            )}
          </div>

          {/* Step 2: Anthropic */}
          <div style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${keyValid === true ? 'rgba(0, 229, 255, 0.25)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            transition: 'border-color 0.2s ease',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: keyValid === true ? 'var(--cyan-muted)' : 'var(--bg-overlay)',
                border: `1px solid ${keyValid === true ? 'rgba(0,229,255,0.3)' : 'var(--border-default)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: keyValid === true ? 'var(--cyan)' : 'var(--text-muted)',
                flexShrink: 0,
              }}>
                {keyValid === true ? '\u2713' : '2'}
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: keyValid === true ? 'var(--cyan)' : 'var(--text-primary)',
              }}>
                Anthropic API Key
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  className="input input-mono"
                  type={keyMasked ? 'password' : 'text'}
                  placeholder="sk-ant-api03-..."
                  value={keyInput}
                  onChange={e => {
                    setKeyInput(e.target.value)
                    setKeyError('')
                    setKeyValid(null)
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                  style={{ paddingRight: 36 }}
                />
                <button
                  onClick={() => setKeyMasked(!keyMasked)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={keyMasked ? 'Show key' : 'Hide key'}
                >
                  {keyMasked ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1l12 12M5.5 5.7A1.5 1.5 0 019 7M1.5 5C2.7 3.3 4.7 2.5 7 2.5M12.5 9A9.6 9.6 0 017 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
              <button
                className="btn btn-ghost"
                onClick={handleSaveKey}
                style={{ flexShrink: 0 }}
              >
                Save
              </button>
            </div>

            {keyError && (
              <div style={{ color: 'var(--red)', fontSize: 11, marginBottom: 6 }}>
                {keyError}
              </div>
            )}

            {keyValid === true && (
              <div style={{ color: 'var(--green)', fontSize: 11, marginBottom: 6 }}>
                \u2713 API key saved
              </div>
            )}

            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Your key is stored in browser localStorage and only used to call the Anthropic API.
              Get one at{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--cyan)', textDecoration: 'none' }}
              >
                console.anthropic.com
              </a>
            </p>
          </div>

          {/* Enter editor */}
          {canEnterEditor && (
            <div className="animate-fade-in">
              <a
                href="/"
                onClick={e => { e.preventDefault(); onShopifyConnected() }}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: 13 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open Editor
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 40,
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-disabled)',
          letterSpacing: '0.05em',
        }}>
          requires shopify partner app \u00b7 anthropic account
        </div>
      </div>
    </div>
  )
}
