'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ChatMessage, AIProvider } from '../types'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  isStreaming: boolean
  pendingCount: number
  approvedCount: number
  onPushChanges: () => void
  isPushing: boolean
  selectedThemeName: string | null
  aiProvider: AIProvider
}

const EXAMPLE_PROMPTS = [
  "Make the header background dark navy with white text",
  "Add a sticky announcement bar at the top in amber",
  "Make all buttons have rounded corners and a subtle shadow",
  "Show me the current header.liquid file",
]

const PROVIDER_DISPLAY: Record<AIProvider, { label: string; color: string }> = {
  anthropic: { label: 'claude', color: 'var(--cyan)' },
  openai: { label: 'gpt-4o', color: '#10a37f' },
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isStreaming,
  pendingCount,
  approvedCount,
  onPushChanges,
  isPushing,
  selectedThemeName,
  aiProvider,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    onSendMessage(text)
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div style={{
      width: 'var(--chat-width)',
      flexShrink: 0,
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: PROVIDER_DISPLAY[aiProvider].color,
          boxShadow: `0 0 6px ${PROVIDER_DISPLAY[aiProvider].color}`,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '0.05em',
          fontFamily: 'var(--font-mono)',
        }}>
          {PROVIDER_DISPLAY[aiProvider].label}
        </span>
        {selectedThemeName && (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            \u00b7 {selectedThemeName}
          </span>
        )}
      </div>

      {/* Messages area */}
      <div className="scroll-area" style={{ flex: 1, padding: '16px' }}>
        {messages.length === 0 ? (
          <EmptyState onPromptClick={text => {
            setInput(text)
            textareaRef.current?.focus()
          }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Pending changes bar */}
      {(pendingCount > 0 || approvedCount > 0) && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {approvedCount > 0 && (
                <span style={{ color: 'var(--green)' }}>
                  {approvedCount} approved
                </span>
              )}
              {approvedCount > 0 && pendingCount - approvedCount > 0 && (
                <span style={{ color: 'var(--text-muted)' }}> \u00b7 </span>
              )}
              {pendingCount - approvedCount > 0 && (
                <span style={{ color: 'var(--amber)' }}>
                  {pendingCount - approvedCount} pending review
                </span>
              )}
            </div>
            {approvedCount > 0 && (
              <button
                className="btn btn-primary"
                onClick={onPushChanges}
                disabled={isPushing}
                style={{ fontSize: 11, padding: '5px 10px' }}
              >
                {isPushing ? 'Pushing...' : `Push to Shopify (${approvedCount})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          transition: 'border-color 0.15s ease',
        }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = 'var(--cyan)'
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--cyan-muted)'
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = 'var(--border-default)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? `${aiProvider === 'openai' ? 'GPT' : 'Claude'} is thinking...` : 'Describe a theme change...'}
            disabled={isStreaming}
            rows={2}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              padding: '10px 12px 4px',
              lineHeight: 1.5,
              display: 'block',
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px 8px',
          }}>
            <span style={{
              fontSize: 10,
              color: 'var(--text-disabled)',
              fontFamily: 'var(--font-mono)',
            }}>
              Enter to send \u00b7 Shift+Enter for newline
            </span>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              style={{
                background: input.trim() && !isStreaming ? 'var(--cyan)' : 'var(--bg-overlay)',
                border: 'none',
                borderRadius: 6,
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                padding: '5px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: input.trim() && !isStreaming ? 'var(--bg-void)' : 'var(--text-disabled)',
                fontSize: 11,
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              {isStreaming ? (
                <>
                  <StreamingDots />
                </>
              ) : (
                <>
                  Send
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M1 5.5h9M6.5 2L10 5.5 6.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        <div style={{
          marginTop: 6,
          fontSize: 10,
          color: 'var(--text-disabled)',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
        }}>
          powered by {aiProvider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4'}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  
  // Remove file_change blocks from display
  const displayContent = message.content
    .replace(/<file_change>[\s\S]*?<\/file_change>/g, '')
    .trim()

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 6,
      }}
    >
      {/* Role label */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: isUser ? 'var(--text-muted)' : 'var(--cyan)',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-mono)',
      }}>
        {isUser ? 'you' : 'ai'}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '90%',
        background: isUser ? 'var(--bg-overlay)' : 'var(--bg-elevated)',
        border: `1px solid ${isUser ? 'var(--border-default)' : 'var(--border-default)'}`,
        borderRadius: isUser ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
        padding: '10px 14px',
        fontSize: 13,
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}>
        {displayContent}
        {message.isStreaming && (
          <span className="typing-cursor" />
        )}
      </div>

      {/* File change badges */}
      {message.fileChanges && message.fileChanges.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: '90%' }}>
          {message.fileChanges.map(fc => (
            <div
              key={fc.filename}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'var(--amber-muted)',
                border: '1px solid rgba(255, 184, 0, 0.2)',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 10,
                color: 'var(--amber)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1 8L8 1M8 1H4.5M8 1V4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {fc.filename}
            </div>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div style={{
        fontSize: 9,
        color: 'var(--text-disabled)',
        fontFamily: 'var(--font-mono)',
      }}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}

function EmptyState({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '24px 16px',
      gap: 24,
    }}>
      {/* Icon */}
      <div style={{
        width: 48,
        height: 48,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9" stroke="var(--cyan)" strokeWidth="1.2" strokeOpacity="0.5"/>
          <path d="M7 11h8M11 7v8" stroke="var(--cyan)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <div style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--cyan-muted) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 6,
        }}>
          Ask AI to edit your theme
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          Open files from the sidebar, then describe<br/>changes in natural language.
        </div>
      </div>

      {/* Example prompts */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'var(--text-disabled)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
          marginBottom: 2,
        }}>
          Try asking:
        </div>
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onPromptClick(prompt)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
            }}
          >
            &ldquo;{prompt}&rdquo;
          </button>
        ))}
      </div>
    </div>
  )
}

function StreamingDots() {
  return (
    <div style={{ display: 'flex', gap: 3, padding: '0 2px' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'currentColor',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
