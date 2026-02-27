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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadKey, setLoadKey] = useState(0)
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  // Build the proxy URL
  function buildProxyUrl(): string | null {
    if (!shopDomain) return null
    let url = '/api/preview-proxy'
    if (selectedTheme && selectedTheme.role !== 'main') {
      const numericId = themeGidToId(selectedTheme.id)
      url += `?themeId=${numericId}`
    }
    return url
  }

  // Build the Shopify admin theme editor URL
  function buildEditorUrl(): string | null {
    if (!shopDomain || !selectedTheme) return null
    const numericId = themeGidToId(selectedTheme.id)
    return `https://${shopDomain}/admin/themes/${numericId}/editor`
  }

  // Build the storefront URL for "Open Site" 
  function buildStorefrontUrl(): string | null {
    if (!shopDomain) return null
    const base = `https://${shopDomain}`
    if (!selectedTheme || selectedTheme.role === 'main') return base
    const numericId = themeGidToId(selectedTheme.id)
    return `${base}?preview_theme_id=${numericId}`
  }

  const proxyUrl = buildProxyUrl()
  const editorUrl = buildEditorUrl()
  const storefrontUrl = buildStorefrontUrl()

  // Reload when refreshKey changes (push happened)
  useEffect(() => {
    if (refreshKey > 0) {
      setLoadKey(k => k + 1)
      setIsLoading(true)
      setLoadError(null)
    }
  }, [refreshKey])

  function handleManualRefresh() {
    setLoadKey(k => k + 1)
    setIsLoading(true)
    setLoadError(null)
  }

  function handleOpenEditor() {
    if (editorUrl) window.open(editorUrl, '_blank')
  }

  function handleOpenSite() {
    if (storefrontUrl) window.open(storefrontUrl, '_blank')
  }

  function handleIframeLoad() {
    setIsLoading(false)
    setLoadError(null)
  }

  function handleIframeError() {
    setIsLoading(false)
    setLoadError('Failed to load storefront preview')
  }

  // Device mode widths
  const deviceWidths: Record<string, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
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
        height: 40,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        flexShrink: 0,
      }}>
        {/* Label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
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
            Live Preview
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

        {/* Device mode toggles */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: 2,
          gap: 1,
          flexShrink: 0,
        }}>
          <DeviceButton
            mode="desktop"
            active={deviceMode === 'desktop'}
            onClick={() => setDeviceMode('desktop')}
            icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="2" width="11" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M4.5 11h4M6.5 9.5v1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
            }
          />
          <DeviceButton
            mode="tablet"
            active={deviceMode === 'tablet'}
            onClick={() => setDeviceMode('tablet')}
            icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="2" y="1" width="9" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="6.5" cy="10.5" r="0.6" fill="currentColor"/>
              </svg>
            }
          />
          <DeviceButton
            mode="mobile"
            active={deviceMode === 'mobile'}
            onClick={() => setDeviceMode('mobile')}
            icon={
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="3" y="1" width="7" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.1"/>
                <circle cx="6.5" cy="10.5" r="0.6" fill="currentColor"/>
              </svg>
            }
          />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Refresh button */}
        <ToolbarButton
          onClick={handleManualRefresh}
          icon={
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M9.5 5.5A4 4 0 1 1 5.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M9.5 1.5v4H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          label="Refresh"
        />

        {/* Open site in new tab */}
        <ToolbarButton
          onClick={handleOpenSite}
          icon={
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 10L10 1M10 1H6M10 1V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          label="Open Site"
        />

        {/* Open Theme Editor - prominent button */}
        <button
          onClick={handleOpenEditor}
          disabled={!editorUrl}
          style={{
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: 'var(--radius-sm)',
            cursor: editorUrl ? 'pointer' : 'not-allowed',
            color: 'var(--cyan)',
            padding: '3px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            transition: 'all 0.12s ease',
            flexShrink: 0,
            opacity: editorUrl ? 1 : 0.4,
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => {
            if (editorUrl) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 229, 255, 0.15)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 229, 255, 0.4)'
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0, 229, 255, 0.08)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 229, 255, 0.25)'
          }}
          title="Open the Shopify theme customizer in a new tab"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M8 1.5h1.5V3M5 6L9.5 1.5M6 1.5H2a1 1 0 0 0-1 1v6.5a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1V5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Theme Editor
        </button>
      </div>

      {/* Preview area */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: deviceMode === 'desktop' ? '#111' : 'var(--bg-base)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: deviceMode === 'desktop' ? 'stretch' : 'flex-start',
        padding: deviceMode === 'desktop' ? 0 : '20px 0',
      }}>
        {!proxyUrl ? (
          <NoStoreView />
        ) : loadError ? (
          <ErrorView error={loadError} onRetry={handleManualRefresh} editorUrl={editorUrl} />
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
                  Loading live preview...
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-disabled)',
                }}>
                  Fetching storefront from {shopDomain}
                </div>
              </div>
            )}

            {/* Device frame wrapper */}
            <div style={{
              width: deviceWidths[deviceMode],
              maxWidth: '100%',
              height: deviceMode === 'desktop' ? '100%' : 'calc(100% - 40px)',
              ...(deviceMode !== 'desktop' ? {
                border: '2px solid var(--border-default)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              } : {}),
              transition: 'width 0.3s ease',
              flexShrink: 0,
            }}>
              <iframe
                key={loadKey}
                ref={iframeRef}
                src={`${proxyUrl}${proxyUrl.includes('?') ? '&' : '?'}_t=${loadKey}`}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                  background: '#fff',
                }}
                title="Shopify Store Preview"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// === Sub-components ===

interface DeviceButtonProps {
  mode: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}

function DeviceButton({ mode, active, onClick, icon }: DeviceButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 22,
        background: active ? 'var(--bg-overlay)' : 'transparent',
        border: active ? '1px solid var(--border-default)' : '1px solid transparent',
        borderRadius: 3,
        cursor: 'pointer',
        color: active ? 'var(--cyan)' : 'var(--text-muted)',
        transition: 'all 0.1s ease',
        padding: 0,
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
      }}
      title={mode.charAt(0).toUpperCase() + mode.slice(1)}
    >
      {icon}
    </button>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function ToolbarButton({ onClick, icon, label }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
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
      title={label}
    >
      {icon}
      {label}
    </button>
  )
}

function NoStoreView() {
  return (
    <div style={{
      height: '100%',
      width: '100%',
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
  )
}

function ErrorView({ error, onRetry, editorUrl }: { error: string; onRetry: () => void; editorUrl: string | null }) {
  return (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      padding: 40,
    }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" stroke="var(--amber)" strokeWidth="1.5"/>
        <path d="M16 10v7M16 21v1" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--amber)', marginBottom: 4, fontWeight: 600 }}>{error}</div>
        <div style={{ color: 'var(--text-disabled)', fontSize: 11, maxWidth: 360 }}>
          The storefront preview could not be loaded. You can try refreshing, or open the Shopify theme editor directly.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRetry}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: '6px 14px',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}
        >
          Retry
        </button>
        {editorUrl && (
          <button
            onClick={() => window.open(editorUrl, '_blank')}
            style={{
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--cyan)',
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            Open Theme Editor
          </button>
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
