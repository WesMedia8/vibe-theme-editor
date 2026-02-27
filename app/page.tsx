'use client'

import { useState, useEffect, useCallback } from 'react'
import SetupView from './components/SetupView'
import EditorView from './components/EditorView'
import type { AppState, AIProvider, ShopifyTheme, ThemeFile, PendingChange, ChatMessage, ViewMode } from './types'

function createInitialState(): AppState {
  return {
    isShopifyConnected: false,
    shopDomain: null,
    aiProvider: 'anthropic',
    aiApiKey: null,
    themes: [],
    selectedTheme: null,
    themeFiles: [],
    openFiles: [],
    activeFile: null,
    fileContents: new Map(),
    pendingChanges: new Map(),
    messages: [],
    isLoading: false,
    error: null,
    viewMode: 'code',
  }
}

// Smart file matching: given a user prompt, find the most relevant theme files
function findRelevantFiles(prompt: string, themeFiles: ThemeFile[]): string[] {
  const lower = prompt.toLowerCase()
  const matched = new Set<string>()

  // Keyword-to-file mappings for common Shopify theme concepts
  const keywordMap: Record<string, string[]> = {
    'header': ['sections/header.liquid', 'snippets/header-*.liquid', 'layout/theme.liquid'],
    'footer': ['sections/footer.liquid', 'snippets/footer-*.liquid'],
    'nav': ['sections/header.liquid', 'snippets/header-*.liquid', 'snippets/menu-*.liquid'],
    'navigation': ['sections/header.liquid', 'snippets/header-*.liquid', 'snippets/menu-*.liquid'],
    'menu': ['sections/header.liquid', 'snippets/header-*.liquid', 'snippets/menu-*.liquid'],
    'cart': ['sections/cart-*.liquid', 'snippets/cart-*.liquid', 'templates/cart.json', 'assets/cart.js'],
    'product': ['sections/main-product.liquid', 'sections/product-*.liquid', 'snippets/product-*.liquid', 'snippets/price.liquid', 'templates/product.json'],
    'collection': ['sections/main-collection-*.liquid', 'sections/collection-*.liquid', 'templates/collection.json'],
    'announcement': ['sections/announcement-bar.liquid', 'sections/header.liquid'],
    'banner': ['sections/announcement-bar.liquid', 'sections/image-banner.liquid', 'sections/slideshow.liquid'],
    'hero': ['sections/image-banner.liquid', 'sections/slideshow.liquid', 'sections/rich-text.liquid'],
    'font': ['sections/header.liquid', 'layout/theme.liquid', 'config/settings_schema.json', 'assets/base.css'],
    'color': ['config/settings_schema.json', 'config/settings_data.json', 'assets/base.css', 'layout/theme.liquid'],
    'button': ['assets/base.css', 'assets/section-*.css', 'snippets/price.liquid'],
    'style': ['assets/base.css', 'assets/section-*.css', 'layout/theme.liquid'],
    'css': ['assets/base.css', 'assets/section-*.css'],
    'layout': ['layout/theme.liquid', 'layout/password.liquid'],
    'template': ['layout/theme.liquid'],
    'blog': ['sections/main-blog.liquid', 'sections/blog-post.liquid', 'templates/blog.json', 'templates/article.json'],
    'article': ['sections/main-article.liquid', 'templates/article.json'],
    'page': ['sections/main-page.liquid', 'templates/page.json'],
    'search': ['sections/main-search.liquid', 'templates/search.json'],
    'contact': ['sections/contact-form.liquid', 'templates/page.contact.json'],
    'login': ['templates/customers/login.json', 'sections/main-login.liquid'],
    'account': ['templates/customers/account.json', 'sections/main-account.liquid'],
    'checkout': ['layout/checkout.liquid'],
    'password': ['layout/password.liquid', 'templates/password.json'],
    '404': ['templates/404.json', 'sections/main-404.liquid'],
    'gift': ['templates/gift_card.liquid'],
    'featured': ['sections/featured-collection.liquid', 'sections/featured-product.liquid'],
    'newsletter': ['sections/newsletter.liquid', 'snippets/newsletter-*.liquid'],
    'popup': ['sections/popup.liquid', 'snippets/popup-*.liquid'],
    'slider': ['sections/slideshow.liquid', 'sections/image-banner.liquid'],
    'slideshow': ['sections/slideshow.liquid'],
    'testimonial': ['sections/testimonials.liquid', 'sections/multicolumn.liquid'],
    'image': ['sections/image-banner.liquid', 'sections/image-with-text.liquid'],
    'video': ['sections/video.liquid', 'sections/video-*.liquid'],
    'rich text': ['sections/rich-text.liquid'],
    'multicolumn': ['sections/multicolumn.liquid'],
    'collapsible': ['sections/collapsible-content.liquid'],
    'faq': ['sections/collapsible-content.liquid'],
    'settings': ['config/settings_schema.json', 'config/settings_data.json'],
    'icon': ['snippets/icon-*.liquid'],
    'social': ['snippets/social-icons.liquid', 'sections/footer.liquid'],
    'seo': ['snippets/seo.liquid', 'layout/theme.liquid'],
    'meta': ['snippets/meta-*.liquid', 'layout/theme.liquid'],
  }

  // Check each keyword
  for (const [keyword, patterns] of Object.entries(keywordMap)) {
    if (lower.includes(keyword)) {
      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          // Wildcard match
          const prefix = pattern.split('*')[0]
          for (const file of themeFiles) {
            if (file.filename.startsWith(prefix) && file.contentType !== 'ASSET' && file.size < 100000) {
              matched.add(file.filename)
            }
          }
        } else {
          // Exact match — check if file exists
          if (themeFiles.find(f => f.filename === pattern)) {
            matched.add(pattern)
          }
        }
      }
    }
  }

  // Also check if the user mentions a specific filename
  for (const file of themeFiles) {
    const basename = file.filename.split('/').pop() || ''
    const nameNoExt = basename.replace(/\.\w+$/, '')
    if (lower.includes(basename.toLowerCase()) || lower.includes(nameNoExt.toLowerCase())) {
      matched.add(file.filename)
    }
  }

  // If nothing matched, include core layout + CSS as fallback
  if (matched.size === 0) {
    const fallbacks = ['layout/theme.liquid', 'assets/base.css', 'config/settings_data.json']
    for (const f of fallbacks) {
      if (themeFiles.find(tf => tf.filename === f)) {
        matched.add(f)
      }
    }
  }

  // Limit to 10 files to avoid context overflow, prioritize .liquid and .css files
  const sorted = Array.from(matched).sort((a, b) => {
    // Prioritize files that are more likely to be relevant
    const aScore = a.endsWith('.liquid') ? 0 : a.endsWith('.css') ? 1 : a.endsWith('.json') ? 2 : 3
    const bScore = b.endsWith('.liquid') ? 0 : b.endsWith('.css') ? 1 : b.endsWith('.json') ? 2 : 3
    return aScore - bScore
  })

  return sorted.slice(0, 10)
}

