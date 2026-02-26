import { cookies } from 'next/headers'

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-please-set-in-env-min-32-chars'
const COOKIE_NAME = 'vte_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

interface SessionData {
  shopDomain?: string
  accessToken?: string
  oauthState?: string
}

// Simple XOR-based obfuscation (for cookie value encoding)
// Not cryptographic - use iron-session or next-auth for production
function encode(data: string): string {
  const key = SESSION_SECRET
  let result = ''
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return Buffer.from(result, 'binary').toString('base64url')
}

function decode(encoded: string): string {
  try {
    const data = Buffer.from(encoded, 'base64url').toString('binary')
    const key = SESSION_SECRET
    let result = ''
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  } catch {
    return ''
  }
}

export async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)
  if (!cookie?.value) return {}
  try {
    const decoded = decode(cookie.value)
    return JSON.parse(decoded)
  } catch {
    return {}
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies()
  const encoded = encode(JSON.stringify(data))
  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function updateSession(updates: Partial<SessionData>): Promise<void> {
  const current = await getSession()
  await setSession({ ...current, ...updates })
}
