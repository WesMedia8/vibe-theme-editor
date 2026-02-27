// Shared types for Vibe Theme Editor

export type AIProvider = 'anthropic' | 'openai' | 'minimax'

export type ViewMode = 'code' | 'preview'

export interface ShopifyTheme {
  id: string
  name: string
  role: 'main' | 'unpublished' | 'development' | 'demo' | 'archived' | 'locked'
}

export function themeRoleLabel(role: string): string {
  switch (role) {
    case 'main': return '(Live)'
    case 'development': return '(Dev)'
    case 'demo': return '(Demo)'
    case 'unpublished': return '(Draft)'
    case 'archived': return '(Archived)'
    case 'locked': return '(Locked)'
    default: return ''
  }
}

export interface ThemeFile {
  filename: string
  contentType: string
  size: number
  updatedAt: string
}

export interface FileContent {
  filename: string
  content: string
}

export interface PendingChange {
  filename: string
  original: string
  proposed: string
  approved: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  fileChanges?: Array<{ filename: string; content: string }>
  isStreaming?: boolean
}

export interface AppState {
  // Auth state
  isShopifyConnected: boolean
  shopDomain: string | null
  
  // AI provider
  aiProvider: AIProvider
  aiApiKey: string | null
  
  // Theme state
  themes: ShopifyTheme[]
  selectedTheme: ShopifyTheme | null
  themeFiles: ThemeFile[]
  
  // Editor state
  openFiles: string[]
  activeFile: string | null
  fileContents: Map<string, string>
  
  // Changes
  pendingChanges: Map<string, PendingChange>
  
  // Chat
  messages: ChatMessage[]
  
  // UI
  isLoading: boolean
  error: string | null

  // View mode
  viewMode: ViewMode
}

export type FileType = 'liquid' | 'css' | 'js' | 'json' | 'svg' | 'other'

export function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'liquid') return 'liquid'
  if (ext === 'css' || ext === 'scss' || ext === 'sass') return 'css'
  if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') return 'js'
  if (ext === 'json') return 'json'
  if (ext === 'svg') return 'svg'
  return 'other'
}

export function getFileColor(type: FileType): string {
  switch (type) {
    case 'liquid': return 'var(--green)'
    case 'css': return 'var(--blue)'
    case 'js': return 'var(--yellow)'
    case 'json': return 'var(--purple)'
    case 'svg': return 'var(--cyan)'
    default: return 'var(--text-muted)'
  }
}

export function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'liquid') return 'liquid'
  if (ext === 'css') return 'css'
  if (ext === 'scss') return 'scss'
  if (ext === 'js') return 'javascript'
  if (ext === 'ts') return 'typescript'
  if (ext === 'json') return 'json'
  if (ext === 'svg') return 'xml'
  return 'markup'
}

// Shopify GID helpers
export function themeGidToId(gid: string): string {
  // "gid://shopify/OnlineStoreTheme/123456" -> "123456"
  return gid.split('/').pop() || gid
}