export default function Home() {
  const [state, setState] = useState<AppState>(createInitialState)
  const [mounted, setMounted] = useState(false)
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)

  // Check for existing session on mount
  useEffect(() => {
    setMounted(true)
    checkSession()
    
    // Load saved provider + key from localStorage
    const storedProvider = localStorage.getItem('vte_ai_provider') as AIProvider | null
    const storedKey = localStorage.getItem('vte_ai_api_key')
    // Migration: check old key too
    const legacyKey = localStorage.getItem('vte_anthropic_key')

    setState(prev => ({
      ...prev,
      aiProvider: storedProvider || 'anthropic',
      aiApiKey: storedKey || legacyKey || null,
    }))
  }, [])

  async function checkSession() {
    try {
      const res = await fetch('/api/session')
      if (res.ok) {
        const data = await res.json()
        if (data.shopDomain) {
          setState(prev => ({
            ...prev,
            isShopifyConnected: true,
            shopDomain: data.shopDomain,
          }))
          // Load themes
          loadThemes()
        }
      }
    } catch {
      // No active session
    }
  }

  async function loadThemes() {
    try {
      const res = await fetch('/api/themes')
      if (res.ok) {
        const data = await res.json()
        setState(prev => ({
          ...prev,
          themes: data.themes || [],
          selectedTheme: data.themes?.[0] || null,
        }))
        if (data.themes?.[0]) {
          loadThemeFiles(data.themes[0])
        }
      }
    } catch (err) {
      console.error('Failed to load themes:', err)
    }
  }

  async function loadThemeFiles(theme: ShopifyTheme) {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const res = await fetch(`/api/theme-files?themeId=${encodeURIComponent(theme.id)}`)
      if (res.ok) {
        const data = await res.json()
        setState(prev => ({
          ...prev,
          themeFiles: data.files || [],
          isLoading: false,
          selectedTheme: theme,
        }))
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (err) {
      console.error('Failed to load theme files:', err)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  async function loadFileContent(filename: string) {
    if (!state.selectedTheme) return
    if (state.fileContents.has(filename)) {
      setState(prev => ({
        ...prev,
        activeFile: filename,
        openFiles: prev.openFiles.includes(filename) ? prev.openFiles : [...prev.openFiles, filename],
      }))
      return
    }

    try {
      const res = await fetch('/api/theme-file-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: state.selectedTheme.id,
          filenames: [filename],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const fileData = data.files?.[0]
        if (fileData) {
          setState(prev => {
            const newContents = new Map(prev.fileContents)
            newContents.set(filename, fileData.content)
            return {
              ...prev,
              fileContents: newContents,
              activeFile: filename,
              openFiles: prev.openFiles.includes(filename) ? prev.openFiles : [...prev.openFiles, filename],
            }
          })
        }
      }
    } catch (err) {
      console.error('Failed to load file content:', err)
    }
  }

  // Fetch multiple file contents at once (for auto-context)
  async function fetchFileContents(filenames: string[]): Promise<Array<{ filename: string; content: string }>> {
    if (!state.selectedTheme || filenames.length === 0) return []

    // Filter out files we already have cached
    const needed = filenames.filter(f => !state.fileContents.has(f))
    const cached = filenames
      .filter(f => state.fileContents.has(f))
      .map(f => ({ filename: f, content: state.fileContents.get(f)! }))

    if (needed.length === 0) return cached

    try {
      const res = await fetch('/api/theme-file-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: state.selectedTheme.id,
          filenames: needed,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const fetched: Array<{ filename: string; content: string }> = data.files || []

        // Cache the fetched files
        if (fetched.length > 0) {
          setState(prev => {
            const newContents = new Map(prev.fileContents)
            for (const f of fetched) {
              newContents.set(f.filename, f.content)
            }
            return { ...prev, fileContents: newContents }
          })
        }

        return [...cached, ...fetched]
      }
    } catch (err) {
      console.error('Failed to fetch file contents:', err)
    }

    return cached
  }

  function handleProviderChange(provider: AIProvider) {
    localStorage.setItem('vte_ai_provider', provider)
    // Clear the key when switching providers (different key formats)
    localStorage.removeItem('vte_ai_api_key')
    setState(prev => ({ ...prev, aiProvider: provider, aiApiKey: null }))
  }

  function handleApiKey(key: string) {
    localStorage.setItem('vte_ai_api_key', key)
    // Use setState callback to read the latest provider (avoids stale closure)
    setState(prev => {
      localStorage.setItem('vte_ai_provider', prev.aiProvider)
      // Clean up legacy key
      localStorage.removeItem('vte_anthropic_key')
      return { ...prev, aiApiKey: key }
    })
  }

  function handleThemeSelect(theme: ShopifyTheme) {
    loadThemeFiles(theme)
  }

  function handleFileClick(filename: string) {
    loadFileContent(filename)
  }

  function handleTabClose(filename: string) {
    setState(prev => {
      const newOpenFiles = prev.openFiles.filter(f => f !== filename)
      return {
        ...prev,
        openFiles: newOpenFiles,
        activeFile: prev.activeFile === filename
          ? (newOpenFiles[newOpenFiles.length - 1] || null)
          : prev.activeFile,
      }
    })
  }

  function handleTabClick(filename: string) {
    setState(prev => ({ ...prev, activeFile: filename }))
  }

  function handleApproveChange(filename: string) {
    setState(prev => {
      const newChanges = new Map(prev.pendingChanges)
      const change = newChanges.get(filename)
      if (change) {
        newChanges.set(filename, { ...change, approved: true })
      }
      return { ...prev, pendingChanges: newChanges }
    })
  }

  function handleRejectChange(filename: string) {
    setState(prev => {
      const newChanges = new Map(prev.pendingChanges)
      newChanges.delete(filename)
      return { ...prev, pendingChanges: newChanges }
    })
  }

  async function handlePushChanges() {
    if (!state.selectedTheme) return
    
    const approvedChanges = Array.from(state.pendingChanges.values()).filter(c => c.approved)
    if (approvedChanges.length === 0) return

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const res = await fetch('/api/push-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: state.selectedTheme!.id,
          files: approvedChanges.map(c => ({
            filename: c.filename,
            content: c.proposed,
          })),
        }),
      })

      if (res.ok) {
        setState(prev => {
          const newContents = new Map(prev.fileContents)
          const newChanges = new Map(prev.pendingChanges)
          
          approvedChanges.forEach(change => {
            newContents.set(change.filename, change.proposed)
            newChanges.delete(change.filename)
          })

          return {
            ...prev,
            fileContents: newContents,
            pendingChanges: newChanges,
            isLoading: false,
          }
        })
        // Trigger iframe refresh after successful push
        setPreviewRefreshKey(k => k + 1)
      } else {
        const err = await res.json()
        setState(prev => ({ ...prev, isLoading: false, error: err.error || 'Failed to push changes' }))
      }
    } catch (err) {
      console.error('Push failed:', err)
      setState(prev => ({ ...prev, isLoading: false, error: 'Failed to push changes' }))
    }
  }

  async function handleChatMessage(content: string) {
    if (!state.aiApiKey || !state.selectedTheme) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg, assistantMsg],
    }))

    // Auto-fetch relevant files based on the user's prompt
    const relevantFilenames = findRelevantFiles(content, state.themeFiles)

    // Also include any manually opened files
    const openFileContents = state.openFiles.slice(0, 5).map(f => ({
      filename: f,
      content: state.fileContents.get(f) || '',
    })).filter(f => f.content)

    // Merge: auto-fetched + manually opened, deduplicated
    const alreadyIncluded = new Set(openFileContents.map(f => f.filename))
    const filesToFetch = relevantFilenames.filter(f => !alreadyIncluded.has(f))

    // Fetch the auto-detected files
    const autoFetched = await fetchFileContents(filesToFetch)

    // Combine all context files
    const contextFiles = [...openFileContents, ...autoFetched]
      .filter(f => f.content)
      .slice(0, 12) // Cap at 12 files
      .map(f => ({ filename: f.filename, content: f.content.slice(0, 8000) }))

    // Build the full theme filename list
    const allThemeFilenames = state.themeFiles
      .filter(f => f.contentType !== 'ASSET' || f.filename.endsWith('.css') || f.filename.endsWith('.js'))
      .map(f => f.filename)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...state.messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          apiKey: state.aiApiKey,
          provider: state.aiProvider,
          themeFiles: contextFiles,
          allThemeFilenames,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: `Error: ${err.error || 'Failed to get response'}`, isStreaming: false }
              : m
          ),
        }))
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let fullContent = ''
      const extractedChanges: Array<{ filename: string; content: string }> = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                fullContent += parsed.delta.text
                
                // Update streaming message
                setState(prev => ({
                  ...prev,
                  messages: prev.messages.map(m =>
                    m.id === assistantMsg.id
                      ? { ...m, content: fullContent }
                      : m
                  ),
                }))
              }
            } catch {
              // Parse error, skip
            }
          }
        }
      }

      // Extract file_change blocks from the full response
      const fileChangeRegex = /<file_change>\s*([\s\S]*?)\s*<\/file_change>/g
      let match
      while ((match = fileChangeRegex.exec(fullContent)) !== null) {
        try {
          const parsed = JSON.parse(match[1])
          if (parsed.filename && parsed.content !== undefined) {
            extractedChanges.push(parsed)
          }
        } catch {
          // Invalid JSON in file_change block
        }
      }

      // Apply extracted changes as pending changes
      if (extractedChanges.length > 0) {
        setState(prev => {
          const newChanges = new Map(prev.pendingChanges)
          for (const change of extractedChanges) {
            const original = prev.fileContents.get(change.filename) || ''
            newChanges.set(change.filename, {
              filename: change.filename,
              original,
              proposed: change.content,
              approved: false,
            })
          }
          return { ...prev, pendingChanges: newChanges }
        })
      }

      // Finalize the assistant message
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content: fullContent,
                isStreaming: false,
                fileChanges: extractedChanges.length > 0 ? extractedChanges : undefined,
              }
            : m
        ),
      }))
    } catch (err) {
      console.error('Chat error:', err)
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: 'Network error. Please try again.', isStreaming: false }
            : m
        ),
      }))
    }
  }

  function handleDisconnect() {
    fetch('/api/session', { method: 'DELETE' }).catch(() => {})
    localStorage.removeItem('vte_ai_api_key')
    localStorage.removeItem('vte_ai_provider')
    localStorage.removeItem('vte_anthropic_key')
    setState(createInitialState())
  }

  function handleSettingsUpdate(provider: AIProvider, key: string) {
    localStorage.setItem('vte_ai_provider', provider)
    localStorage.setItem('vte_ai_api_key', key)
    setState(prev => ({ ...prev, aiProvider: provider, aiApiKey: key }))
  }

  function handleViewModeChange(mode: ViewMode) {
    setState(prev => ({ ...prev, viewMode: mode }))
  }

  const isReady = state.isShopifyConnected && !!state.aiApiKey

  if (!mounted) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          loading...
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <SetupView
        isShopifyConnected={state.isShopifyConnected}
        shopDomain={state.shopDomain}
        aiProvider={state.aiProvider}
        aiApiKey={state.aiApiKey}
        onProviderChange={handleProviderChange}
        onApiKey={handleApiKey}
        onShopifyConnected={() => {
          setState(prev => ({ ...prev, isShopifyConnected: true }))
          checkSession()
        }}
      />
    )
  }

  return (
    <EditorView
      state={state}
      onThemeSelect={handleThemeSelect}
      onFileClick={handleFileClick}
      onTabClose={handleTabClose}
      onTabClick={handleTabClick}
      onApproveChange={handleApproveChange}
      onRejectChange={handleRejectChange}
      onPushChanges={handlePushChanges}
      onChatMessage={handleChatMessage}
      onDisconnect={handleDisconnect}
      onSettingsUpdate={handleSettingsUpdate}
      viewMode={state.viewMode}
      onViewModeChange={handleViewModeChange}
      previewRefreshKey={previewRefreshKey}
    />
  )
}
