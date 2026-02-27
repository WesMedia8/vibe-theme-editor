'use client'

import { useMemo } from 'react'
import type { AppState, AIProvider, ShopifyTheme, PendingChange } from '../types'
import { getFileType, getFileColor } from '../types'
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
}: EditorViewProps) {
  const pendingChanges = state.pendingChanges
  const pendingCount = pendingChanges.size
  const approvedCount = Array.from(pendingChanges.values()).filter(c => c.approved).length
  const isStreaming = state.messages.some(m => m.isStreaming)

  const pendingFiles = useMemo(
    () => new Set(Array.from(pendingChanges.keys())),
    [pendingChanges]
  )

  // Determine what to show in the center panel
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
      {/* Top bar */}
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
      />

      {/* Main layout */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Left: File tree */}
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

        {/* Center: Code/Diff viewer */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Tab bar */}
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

          {/* Content area */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {!state.activeFile ? (
              <EmptyEditor
                hasFiles={state.openFiles.length > 0}
                hasTheme={!!state.selectedTheme}
              />
            ) : activeChange ? (
              <DiffViewer
                change={activeChange}
                onApprove={onApproveChange}
                onReject={onRejectChange}
              />
            ) : activeContent !== null ? (
              <CodeViewer
                filename={state.activeFile}
                content={activeContent}
              />
            ) : (
              <LoadingContent />
            )}
          </div>
        </div>

        {/* Right: Chat panel */}
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
        />
      </div>
    </div>
  )
}

interface FileTabProps {
  filename: string
  isActive: boolean
  hasPending: boolean
  onTabClick: (filename: string) => void
  onTabClose: (filename: string) => void
}

function FileTab({ filename, isActive, hasPending, onTabClick, onTabClose }: FileTabProps) {
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
      {/* Color dot */}
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: hasPending ? 'var(--amber)' : fileColor,
        flexShrink: 0,
        opacity: hasPending ? 1 : 0.7,
      }} />

      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11.5,
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap',
      }}>
        {basename}
      </span>

      {/* Close button */}
      <button
        onClick={e => { e.stopPropagation(); onTabClose(filename) }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: '2px',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.1s ease',
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
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      gap: 12,
    }}>
      <div className="bg-dots" style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.4,
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 48,
        height: 48,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M4 6h14M4 10h10M4 14h12" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-muted)',
          marginBottom: 4,
        }}>
          {!hasTheme
            ? 'Select a theme to get started'
            : !hasFiles
            ? 'Loading theme files...'
            : 'Select a file from the sidebar'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
          {hasFiles && 'Or ask Claude to make changes in the chat →'}
        </div>
      </div>
    </div>
  )
}

function LoadingContent() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}>
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
        Loading file...
      </div>
    </div>
  )
}
