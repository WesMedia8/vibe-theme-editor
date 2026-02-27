'use client'
import { useState } from 'react'
import type { ShopifyTheme, AIProvider, ViewMode } from '../types'
interface TopBarProps {
  shopDomain: string | null
  selectedTheme: ShopifyTheme | null
  pendingCount: number
  approvedCount: number
  isPushing: boolean
  onPushChanges: () => void
  onDisconnect: () => void
  onSettingsUpdate: (provider: AIProvider, key: string) => void
  aiProvider: AIProvider
  aiApiKey: string | null
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}
const PROVIDER_OPTIONS: { value: AIProvider; label: string; prefix: string; placeholder: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)', prefix: 'sk-ant-', placeholder: 'sk-ant-...' },
  { value: 'openai', label: 'OpenAI (GPT-4o)', prefix: 'sk-', placeholder: 'sk-proj-...' },
  { value: 'minimax', label: 'MiniMax (M2.5)', prefix: 'eyJ', placeholder: 'eyJ...' },
]
function providerDotColor(p: AIProvider) {
  if (p === 'openai') return '#10a37f'
  if (p === 'minimax') return '#FF6B35'
  return 'var(--cyan)'
}
function providerDisplayName(p: AIProvider) {
  if (p === 'openai') return 'OpenAI'
  if (p === 'minimax') return 'MiniMax'
  return 'Anthropic'
}
export default function TopBar({ shopDomain, selectedTheme, pendingCount, approvedCount, isPushing, onPushChanges, onDisconnect, onSettingsUpdate, aiProvider, aiApiKey, viewMode, onViewModeChange }: TopBarProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [settingsProvider, setSettingsProvider] = useState<AIProvider>(aiProvider)
  const [newKey, setNewKey] = useState(aiApiKey || '')
  const [keySaved, setKeySaved] = useState(false)
  function handleOpenSettings() { setSettingsProvider(aiProvider); setNewKey(aiApiKey || ''); setKeySaved(false); setShowSettings(true) }
  function handleSaveKey() { if (newKey.trim()) { onSettingsUpdate(settingsProvider, newKey.trim()); setKeySaved(true); setTimeout(() => setKeySaved(false), 2000) } }
  return (<>
    <header style={{ height: 'var(--topbar-height)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, flexShrink: 0, position: 'relative', zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4.5h11M2 7.5h7M2 10.5h9" stroke="var(--cyan)" strokeWidth="1.3" strokeLinecap="round"/><circle cx="12" cy="10.5" r="2.5" fill="none" stroke="var(--cyan)" strokeWidth="1.3"/><path d="M11.2 10.5l.6.6 1.2-1.2" stroke="var(--cyan)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>vibe<span style={{ color: 'var(--cyan)' }}>.</span>editor</span>
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        {shopDomain && (<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="status-dot connected" /><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shopDomain}</span></div>)}
        {selectedTheme && (<><span style={{ color: 'var(--border-strong)', fontSize: 12 }}>/</span><div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{selectedTheme.role === 'main' && (<span style={{ background: 'rgba(0, 229, 255, 0.08)', color: 'var(--cyan)', border: '1px solid rgba(0,229,255,0.2)', fontSize: 9, padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.05em', flexShrink: 0 }}>LIVE</span>)}<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{selectedTheme.name}</span></div></>)}
        {(shopDomain || selectedTheme) && (<div style={{ width: 1, height: 16, background: 'var(--border-subtle)', flexShrink: 0 }} />)}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 2, gap: 1, flexShrink: 0 }}>
          <ViewModeButton mode="code" active={viewMode === 'code'} onClick={() => onViewModeChange('code')} icon={<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 3L1 5.5L3 8M8 3L10 5.5L8 8M6 2L5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>} label="Code" />
          <ViewModeButton mode="preview" active={viewMode === 'preview'} onClick={() => onViewModeChange('preview')} icon={<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="2" width="9" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 4h9" stroke="currentColor" strokeWidth="1.2"/><circle cx="2.8" cy="3" r="0.5" fill="currentColor"/><circle cx="4.5" cy="3" r="0.5" fill="currentColor"/></svg>} label="Preview" />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: providerDotColor(aiProvider) }} />{providerDisplayName(aiProvider)}</div>
        <button className="btn btn-primary" onClick={onPushChanges} disabled={approvedCount === 0 || isPushing} style={{ fontSize: 12, padding: '6px 12px' }}>{isPushing ? (<><LoadingSpinner size={12} />Pushing...</>) : (<><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M6 3L3 6M6 3l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>Push Changes{approvedCount > 0 && (<span className="badge badge-cyan" style={{ marginLeft: 2, minWidth: 16, height: 16, fontSize: 10 }}>{approvedCount}</span>)}</>)}</button>
        {pendingCount > 0 && (<div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--amber-muted)', border: '1px solid rgba(255, 184, 0, 0.2)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}><span className="status-dot pending" />{pendingCount} pending</div>)}
        <button className="btn btn-ghost" onClick={handleOpenSettings} style={{ padding: '6px 8px' }} data-tooltip="Settings"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.22 3.22l.7.7M10.08 10.08l.7.7M10.08 3.22l-.7.7M3.22 10.08l.7.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg></button>
      </div>
    </header>
    {showSettings && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
      <div className="animate-fade-in" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', width: 440, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}><h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Settings</h2><button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button></div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><span className="status-dot connected" /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Connected Store</span></div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>{shopDomain || 'None'}</div></div>
        <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>AI Provider</label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{PROVIDER_OPTIONS.map(opt => (<button key={opt.value} onClick={() => { setSettingsProvider(opt.value); setNewKey(''); setKeySaved(false) }} style={{ flex: '1 1 auto', minWidth: 120, padding: '8px 10px', background: settingsProvider === opt.value ? 'var(--bg-overlay)' : 'var(--bg-surface)', border: `1px solid ${settingsProvider === opt.value ? 'var(--cyan)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 11, fontWeight: settingsProvider === opt.value ? 600 : 400, color: settingsProvider === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'center' }}>{opt.label}</button>))}</div></div>
        <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>{PROVIDER_OPTIONS.find(p => p.value === settingsProvider)?.label} API Key</label><div style={{ display: 'flex', gap: 8 }}><input className="input input-mono" type="password" placeholder={PROVIDER_OPTIONS.find(p => p.value === settingsProvider)?.placeholder} value={newKey} onChange={e => { setNewKey(e.target.value); setKeySaved(false) }} /><button className="btn btn-ghost" onClick={handleSaveKey} style={{ flexShrink: 0, color: keySaved ? 'var(--green)' : undefined }}>{keySaved ? '✓ Saved' : 'Update'}</button></div></div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Disconnect store and clear session</span><button className="btn btn-danger" onClick={() => { setShowSettings(false); onDisconnect() }} style={{ fontSize: 12 }}>Disconnect</button></div>
      </div>
    </div>)}
  </>)
}
function ViewModeButton({ mode, active, onClick, icon, label }: { mode: ViewMode; active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (<button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: active ? 'var(--bg-overlay)' : 'transparent', border: active ? '1px solid var(--border-default)' : '1px solid transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: active ? 'var(--cyan)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: active ? 600 : 400, transition: 'all 0.12s ease', whiteSpace: 'nowrap' }} onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }} onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}>{icon}{label}</button>)
}
function LoadingSpinner({ size = 14 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="20" strokeLinecap="round" /></svg>)
}