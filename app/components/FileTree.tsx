'use client'

import { useState, useMemo } from 'react'
import type { ShopifyTheme, ThemeFile } from '../types'
import { getFileType, getFileColor } from '../types'

interface FileTreeProps {
  themes: ShopifyTheme[]
  selectedTheme: ShopifyTheme | null
  files: ThemeFile[]
  activeFile: string | null
  openFiles: string[]
  pendingFiles: Set<string>
  isLoading: boolean
  onThemeSelect: (theme: ShopifyTheme) => void
  onFileClick: (filename: string) => void
}

const DIRECTORY_ORDER = ['layout', 'templates', 'sections', 'snippets', 'assets', 'config', 'locales']

interface TreeNode {
  name: string
  fullPath: string
  isDir: boolean
  children: TreeNode[]
  file?: ThemeFile
}

function buildTree(files: ThemeFile[]): TreeNode[] {
  const root: TreeNode[] = []
  const dirMap = new Map<string, TreeNode>()

  // Sort by directory order, then alphabetically
  const sorted = [...files].sort((a, b) => {
    const aDirIdx = DIRECTORY_ORDER.indexOf(a.filename.split('/')[0])
    const bDirIdx = DIRECTORY_ORDER.indexOf(b.filename.split('/')[0])
    if (aDirIdx !== bDirIdx) return aDirIdx - bDirIdx
    return a.filename.localeCompare(b.filename)
  })

  for (const file of sorted) {
    const parts = file.filename.split('/')
    if (parts.length === 1) {
      // Root-level file
      root.push({ name: parts[0], fullPath: file.filename, isDir: false, children: [], file })
      continue
    }

    const dir = parts[0]
    if (!dirMap.has(dir)) {
      const node: TreeNode = { name: dir, fullPath: dir, isDir: true, children: [] }
      dirMap.set(dir, node)
      root.push(node)
    }
    dirMap.get(dir)!.children.push({
      name: parts.slice(1).join('/'),
      fullPath: file.filename,
      isDir: false,
      children: [],
      file,
    })
  }

  return root
}

const FILE_ICONS: Record<string, string> = {
  liquid: '\u25c8',
  css: '\u25c9',
  js: '\u25c6',
  json: '\u25c7',
  svg: '\u25ce',
  other: '\u00b7',
}

const DIR_ICONS: Record<string, string> = {
  layout: '\u2b21',
  templates: '\u2b22',
  sections: '\u2b23',
  snippets: '\u2b24',
  assets: '\u25c8',
  config: '\u2699',
  locales: '\u25f7',
}

