'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ShopifyTheme } from '../types'

interface ThemeSetting {
  type: string
  id?: string
  label?: string
  default?: unknown
  info?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  options?: Array<{ value: string; label: string }>
  content?: string
  placeholder?: string
}

interface ThemeSettingGroup {
  name: string
  settings: ThemeSetting[]
}

interface ThemeCustomizerProps {
  shopDomain: string | null
  selectedTheme: ShopifyTheme | null
  editorWindowRef: React.MutableRefObject<Window | null>
}

const FONT_FAMILIES = [
  'Assistant','Barlow','DM Sans','EB Garamond','Figtree','Fraunces','IBM Plex Mono','IBM Plex Sans','Inter','Josefin Sans','Lato','Libre Baskerville','Libre Franklin','Lora','Merriweather','Montserrat','Mulish','Nunito','Nunito Sans','Open Sans','Oswald','Outfit','Playfair Display','Poppins','PT Sans','PT Serif','Raleway','Roboto','Roboto Condensed','Roboto Mono','Roboto Slab','Rubik','Source Code Pro','Source Sans 3','Space Grotesk','Space Mono','Spectral','Ubuntu','Work Sans','Yanone Kaffeesatz',
]

function ColorControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value || '#000000')
  useEffect(() => { setHex(value || '#000000') }, [value])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input type="color" value={hex} onChange={e => { setHex(e.target.value); onChange(e.target.value) }} style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', cursor: 'pointer', padding: 2, background: 'var(--bg-elevated)' }} />
      <input type="text" value={hex} onChange={e => { setHex(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value) }} style={inputStyle} maxLength={7} spellCheck={false} />
    </div>
  )
}

function RangeControl({ setting, value, onChange }: { setting: ThemeSetting; value: number; onChange: (v: number) => void }) {
  const min = setting.min ?? 0, max = setting.max ?? 100, step = setting.step ?? 1, unit = setting.unit || ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input type="range" min={min} max={max} step={step} value={value ?? min} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, height: 4, accentColor: 'var(--cyan)', cursor: 'pointer' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', minWidth: 44, textAlign: 'right', flexShrink: 0 }}>{value ?? min}{unit}</span>
    </div>
  )
}

function ToggleControl({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 38, height: 22, borderRadius: 11, background: value ? 'var(--cyan)' : 'var(--bg-overlay)', border: '1px solid', borderColor: value ? 'var(--cyan)' : 'var(--border-default)', cursor: 'pointer', position: 'relative', transition: 'background 0.15s ease, border-color 0.15s ease', flexShrink: 0, padding: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  )
}

function SelectControl({ setting, value, onChange }: { setting: ThemeSetting; value: string; onChange: (v: string) => void }) {
  return (<select value={value ?? ''} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>{setting.options?.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>)
}

function FontPickerControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const familyFromValue = (v: string) => { if (!v) return ''; const clean = v.replace(/_[a-z0-9]+$/, '').replace(/_/g, ' '); return clean.charAt(0).toUpperCase() + clean.slice(1) }
  const currentFamily = familyFromValue(value)
  return (<select value={currentFamily} onChange={e => { const h = e.target.value.toLowerCase().replace(/\s+/g, '_'); onChange(`${h}_n4`) }} style={{ ...inputStyle, cursor: 'pointer' }}>{!currentFamily && <option value="">Select font</option>}{FONT_FAMILIES.map(f => (<option key={f} value={f}>{f}</option>))}</select>)
}

const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 12, padding: '6px 9px', outline: 'none', boxSizing: 'border-box' }
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.5 }

