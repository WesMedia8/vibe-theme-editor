'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ShopifyTheme } from '../types'
import { themeGidToId } from '../types'

interface PreviewPanelProps {
  shopDomain: string | null
  selectedTheme: ShopifyTheme | null
  refreshKey: number
  editorWindowRef: React.MutableRefObject<Window | null>
}

export default function PreviewPanel({ shopDomain, selectedTheme, refreshKey, editorWindowRef }: PreviewPanelProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [hasLaunched, setHasLaunched] = useState(false)

  function buildEditorUrl(): string | null {
    if (!shopDomain || !selectedTheme) return null
    const numericId = themeGidToId(selectedTheme.id)
    return `https://${shopDomain}/admin/themes/${numericId}/editor`
  }

  const editorUrl = buildEditorUrl()

  const openEditor = useCallback(() => {
    if (!editorUrl) return
    if (editorWindowRef.current && !editorWindowRef.current.closed) {
      editorWindowRef.current.focus()
      setEditorOpen(true)
      return
    }
    const win = window.open(editorUrl, 'shopify-theme-editor')
    if (win) {
      editorWindowRef.current = win
      setEditorOpen(true)
      setHasLaunched(true)
    }
  }, [editorUrl, editorWindowRef])

  useEffect(() => {
    if (editorUrl) {
      const timer = setTimeout(() => { openEditor() }, 300)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (editorWindowRef.current && editorWindowRef.current.closed) {
        setEditorOpen(false)
        editorWindowRef.current = null
      } else if (editorWindowRef.current && !editorWindowRef.current.closed) {
        setEditorOpen(true)
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [editorWindowRef])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-base)', minWidth: 0, padding: 32, position: 'relative' }}>
      <div className="bg-dots" style={{ position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: editorOpen ? 'rgba(76,175,80,0.06)' : 'rgba(0,229,255,0.04)', border: `2px solid ${editorOpen ? 'rgba(76,175,80,0.25)' : 'rgba(0,229,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
          {editorOpen ? (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="3" y="5" width="26" height="18" rx="3" stroke="var(--green)" strokeWidth="1.5"/><path d="M3 10h26" stroke="var(--green)" strokeWidth="1.5"/><circle cx="6" cy="7.5" r="1" fill="var(--green)"/><circle cx="9" cy="7.5" r="1" fill="var(--green)"/><circle cx="12" cy="7.5" r="1" fill="var(--green)"/><path d="M10 17l3 3 6-7" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 27h8" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round"/><path d="M16 23v4" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="3" y="5" width="26" height="18" rx="3" stroke="var(--cyan)" strokeWidth="1.5"/><path d="M3 10h26" stroke="var(--cyan)" strokeWidth="1.5"/><circle cx="6" cy="7.5" r="1" fill="var(--cyan)"/><circle cx="9" cy="7.5" r="1" fill="var(--cyan)"/><circle cx="12" cy="7.5" r="1" fill="var(--cyan)"/><path d="M20 14l-4 4M20 14h-3M20 14v3" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 27h8" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round"/><path d="M16 23v4" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          )}
        </div>
        {editorOpen ? (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px rgba(76,175,80,0.5)', animation: 'pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>Theme Editor is Open</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>The Shopify theme editor is running in another window. Use the chat panel to describe changes — AI will edit the theme code and push updates to your live editor.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openEditor} style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.25)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--green)', padding: '8px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1.5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 4h10" stroke="currentColor" strokeWidth="1.2"/></svg>
                Focus Editor Window
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>{hasLaunched ? 'Theme Editor Closed' : 'Launch Theme Editor'}</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{hasLaunched ? 'The editor window was closed. Click below to reopen the Shopify theme editor alongside this chat panel.' : 'Open the Shopify theme editor in a dedicated window. Use the chat panel on the right to describe changes — AI handles the code.'}</p>
            </div>
            <button onClick={openEditor} style={{ background: 'var(--cyan)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--bg-void)', padding: '10px 24px', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s ease', boxShadow: '0 0 20px rgba(0,229,255,0.15)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 1h4v4M5.5 8.5L13 1M7 1H1.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {hasLaunched ? 'Reopen Theme Editor' : 'Open Theme Editor'}
            </button>
            {selectedTheme && <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>{selectedTheme.name} · {shopDomain}</div>}
          </>
        )}
        <div style={{ marginTop: 8, padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', width: '100%' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>Tip: Side-by-side mode</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Arrange the theme editor and this window side-by-side on your screen. Chat with AI here to make changes, then watch them appear in the editor after pushing.</div>
        </div>
      </div>
    </div>
  )
}
