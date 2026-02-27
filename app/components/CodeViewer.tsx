'use client'

import { useEffect, useRef } from 'react'
import { getLanguage, getFileColor, getFileType } from '../types'

interface CodeViewerProps {
  filename: string
  content: string
}

export default function CodeViewer({ filename, content }: CodeViewerProps) {
  const preRef = useRef<HTMLPreElement>(null)
  const fileType = getFileType(filename)
  const fileColor = getFileColor(fileType)
  const language = getLanguage(filename)
  const lines = content.split('\n')

  useEffect(() => {
    // Trigger Prism highlighting if available
    if (typeof window !== 'undefined' && (window as unknown as { Prism?: { highlightElement: (el: HTMLElement) => void } }).Prism && preRef.current) {
      const codeEl = preRef.current.querySelector('code')
      if (codeEl) {
        (window as unknown as { Prism: { highlightElement: (el: HTMLElement) => void } }).Prism.highlightElement(codeEl)
      }
    }
  }, [content, filename])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* File info bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 16px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: fileColor, fontFamily: 'var(--font-mono)' }}>
          {fileType.toUpperCase()}
        </span>
        <span style={{ color: 'var(--border-default)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {lines.length} lines
        </span>
        <span style={{ color: 'var(--border-default)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {formatBytes(new TextEncoder().encode(content).length)}
        </span>
      </div>

      {/* Code area */}
      <div
        className="scroll-area scroll-area-x"
        style={{ flex: 1, display: 'flex', background: 'var(--bg-base)' }}
      >
        {/* Line numbers */}
        <div style={{
          padding: '16px 0',
          minWidth: 48,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          userSelect: 'none',
          flexShrink: 0,
          textAlign: 'right',
        }}>
          {lines.map((_, i) => (
            <div
              key={i}
              style={{
                height: 20,
                lineHeight: '20px',
                padding: '0 10px 0 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-disabled)',
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <pre
            ref={preRef}
            style={{
              margin: 0,
              padding: '16px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              lineHeight: '20px',
              color: 'var(--text-primary)',
              background: 'transparent',
              tabSize: 2,
              whiteSpace: 'pre',
              minWidth: 'max-content',
            }}
          >
            <code className={`language-${language}`}>
              {content}
            </code>
          </pre>
        </div>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