function SettingRow({ setting, value, onChange }: { setting: ThemeSetting; value: unknown; onChange: (id: string, v: unknown) => void }) {
  const id = setting.id || '', type = setting.type
  if (type === 'header') return (<div style={{ paddingTop: 12, paddingBottom: 4, borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}><span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{setting.content || setting.label || ''}</span></div>)
  if (type === 'paragraph') return (<p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: '4px 0', fontFamily: 'var(--font-sans)' }}>{setting.content || ''}</p>)
  if (!id) return null
  const label = setting.label || id, info = setting.info
  const renderControl = () => {
    switch (type) {
      case 'color': case 'color_background': return <ColorControl value={String(value ?? setting.default ?? '#000000')} onChange={v => onChange(id, v)} />
      case 'range': return <RangeControl setting={setting} value={Number(value ?? setting.default ?? setting.min ?? 0)} onChange={v => onChange(id, v)} />
      case 'checkbox': return <ToggleControl value={Boolean(value ?? setting.default ?? false)} onChange={v => onChange(id, v)} />
      case 'select': return <SelectControl setting={setting} value={String(value ?? setting.default ?? '')} onChange={v => onChange(id, v)} />
      case 'font_picker': return <FontPickerControl value={String(value ?? setting.default ?? '')} onChange={v => onChange(id, v)} />
      case 'textarea': case 'richtext': return <textarea value={String(value ?? setting.default ?? '')} onChange={e => onChange(id, e.target.value)} placeholder={setting.placeholder || ''} style={textareaStyle} />
      case 'html': return <textarea value={String(value ?? setting.default ?? '')} onChange={e => onChange(id, e.target.value)} placeholder={setting.placeholder || ''} style={{ ...textareaStyle, fontFamily: 'var(--font-mono)', fontSize: 11 }} />
      case 'number': return <input type="number" value={String(value ?? setting.default ?? '')} onChange={e => onChange(id, Number(e.target.value))} min={setting.min} max={setting.max} step={setting.step} style={inputStyle} />
      case 'image_picker': return (<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{value ? <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', padding: '4px 8px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', wordBreak: 'break-all' }}>{String(value)}</div> : <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontStyle: 'italic', padding: '4px 0' }}>No image selected</div>}<input type="text" value={String(value ?? '')} onChange={e => onChange(id, e.target.value)} placeholder="Image URL or handle" style={inputStyle} /></div>)
      case 'url': case 'video_url': return <input type="url" value={String(value ?? setting.default ?? '')} onChange={e => onChange(id, e.target.value)} placeholder={setting.placeholder || 'https://'} style={inputStyle} />
      case 'article': case 'blog': case 'collection': case 'page': case 'product': case 'link_list': return <input type="text" value={String(value ?? setting.default ?? '')} onChange={e => onChange(id, e.target.value)} placeholder={`${type} handle`} style={inputStyle} />
      default: return <input type="text" value={String(value ?? setting.default ?? '')} onChange={e => onChange(id, e.target.value)} placeholder={setting.placeholder || ''} style={inputStyle} />
    }
  }
  const isInline = type === 'checkbox'
  return (
    <div style={{ display: 'flex', flexDirection: isInline ? 'row' : 'column', alignItems: isInline ? 'center' : 'flex-start', justifyContent: isInline ? 'space-between' : 'flex-start', gap: isInline ? 12 : 5, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ flex: isInline ? 1 : undefined, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: info ? 2 : 0, whiteSpace: isInline ? 'nowrap' : 'normal' }}>{label}</div>
        {info && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>{info}</div>}
      </div>
      <div style={{ width: isInline ? 'auto' : '100%' }}>{renderControl()}</div>
    </div>
  )
}

function SettingsSection({ group, currentValues, onChange, defaultOpen }: { group: ThemeSettingGroup; currentValues: Record<string, unknown>; onChange: (id: string, v: unknown) => void; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const actionSettings = group.settings.filter(s => s.id || s.type === 'header' || s.type === 'paragraph')
  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left', gap: 8 }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.04em', color: open ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.15s ease' }}>{group.name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: 'var(--text-muted)' }}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (<div style={{ padding: '0 16px 12px' }}>{actionSettings.map((s, i) => (<SettingRow key={s.id || `${s.type}-${i}`} setting={s} value={s.id ? currentValues[s.id] : undefined} onChange={onChange} />))}{actionSettings.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-disabled)', fontStyle: 'italic' }}>No settings in this section.</p>}</div>)}
    </div>
  )
}

