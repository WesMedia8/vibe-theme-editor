import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'

/**
 * Full reverse proxy for the Shopify admin theme editor.
 * Strips X-Frame-Options, CSP frame-ancestors, and other headers
 * that prevent embedding in an iframe.
 *
 * Supports both the initial HTML page and sub-resource requests
 * (JS, CSS, API calls) made by the editor once loaded.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session.accessToken || !session.shopDomain) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const targetPath = searchParams.get('path') || ''
  const themeId = searchParams.get('themeId') || ''
  const mode = searchParams.get('mode') || 'editor'

  let targetUrl: string

  if (mode === 'storefront') {
    targetUrl = `https://${session.shopDomain}`
    if (themeId) {
      targetUrl += `?preview_theme_id=${themeId}`
    }
  } else {
    if (targetPath) {
      targetUrl = `https://${session.shopDomain}${targetPath}`
    } else if (themeId) {
      targetUrl = `https://${session.shopDomain}/admin/themes/${themeId}/editor`
    } else {
      return NextResponse.json({ error: 'Missing themeId or path' }, { status: 400 })
    }
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
    }

    if (mode === 'editor') {
      headers['X-Shopify-Access-Token'] = session.accessToken
    }

    const res = await fetch(targetUrl, {
      headers,
      redirect: 'follow',
    })

    const contentType = res.headers.get('content-type') || ''

    if (!contentType.includes('text/html')) {
      const body = await res.arrayBuffer()
      return new NextResponse(body, {
        status: res.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    let html = await res.text()
    const baseUrl = `https://${session.shopDomain}`

    html = html.replace(/(src|href|action)="\/\//g, '$1="https://')
    html = html.replace(/(src|href|action)="\/(?!\/)/g, `$1="${baseUrl}/`)
    html = html.replace(/srcset="\/(?!\/)/g, `srcset="${baseUrl}/`)
    html = html.replace(/url\(\s*'\/(?!\/)/g, `url('${baseUrl}/`)
    html = html.replace(/url\(\s*"\/(?!\/)/g, `url("${baseUrl}/`)
    html = html.replace(/url\(\s*\/(?!\/)/g, `url(${baseUrl}/`)

    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}/">`)
    html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, '')
    html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi, '')

    return new NextResponse(html, {
      status: res.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error('Preview proxy error:', err)
    return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 })
  }
}
