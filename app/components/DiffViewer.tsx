'use client'

import { useMemo } from 'react'
import type { PendingChange } from '../types'

interface DiffViewerProps {
  change: PendingChange
  onApprove: (filename: string) => void
  onReject: (filename: string) => void
}

type DiffLine =
  | { type: 'added'; content: string; newLine: number }
  | { type: 'removed'; content: string; oldLine: number }
  | { type: 'unchanged'; content: string; oldLine: number; newLine: number }

function computeDiff(original: string, proposed: string): DiffLine[] {
  const oldLines = original.split('\n')
  const newLines = proposed.split('\n')

  // Simple LCS-based diff
  const m = oldLines.length
  const n = newLines.length

  // Build LCS matrix (limited to avoid stack overflow on large files)
  const maxLines = 500
  const useSimple = m > maxLines || n > maxLines

  if (useSimple) {
    // For large files, do a simple line-by-line comparison
    const result: DiffLine[] = []
    let oldLine = 1
    let newLine = 1
    const maxLen = Math.max(m, n)
    for (let i = 0; i < maxLen; i++) {
      if (i < m && i < n) {
        if (oldLines[i] === newLines[i]) {
          result.push({ type: 'unchanged', content: oldLines[i], oldLine, newLine })
          oldLine++
          newLine++
        } else {
          result.push({ type: 'removed', content: oldLines[i], oldLine })
          result.push({ type: 'added', content: newLines[i], newLine })
          oldLine++
          newLine++
        }
      } else if (i < m) {
        result.push({ type: 'removed', content: oldLines[i], oldLine })
        oldLine++
      } else {
        result.push({ type: 'added', content: newLines[i], newLine })
        newLine++
      }
    }
    return result
  }

  // LCS dp
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  const result: DiffLine[] = []
  let i = m, j = n
  let oldLine = m + 1, newLine = n + 1
  const ops: Array<{ type: 'added' | 'removed' | 'unchanged'; content: string }> = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: 'unchanged', content: oldLines[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', content: newLines[j - 1] })
      j--
    } else {
      ops.push({ type: 'removed', content: oldLines[i - 1] })
      i--
    }
  }

  // Reverse and assign line numbers
  oldLine = 1; newLine = 1
  for (const op of ops.reverse()) {
    if (op.type === 'unchanged') {
      result.push({ type: 'unchanged', content: op.content, oldLine, newLine })
      oldLine++; newLine++
    } else if (op.type === 'removed') {
      result.push({ type: 'removed', content: op.content, oldLine })
      oldLine++
    } else {
      result.push({ type: 'added', content: op.content, newLine })
      newLine++
    }
  }

  return result
}

// Only show lines near changes (context lines)
function contextFilter(diff: DiffLine[], context = 3): Array<DiffLine | { type: 'separator' }> {
  const changed = new Set<number>()
  diff.forEach((line, idx) => {
    if (line.type !== 'unchanged') {
      for (let k = Math.max(0, idx - context); k <= Math.min(diff.length - 1, idx + context); k++) {
        changed.add(k)
      }
    }
  })

  if (changed.size === 0) {
    // No changes at all
    return diff.slice(0, 5).map(l => l as DiffLine | { type: 'separator' })
  }

  const result: Array<DiffLine | { type: 'separator' }> = []
  let lastIncluded = -1

  diff.forEach((line, idx) => {
    if (changed.has(idx)) {
      if (lastIncluded >= 0 && idx > lastIncluded + 1) {
        result.push({ type: 'separator' })
      }
      result.push(line)
      lastIncluded = idx
    }
  })

  return result
}