export default function ThemeCustomizer({ shopDomain, selectedTheme }: ThemeCustomizerProps) {
  const [schema, setSchema] = useState<ThemeSettingGroup[]>([])
  const [savedData, setSavedData] = useState<Record<string, unknown>>({})
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const hasChanges = JSON.stringify(localValues) !== JSON.stringify(savedData)

  const fetchSettings = useCallback(async () => {
    if (!selectedTheme) return
    setLoading(true); setError(null); setSaveSuccess(false)
    try {
      const res = await fetch(`/api/theme-settings?themeId=${encodeURIComponent(selectedTheme.id)}`)
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`) }
      const json = await res.json()
      setSchema(Array.isArray(json.schema) ? json.schema : [])
      const current: Record<string, unknown> = json.data?.current || {}
      setSavedData(current); setLocalValues(current)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load settings') } finally { setLoading(false) }
  }, [selectedTheme])

  useEffect(() => { fetchSettings() }, [fetchSettings])
  const handleChange = useCallback((id: string, value: unknown) => { setLocalValues(prev => ({ ...prev, [id]: value })); setSaveSuccess(false) }, [])

  const handleSave = async () => {
    if (!selectedTheme) return
    setSaving(true); setSaveError(null); setSaveSuccess(false)
    try {
      const fullData = (savedData as Record<string, unknown>).current !== undefined ? { ...savedData, current: localValues } : { current: localValues }
      const res = await fetch('/api/theme-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themeId: selectedTheme.id, settingsData: fullData }) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`) }
      setSavedData(localValues); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Save failed') } finally { setSaving(false) }
  }

  const handleDiscard = () => { setLocalValues(savedData); setSaveError(null) }

  if (!selectedTheme) return (<div style={emptyStyle}><div style={emptyIconStyle}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinejoin="round" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinejoin="round" /></svg></div><div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Select a theme to customize</div></div>)
  if (loading) return (<div style={emptyStyle}><div style={{ display: 'flex', gap: 5 }}>{[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Loading theme settings...</div></div>)
  if (error) return (<div style={emptyStyle}><div style={{ padding: '12px 16px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 'var(--radius-md)', color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-mono)', maxWidth: 320, textAlign: 'center' }}>{error}</div><button onClick={fetchSettings} style={secondaryBtnStyle}>Retry</button></div>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg-base)', borderRight: '1px solid var(--border-subtle)', minWidth: 0, maxWidth: 360, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-default)', flexShrink: 0, background: 'var(--bg-surface)', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>Theme Settings</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{selectedTheme.name}</div>
        </div>
        <button onClick={fetchSettings} title="Refresh from Shopify" style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px 7px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10.5 6A4.5 4.5 0 1 1 6 1.5c1.5 0 2.8.73 3.65 1.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M7.5 1.5H10V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'var(--border-default) transparent' }}>
        {schema.length === 0 ? <div style={{ padding: 24, textAlign: 'center' }}><p style={{ fontSize: 12, color: 'var(--text-disabled)', fontStyle: 'italic' }}>No settings schema found.</p></div> : schema.map((group, i) => <SettingsSection key={`${group.name}-${i}`} group={group} currentValues={localValues} onChange={handleChange} defaultOpen={i === 0} />)}
        <div style={{ height: 72 }} />
      </div>
      {(hasChanges || saveSuccess || saveError) && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, maxWidth: 328, background: saveSuccess ? 'rgba(0,220,130,0.12)' : 'var(--bg-elevated)', border: '1px solid', borderColor: saveSuccess ? 'rgba(0,220,130,0.4)' : saveError ? 'rgba(255,80,80,0.4)' : 'var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 10 }}>
          {saveError ? <span style={{ flex: 1, fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{saveError}</span> : saveSuccess ? <span style={{ flex: 1, fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>Saved to Shopify</span> : <span style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Unsaved changes</span>}
          {hasChanges && (<><button onClick={handleDiscard} style={secondaryBtnStyle}>Discard</button><button onClick={handleSave} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving...' : 'Save'}</button></>)}
        </div>
      )}
    </div>
  )
}

const emptyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14, background: 'var(--bg-base)', padding: 32 }
const emptyIconStyle: React.CSSProperties = { width: 48, height: 48, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const primaryBtnStyle: React.CSSProperties = { background: 'var(--cyan)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#000', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }
const secondaryBtnStyle: React.CSSProperties = { background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }
