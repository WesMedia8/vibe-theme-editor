'use client'

import { useState, useRef, useEffect } from 'react'
import type { ShopifyTheme } from '../types'
import { themeGidToId } from '../types'

interface PreviewPanelProps {
  shopDomain: string | null
  selectedTheme: ShopifyTheme | null
  refreshKey: number
}

export default function PreviewPanel({ shopDomain, selectedTheme, refreshKey }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [iframeKey, setIframeKey] = useState(0)

  // Build preview URL
  function buildPreviewUrl(): string | null {
    if (!shopDomain) return null
    const base = `https://${shopDomain}`
    if (!selectedTheme) return base
    if (selectedTheme.role === 'main') return base
    const numericId = themeGidToId(selectedTheme.id)
    return `${base}?preview_theme_id=${numericId}`
  }

  const previewUrl = buildPreviewUrl()

  // When refreshKey changes (push happened), reload the iframe
  useEffect(() => {
    if (refreshKey > 0) {
      setIframeKey(k => k + 1)
      setIsLoading(true)
    }
  }, [refreshKey])

  function handleManualRefresh() {
    setIframeKey(k => k + 1)
    setIsLoading(true)
  }

  function handleOpenExternal() {
    if (previewUrl) window.open(previewUrl, '_blank')
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)',
      minWidth: 0,
    }}>
      {/* Preview toolbar */}
      <div style={{
        height: 36,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 10,
        flexShrink: 0,
      }}>
        {/* Label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1.5" width="10" height="9" rx="1.5" stroke="var(--cyan)" strokeWidth="1.2"/>
            <path d="M1 4h10" stroke="var(--cyan)" strokeWidth="1.2"/>
            <circle cx="2.8" cy="2.75" r="0.5" fill="var(--cyan)"/>
            <circle cx="4.5" cy="2.75" r="0.5" fill="var(--cyan)"/>
          </svg>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--cyan)',
            letterSpacing: '0.04em',
          }}>
            Preview
          </span>
          {selectedTheme && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
            }}>
              · {selectedTheme.name}
            </span>
          )}
        </div>

        {/* URL display */}
        {previewUrl && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            minWidth: 0,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {previewUrl}
            </span>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            flexShrink: 0,
          }}>
            <LoadingDots />
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={handleManualRefresh}
          style={{
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            transition: 'all 0.12s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
          }}
          title="Refresh preview"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M9.5 5.5A4 4 0 1 1 5.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M9.5 1.5v4H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Refresh
        </button>

        {/* External link button */}
        <button
          onClick={handleOpenExternal}
          style={{
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            transition: 'all 0.12s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
          }}
          title="Open in new tab"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 10L10 1M10 1H6M10 1V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Open
        </button>
      </div>

      {/* iframe area */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#111',
      }}>
        {!previewUrl ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="3" y="5" width="34" height="30" rx="4" stroke="var(--border-default)" strokeWidth="1.5"/>
              <path d="M3 12h34" stroke="var(--border-default)" strokeWidth="1.5"/>
              <circle cx="8" cy="8.5" r="1.5" fill="var(--border-default)"/>
              <circle cx="13" cy="8.5" r="1.5" fill="var(--border-default)"/>
              <path d="M14 24l5-5 3 3 5-6 5 8" stroke="var(--border-default)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            No store connected
          </div>
        ) : (
          <>
            {/* Loading overlay */}
            {isLoading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--bg-base)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                zIndex: 10,
              }}>
                <div style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                }}>
                  <LoadingDots />
                  Loading preview...
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-disabled)',
                }}>
                  {previewUrl}
                </div>
              </div>
            )}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={previewUrl}
              onLoad={() => setIsLoading(false)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
                background: '#fff',
              }}
              title="Shopify Store Preview"
            />
          </>
        )}
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--cyan)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
