import { NextRequest, NextResponse } from 'next/server'
import { getSession, setSession } from '@/app/lib/session'

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || ''
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')
  const hmac = searchParams.get('hmac')

  if (!code || !shop || !state) {
    return NextResponse.redirect(`${APP_URL}?error=missing_params`)
  }

  // Verify state matches what we stored
  const session = await getSession()
  if (!session.oauthState || session.oauthState !== state) {
    return NextResponse.redirect(`${APP_URL}?error=invalid_state`)
  }

  // Verify HMAC signature from Shopify
  if (hmac && !verifyHmac(searchParams, SHOPIFY_API_SECRET)) {
    return NextResponse.redirect(`${APP_URL}?error=invalid_hmac`)
  }

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
    return NextResponse.redirect(`${APP_URL}?error=server_misconfigured`)
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    })

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(`${APP_URL}?error=token_exchange_failed`)
    }

    const { access_token } = await tokenRes.json()

    // Store in session
    await setSession({
      shopDomain: shop,
      accessToken: access_token,
      oauthState: undefined,
    })

    return NextResponse.redirect(`${APP_URL}?connected=1`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${APP_URL}?error=oauth_failed`)
  }
}

function verifyHmac(params: URLSearchParams, secret: string): boolean {
  try {
    const crypto = require('crypto')
    const hmacValue = params.get('hmac') || ''
    
    // Build the message string: all params except hmac, sorted
    const pairs: string[] = []
    params.forEach((value, key) => {
      if (key !== 'hmac') {
        pairs.push(`${key}=${value}`)
      }
    })
    pairs.sort()
    const message = pairs.join('&')
    
    const digest = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex')
    
    return digest === hmacValue
  } catch {
    return false
  }
}