export default function DiffViewer({ change, onApprove, onReject }: DiffViewerProps) {
  const diff = useMemo(() => computeDiff(change.original, change.proposed), [change.original, change.proposed])
  const visibleDiff = useMemo(() => contextFilter(diff, 4), [diff])
  
  const stats = useMemo(() => ({
    added: diff.filter(l => l.type === 'added').length,
    removed: diff.filter(l => l.type === 'removed').length,
  }), [diff])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Diff header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}>
            {change.filename}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {stats.added > 0 && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--green)',
                background: 'var(--green-muted)',
                padding: '1px 6px',
                borderRadius: 3,
              }}>
                +{stats.added}
              </span>
            )}
            {stats.removed > 0 && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--red)',
                background: 'var(--red-muted)',
                padding: '1px 6px',
                borderRadius: 3,
              }}>
                -{stats.removed}
              </span>
            )}
          </div>
          {change.approved && (
            <span style={{
              fontSize: 11,
              color: 'var(--green)',
              background: 'var(--green-muted)',
              padding: '2px 8px',
              borderRadius: 3,
              fontFamily: 'var(--font-mono)',
            }}>
              ✓ approved
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!change.approved ? (
            <>
              <button
                className="btn btn-success"
                onClick={() => onApprove(change.filename)}
                style={{ fontSize: 12, padding: '5px 12px' }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5L4.5 8 9 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Apply Change
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onReject(change.filename)}
                style={{ fontSize: 12, padding: '5px 12px' }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 2l7 7M9 2L2 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Reject
              </button>
            </>
          ) : (
            <button
              className="btn btn-danger"
              onClick={() => onReject(change.filename)}
              style={{ fontSize: 12, padding: '5px 12px' }}
            >
              Undo
            </button>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="scroll-area" style={{ flex: 1, background: 'var(--bg-base)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 40px 1fr',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          lineHeight: '20px',
        }}>
          {/* Column headers */}
          <div style={{
            gridColumn: '1 / 3',
            padding: '6px 12px',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            borderBottom: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
          }}>
            ORIGINAL
          </div>
          <div style={{
            gridColumn: '3 / 5',
            padding: '6px 12px',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            PROPOSED
          </div>

          {/* Diff lines */}
          {visibleDiff.map((entry, idx) => {
            if (entry.type === 'separator') {
              return (
                <div
                  key={`sep-${idx}`}
                  style={{
                    gridColumn: '1 / 5',
                    padding: '4px 12px',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-disabled)',
                    fontSize: 10,
                    borderTop: '1px solid var(--border-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  ···
                </div>
              )
            }

            const line = entry as DiffLine

            if (line.type === 'unchanged') {
              return (
                <>
                  <div key={`old-${idx}`} style={{
                    padding: '0 8px 0 4px',
                    color: 'var(--text-disabled)',
                    textAlign: 'right',
                    background: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border-subtle)',
                    userSelect: 'none',
                    fontSize: 10,
                  }}>
                    {line.oldLine}
                  </div>
                  <div key={`old-c-${idx}`} style={{
                    padding: '0 16px',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    borderRight: '1px solid var(--border-subtle)',
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {line.content || ' '}
                  </div>
                  <div key={`new-${idx}`} style={{
                    padding: '0 8px 0 4px',
                    color: 'var(--text-disabled)',
                    textAlign: 'right',
                    background: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border-subtle)',
                    userSelect: 'none',
                    fontSize: 10,
                  }}>
                    {line.newLine}
                  </div>
                  <div key={`new-c-${idx}`} style={{
                    padding: '0 16px',
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {line.content || ' '}
                  </div>
                </>
              )
            }

            if (line.type === 'removed') {
              return (
                <>
                  <div key={`old-${idx}`} style={{
                    padding: '0 8px 0 4px',
                    color: 'rgba(255, 23, 68, 0.6)',
                    textAlign: 'right',
                    background: 'rgba(255, 23, 68, 0.05)',
                    borderRight: '1px solid var(--border-subtle)',
                    userSelect: 'none',
                    fontSize: 10,
                  }}>
                    {line.oldLine}
                  </div>
                  <div key={`old-c-${idx}`} style={{
                    padding: '0 16px',
                    color: 'var(--red)',
                    background: 'rgba(255, 23, 68, 0.06)',
                    borderRight: '1px solid var(--border-subtle)',
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                  }}>
                    <span style={{ opacity: 0.5, marginRight: 4 }}>-</span>
                    {line.content || ' '}
                  </div>
                  {/* Empty cells on proposed side */}
                  <div key={`new-${idx}`} style={{
                    background: 'rgba(0, 0, 0, 0.1)',
                    borderRight: '1px solid var(--border-subtle)',
                  }} />
                  <div key={`new-c-${idx}`} style={{
                    background: 'rgba(0, 0, 0, 0.1)',
                  }} />
                </>
              )
            }

            // added
            return (
              <>
                {/* Empty cells on original side */}
                <div key={`old-${idx}`} style={{
                  background: 'rgba(0, 0, 0, 0.1)',
                  borderRight: '1px solid var(--border-subtle)',
                }} />
                <div key={`old-c-${idx}`} style={{
                  background: 'rgba(0, 0, 0, 0.1)',
                  borderRight: '1px solid var(--border-subtle)',
                }} />
                <div key={`new-${idx}`} style={{
                  padding: '0 8px 0 4px',
                  color: 'rgba(0, 230, 118, 0.6)',
                  textAlign: 'right',
                  background: 'rgba(0, 230, 118, 0.05)',
                  borderRight: '1px solid var(--border-subtle)',
                  userSelect: 'none',
                  fontSize: 10,
                }}>
                  {line.newLine}
                </div>
                <div key={`new-c-${idx}`} style={{
                  padding: '0 16px',
                  color: 'var(--green)',
                  background: 'rgba(0, 230, 118, 0.06)',
                  whiteSpace: 'pre',
                  overflow: 'hidden',
                }}>
                  <span style={{ opacity: 0.5, marginRight: 4 }}>+</span>
                  {line.content || ' '}
                </div>
              </>
            )
          })}
        </div>
      </div>
    </div>
  )
}
