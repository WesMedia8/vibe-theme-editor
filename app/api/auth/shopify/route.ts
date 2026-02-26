import { NextRequest, NextResponse } from 'next/server'
import { setSession, updateSession } from '@/app/lib/session'
import crypto from 'crypto'

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/auth/callback`
const SCOPES = 'read_themes,write_themes'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
  }

  // Validate shop domain format
  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 })
  }

  if (!SHOPIFY_API_KEY) {
    return NextResponse.json(
      { error: 'SHOPIFY_API_KEY not configured. Please set environment variables.' },
      { status: 500 }
    )
  }

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex')

  // Store state in session
  await setSession({ oauthState: state })

  // Build Shopify OAuth URL
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  authUrl.searchParams.set('client_id', SHOPIFY_API_KEY)
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}

function isValidShopDomain(shop: string): boolean {
  // Must end in .myshopify.com or be a valid domain
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.(myshopify\.com|[a-zA-Z]{2,})$/
  return shopRegex.test(shop) && !shop.includes('..')
}