export default function FileTree({
  themes,
  selectedTheme,
  files,
  activeFile,
  openFiles,
  pendingFiles,
  isLoading,
  onThemeSelect,
  onFileClick,
}: FileTreeProps) {
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const tree = useMemo(() => buildTree(files), [files])

  function toggleDir(dir: string) {
    setCollapsedDirs(prev => {
      const next = new Set(prev)
      if (next.has(dir)) next.delete(dir)
      else next.add(dir)
      return next
    })
  }

  const filteredTree = useMemo(() => {
    if (!search) return tree
    const q = search.toLowerCase()
    return tree
      .map(node => {
        if (node.isDir) {
          const filtered = node.children.filter(c => c.name.toLowerCase().includes(q))
          if (filtered.length === 0) return null
          return { ...node, children: filtered }
        }
        return node.name.toLowerCase().includes(q) ? node : null
      })
      .filter(Boolean) as TreeNode[]
  }, [tree, search])

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      flexShrink: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Theme selector */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 6,
          fontFamily: 'var(--font-mono)',
        }}>
          Theme
        </div>
        <select
          value={selectedTheme?.id || ''}
          onChange={e => {
            const theme = themes.find(t => t.id === e.target.value)
            if (theme) onThemeSelect(theme)
          }}
          style={{
            width: '100%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            padding: '5px 8px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {themes.length === 0 && (
            <option value="">No themes found</option>
          )}
          {themes.map(theme => (
            <option key={theme.id} value={theme.id}>
              {theme.name}{theme.role === 'main' ? ' (live)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      {files.length > 0 && (
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <div style={{ position: 'relative' }}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7.5 7.5L9.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input
              className="input"
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '4px 8px 4px 24px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-elevated)',
                border: '1px solid transparent',
              }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: '8px 12px 4px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          Files {files.length > 0 && <span style={{ opacity: 0.6 }}>({files.length})</span>}
        </span>
      </div>

      {/* File tree */}
      <div className="scroll-area" style={{ flex: 1, padding: '0 0 16px' }}>
        {isLoading ? (
          <div style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          }}>
            <LoadingDots />
            Loading files...
          </div>
        ) : filteredTree.length === 0 ? (
          <div style={{
            padding: '16px 12px',
            color: 'var(--text-muted)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}>
            {search ? 'No matching files' : 'No files found'}
          </div>
        ) : (
          filteredTree.map(node => (
            <TreeEntry
              key={node.fullPath}
              node={node}
              depth={0}
              collapsed={collapsedDirs.has(node.fullPath)}
              activeFile={activeFile}
              openFiles={new Set(openFiles)}
              pendingFiles={pendingFiles}
              onToggleDir={toggleDir}
              onFileClick={onFileClick}
              collapsedDirs={collapsedDirs}
            />
          ))
        )}
      </div>
    </aside>
  )
}

interface TreeEntryProps {
  node: TreeNode
  depth: number
  collapsed: boolean
  activeFile: string | null
  openFiles: Set<string>
  pendingFiles: Set<string>
  onToggleDir: (dir: string) => void
  onFileClick: (filename: string) => void
  collapsedDirs: Set<string>
}

function TreeEntry({
  node,
  depth,
  collapsed,
  activeFile,
  openFiles,
  pendingFiles,
  onToggleDir,
  onFileClick,
  collapsedDirs,
}: TreeEntryProps) {
  const isActive = !node.isDir && activeFile === node.fullPath
  const isOpen = !node.isDir && openFiles.has(node.fullPath)
  const hasPending = pendingFiles.has(node.fullPath)
  const fileType = node.isDir ? 'other' : getFileType(node.fullPath)
  const fileColor = node.isDir ? 'var(--text-muted)' : getFileColor(fileType)

  return (
    <>
      <div
        onClick={() => node.isDir ? onToggleDir(node.fullPath) : onFileClick(node.fullPath)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: `3px 12px 3px ${12 + depth * 12}px`,
          cursor: 'pointer',
          background: isActive ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--cyan)' : '2px solid transparent',
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
        {/* Directory arrow */}
        {node.isDir && (
          <span style={{
            color: 'var(--text-muted)',
            fontSize: 9,
            flexShrink: 0,
            width: 10,
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            display: 'inline-block',
          }}>
            \u25be
          </span>
        )}

        {/* Icon */}
        <span style={{
          fontSize: node.isDir ? 11 : 10,
          color: node.isDir ? 'var(--text-muted)' : fileColor,
          flexShrink: 0,
          width: node.isDir ? undefined : 10,
          textAlign: 'center',
          opacity: node.isDir ? 0.7 : 1,
        }}>
          {node.isDir
            ? (DIR_ICONS[node.name] || '\u25b8')
            : (FILE_ICONS[fileType] || '\u00b7')}
        </span>

        {/* Name */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: isActive ? 'var(--text-primary)' : isOpen ? 'var(--text-secondary)' : 'var(--text-secondary)',
          fontWeight: isActive ? 500 : 400,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {node.name}
        </span>

        {/* Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {hasPending && (
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--amber)',
            }} />
          )}
          {isOpen && !isActive && (
            <span style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'var(--cyan-dim)',
              opacity: 0.6,
            }} />
          )}
        </div>
      </div>

      {/* Children */}
      {node.isDir && !collapsed && node.children.map(child => (
        <TreeEntry
          key={child.fullPath}
          node={child}
          depth={depth + 1}
          collapsed={collapsedDirs.has(child.fullPath)}
          activeFile={activeFile}
          openFiles={openFiles}
          pendingFiles={pendingFiles}
          onToggleDir={onToggleDir}
          onFileClick={onFileClick}
          collapsedDirs={collapsedDirs}
        />
      ))}
    </>
  )
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--text-muted)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
