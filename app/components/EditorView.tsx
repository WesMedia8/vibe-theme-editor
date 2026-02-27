'use client'
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import type { AppState, AIProvider, ShopifyTheme, PendingChange, ViewMode } from '../types'
import { getFileType, getFileColor, themeGidToId } from '../types'
import TopBar from './TopBar'
import FileTree from './FileTree'
import CodeViewer from './CodeViewer'
import DiffViewer from './DiffViewer'
import ChatPanel from './ChatPanel'
interface EditorViewProps {
  state: AppState
  onThemeSelect: (theme: ShopifyTheme) => void
  onFileClick: (filename: string) => void
  onTabClose: (filename: string) => void
  onTabClick: (filename: string) => void
  onApproveChange: (filename: string) => void
  onRejectChange: (filename: string) => void
  onPushChanges: () => void
  onChatMessage: (content: string) => void
  onDisconnect: () => void
  onSettingsUpdate: (provider: AIProvider, key: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  previewRefreshKey: number
}
export default function EditorView({
  state,
  onThemeSelect,
  onFileClick,
  onTabClose,
  onTabClick,
  onApproveChange,
  onRejectChange,
  onPushChanges,
  onChatMessage,
  onDisconnect,
  onSettingsUpdate,
  viewMode,
  onViewModeChange,
  previewRefreshKey,
}: EditorViewProps) {
  const pendingChanges = state.pendingChanges
  const pendingCount = pendingChanges.size
  const approvedCount = Array.from(pendingChanges.values()).filter(c => c.approved).length
  const isStreaming = state.messages.some(m => m.isStreaming)
  const editorWindowRef = useRef<Window | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const editorUrl = useMemo(() => {
    if (!state.shopDomain || !state.selectedTheme) return null
    const numericId = themeGidToId(state.selectedTheme.id)
    return `https://${state.shopDomain}/admin/themes/${numericId}/editor`
  }, [state.shopDomain, state.selectedTheme])
  const openSideBySide = useCallback(() => {
    if (!editorUrl) return
    if (editorWindowRef.current && !editorWindowRef.current.closed) {
  editorWindowRef.current.focus()
  setEditorOpen(true)
  return
    }
    const screenW = window.screen.availWidth
    const screenH = window.screen.availHeight
    const halfW = Math.floor(screenW / 2)
    window.moveTo(0, 0)
    window.resizeTo(halfW, screenH)
    const win = window.open(
  editorUrl,
  'shopify-theme-editor',
  `width=${halfW},height=${screenH},left=${halfW},top=0,menubar=no,toolbar=no,location=yes,status=no`
    )
    if (win) {
  editorWindowRef.current = win
  setEditorOpen(true)
    }
  }, [editorUrl])
  const closeSideBySide = useCallback(() => {
    if (editorWindowRef.current && !editorWindowRef.current.closed) {
  editorWindowRef.current.close()
    }
    editorWindowRef.current = null
    setEditorOpen(false)
  }, [])
  useEffect(() => {
    const interval = setInterval(() => {
  if (editorWindowRef.current && editorWindowRef.current.closed) {
  editorWindowRef.current = null
  setEditorOpen(false)
  }
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    if (viewMode === 'preview' && editorUrl && !editorOpen) {
  openSideBySide()
    }
  }, [viewMode, editorUrl])
  useEffect(() => {
    if (previewRefreshKey > 0 && editorWindowRef.current && !editorWindowRef.current.closed) {
  try {
  editorWindowRef.current.location.reload()
  } catch {
  }
    }
  }, [previewRefreshKey])
  const pendingFiles = useMemo(
    () => new Set(Array.from(pendingChanges.keys())),
    [pendingChanges]
  )
  const activeChange: PendingChange | null =
    state.activeFile ? (pendingChanges.get(state.activeFile) || null) : null
  const activeContent = state.activeFile ? (state.fileContents.get(state.activeFile) || '') : null
  return (
    <div style={{
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'var(--bg-base)',
    }}>
  <TopBar
  shopDomain={state.shopDomain}
  selectedTheme={state.selectedTheme}
  pendingCount={pendingCount}
  approvedCount={approvedCount}
  isPushing={state.isLoading}
  onPushChanges={onPushChanges}
  onDisconnect={onDisconnect}
  onSettingsUpdate={onSettingsUpdate}
  aiProvider={state.aiProvider}
  aiApiKey={state.aiApiKey}
  viewMode={viewMode}
  onViewModeChange={onViewModeChange}
  />
  <div style={{
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
  minHeight: 0,
  }}>
  {viewMode === 'code' ? (
  <>
  <FileTree
  themes={state.themes}
  selectedTheme={state.selectedTheme}
  files={state.themeFiles}
  activeFile={state.activeFile}
  openFiles={state.openFiles}
  pendingFiles={pendingFiles}
  isLoading={state.isLoading}
  onThemeSelect={onThemeSelect}
  onFileClick={onFileClick}
  />
  <div style={{
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 0,
  }}>
  {state.openFiles.length > 0 && (
  <div style={{
  display: 'flex',
  background: 'var(--bg-surface)',
  borderBottom: '1px solid var(--border-subtle)',
  overflowX: 'auto',
  flexShrink: 0,
  scrollbarWidth: 'none',
  }}>
  {state.openFiles.map(filename => (
  <FileTab
  key={filename}
  filename={filename}
  isActive={state.activeFile === filename}
  hasPending={pendingFiles.has(filename)}
  onTabClick={onTabClick}
  onTabClose={onTabClose}
  />
  ))}
  </div>
  )}
  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
  {!state.activeFile ? (
  <EmptyEditor hasFiles={state.openFiles.length > 0} hasTheme={!!state.selectedTheme} />
  ) : activeChange ? (
  <DiffViewer change={activeChange} onApprove={onApproveChange} onReject={onRejectChange} />
  ) : activeContent !== null ? (
  <CodeViewer filename={state.activeFile} content={activeContent} />
  ) : (
  <LoadingContent />
  )}
  </div>
  </div>
  </>
  ) : (
  <PreviewStatusPanel
  editorUrl={editorUrl}
  editorOpen={editorOpen}
  onOpenEditor={openSideBySide}
  selectedThemeName={state.selectedTheme?.name || null}
  />
  )}
  <ChatPanel
  messages={state.messages}
  onSendMessage={onChatMessage}
  isStreaming={isStreaming}
  pendingCount={pendingCount}
  approvedCount={approvedCount}
  onPushChanges={onPushChanges}
  isPushing={state.isLoading}
  selectedThemeName={state.selectedTheme?.name || null}
  aiProvider={state.aiProvider}
  onOpenFile={filename => {
  onViewModeChange('code')
  onFileClick(filename)
  }}
  />
  </div>
    </div>
  )
}
function PreviewStatusPanel({
  editorUrl,
  editorOpen,
  onOpenEditor,
  selectedThemeName,
}: {
  editorUrl: string | null
  editorOpen: boolean
  onOpenEditor: () => void
  selectedThemeName: string | null
}) {
  return (
    <div style={{
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-base)',
  gap: 20,
  padding: 40,
    }}>
  <div className="bg-dots" style={{
  position: 'absolute',
  inset: 0,
  opacity: 0.3,
  pointerEvents: 'none',
  }} />
  {/* Browser window illustration */}
  <div style={{
  position: 'relative',
  display: 'flex',
  gap: 8,
  marginBottom: 8,
  }}>
  {/* Left window (this app) */}
  <div style={{
  width: 120,
  height: 80,
  border: '2px solid var(--cyan)',
  borderRadius: 8,
  background: 'var(--bg-surface)',
  overflow: 'hidden',
  }}>
  <div style={{
  height: 14,
  background: 'var(--bg-elevated)',
  borderBottom: '1px solid var(--border-subtle)',
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  padding: '0 5px',
  }}>
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)' }} />
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--amber)' }} />
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)' }} />
  </div>
  <div style={{ padding: '6px 8px' }}>
  <div style={{ width: '60%', height: 3, background: 'var(--cyan)', borderRadius: 2, marginBottom: 4, opacity: 0.6 }} />
  <div style={{ width: '80%', height: 2, background: 'var(--border-strong)', borderRadius: 2, marginBottom: 3 }} />
  <div style={{ width: '50%', height: 2, background: 'var(--border-strong)', borderRadius: 2, marginBottom: 3 }} />
  <div style={{ width: '70%', height: 2, background: 'var(--border-strong)', borderRadius: 2 }} />
  </div>
  </div>
  {/* Right window (Shopify editor) */}
  <div style={{
  width: 120,
  height: 80,
  border: editorOpen ? '2px solid var(--green)' : '2px dashed var(--border-strong)',
  borderRadius: 8,
  background: editorOpen ? 'var(--bg-surface)' : 'transparent',
  overflow: 'hidden',
  opacity: editorOpen ? 1 : 0.5,
  transition: 'all 0.3s ease',
  }}>
  <div style={{
  height: 14,
  background: editorOpen ? 'var(--bg-elevated)' : 'transparent',
  borderBottom: editorOpen ? '1px solid var(--border-subtle)' : '1px dashed var(--border-subtle)',
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  padding: '0 5px',
  }}>
  {editorOpen && (
  <>
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)' }} />
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--amber)' }} />
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)' }} />
  </>
  )}
  </div>
  {editorOpen ? (
  <div style={{ padding: '6px 8px' }}>
  <div style={{ width: '40%', height: 3, background: 'var(--green)', borderRadius: 2, marginBottom: 4, opacity: 0.6 }} />
  <div style={{ width: '90%', height: 2, background: 'var(--border-strong)', borderRadius: 2, marginBottom: 3 }} />
  <div style={{ width: '60%', height: 2, background: 'var(--border-strong)', borderRadius: 2, marginBottom: 3 }} />
  <div style={{ width: '75%', height: 2, background: 'var(--border-strong)', borderRadius: 2 }} />
  </div>
  ) : (
  <div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(100% - 14px)',
  }}>
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
  <path d="M10 4v12M4 10h12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
  </div>
  )}
  </div>
  {/* Connection arrow */}
  <div style={{
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 24,
  height: 24,
  background: 'var(--bg-base)',
  borderRadius: '50%',
  border: '1px solid var(--border-default)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  }}>
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
  <path d="M2 6h8M7 3l3 3-3 3" stroke={editorOpen ? 'var(--green)' : 'var(--text-muted)'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  </div>
  </div>
  {/* Status text */}
  <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
  {editorOpen ? (
  <>
  <div style={{
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  justifyContent: 'center',
  marginBottom: 8,
  }}>
  <span style={{
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--green)',
  boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)',
  }} />
  <span style={{
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text-primary)',
  }}>
  Shopify Editor is Open
  </span>
  </div>
  <div style={{
  fontSize: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  maxWidth: 400,
  }}>
  The theme editor is open in the window to the right.
  Use the chat to make AI-powered changes — they'll be pushed directly to{' '}
  <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
  {selectedThemeName || 'your theme'}
  </span>.
  </div>
  </>
  ) : (
  <>
  <div style={{
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 8,
  }}>
  {editorUrl ? 'Open the Theme Editor' : 'Select a Theme First'}
  </div>
  <div style={{
  fontSize: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  maxWidth: 400,
  marginBottom: 16,
  }}>
  {editorUrl
  ? 'Opens the real Shopify theme editor side-by-side with this window. You\'ll see your changes in real time.'
  : 'Choose a theme from the Code tab first, then come back to Preview to open the editor.'}
  </div>
  </>
  )}
  </div>
  {/* Action button */}
  {editorUrl && (
  <button
  onClick={onOpenEditor}
  style={{
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: editorOpen ? '8px 16px' : '10px 24px',
  background: editorOpen ? 'var(--bg-elevated)' : 'var(--cyan)',
  color: editorOpen ? 'var(--text-secondary)' : '#000',
  border: editorOpen ? '1px solid var(--border-default)' : '1px solid var(--cyan)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: editorOpen ? 11 : 13,
  fontWeight: 600,
  transition: 'all 0.15s ease',
  }}
  >
  {editorOpen ? (
  <>
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
  <rect x="1" y="1" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
  <rect x="7" y="1" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
  Focus Editor Window
  </>
  ) : (
  <>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
  <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
  <path d="M1 4.5h12" stroke="currentColor" strokeWidth="1.3"/>
  <circle cx="3.5" cy="3.25" r="0.6" fill="currentColor"/>
  <circle cx="5.5" cy="3.25" r="0.6" fill="currentColor"/>
  </svg>
  Open Theme Editor
  </>
  )}
  </button>
  )}
  {/* Keyboard shortcut hint */}
  {editorOpen && (
  <div style={{
  position: 'relative',
  zIndex: 1,
  fontSize: 10,
  color: 'var(--text-disabled)',
  fontFamily: 'var(--font-mono)',
  }}>
  Changes pushed from chat will auto-refresh the editor
  </div>
  )}
    </div>
  )
}
function FileTab({ filename, isActive, hasPending, onTabClick, onTabClose }: {
  filename: string; isActive: boolean; hasPending: boolean
  onTabClick: (f: string) => void; onTabClose: (f: string) => void
}) {
  const parts = filename.split('/')
  const basename = parts[parts.length - 1]
  const fileType = getFileType(filename)
  const fileColor = getFileColor(fileType)
  return (
    <div
  onClick={() => onTabClick(filename)}
  style={{
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 14px',
  height: 36,
  cursor: 'pointer',
  background: isActive ? 'var(--bg-base)' : 'transparent',
  borderRight: '1px solid var(--border-subtle)',
  borderBottom: isActive ? '2px solid var(--cyan)' : '2px solid transparent',
  flexShrink: 0,
  transition: 'background 0.1s ease',
  userSelect: 'none',
  }}
  onMouseEnter={e => {
  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
  }}
  onMouseLeave={e => {
  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
  }}
    >
  <span style={{
  width: 7, height: 7, borderRadius: '50%',
  background: hasPending ? 'var(--amber)' : fileColor,
  flexShrink: 0, opacity: hasPending ? 1 : 0.7,
  }} />
  <span style={{
  fontFamily: 'var(--font-mono)', fontSize: 11.5,
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
  whiteSpace: 'nowrap',
  }}>
  {basename}
  </span>
  <button
  onClick={e => { e.stopPropagation(); onTabClose(filename) }}
  style={{
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-muted)', padding: '2px', borderRadius: 3,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  opacity: 0, transition: 'opacity 0.1s ease',
  }}
  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
  >
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
  <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
  </button>
    </div>
  )
}
function EmptyEditor({ hasFiles, hasTheme }: { hasFiles: boolean; hasTheme: boolean }) {
  return (
    <div style={{
  height: '100%', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', gap: 12,
    }}>
  <div className="bg-dots" style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none' }} />
  <div style={{
  width: 48, height: 48, background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 12,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
  <path d="M4 6h14M4 10h10M4 14h12" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
  </div>
  <div style={{ textAlign: 'center', position: 'relative' }}>
  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>
  {!hasTheme ? 'Select a theme to get started' : !hasFiles ? 'Loading theme files...' : 'Select a file from the sidebar'}
  </div>
  <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
  {hasFiles && 'Or ask AI to make changes in the chat \u2192'}
  </div>
  </div>
    </div>
  )
}
function LoadingContent() {
  return (
    <div style={{
  height: '100%', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: 'var(--bg-base)',
    }}>
  <div style={{
  display: 'flex', gap: 6, alignItems: 'center',
  color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12,
  }}>
  <div style={{ display: 'flex', gap: 4 }}>
  {[0, 1, 2].map(i => (
  <span key={i} style={{
  width: 4, height: 4, borderRadius: '50%', background: 'var(--cyan)',
  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
  }} />
  ))}
  </div>
  Loading file...
  </div>
    </div>
  )
}