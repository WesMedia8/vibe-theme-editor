import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'

/**
 * Server-side proxy that fetches the Shopify storefront HTML.
 * This bypasses X-Frame-Options / CSP restrictions since the fetch
 * happens server-side and we serve the HTML to the client ourselves.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session.accessToken || !session.shopDomain) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const themeId = searchParams.get('themeId') // numeric theme ID for non-live themes

  // Build the storefront URL
  let storeUrl = `https://${session.shopDomain}`
  if (themeId) {
    storeUrl += `?preview_theme_id=${themeId}`
  }

  try {
    const res = await fetch(storeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch storefront: ${res.status}` },
        { status: res.status }
      )
    }

    let html = await res.text()

    const baseUrl = `https://${session.shopDomain}`

    // Rewrite relative URLs to absolute so assets load correctly inside srcdoc
    // Handle protocol-relative URLs
    html = html.replace(/(src|href|action)="\/\//g, '$1="https://')

    // Handle root-relative URLs (but not protocol-relative ones already handled)
    html = html.replace(
      /(src|href|action)="\/(?!\/)/g,
      `$1="${baseUrl}/`
    )

    // Handle srcset with root-relative URLs
    html = html.replace(
      /srcset="\/(?!\/)/g,
      `srcset="${baseUrl}/`
    )

    // Handle CSS url() with root-relative paths
    html = html.replace(
      /url\(\s*'\/(?!\/)/g,
      `url('${baseUrl}/`
    )
    html = html.replace(
      /url\(\s*"\/(?!\/)/g,
      `url("${baseUrl}/`
    )
    html = html.replace(
      /url\(\s*\/(?!\/)/g,
      `url(${baseUrl}/`
    )

    // Inject a <base> tag to catch anything we missed
    html = html.replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${baseUrl}/" target="_blank">`
    )

    // Remove any X-Frame-Options meta equiv headers in the HTML
    html = html.replace(
      /<meta[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi,
      ''
    )

    // Disable navigation inside the preview — links open in new tabs
    // And add a small overlay indicator
    const injectedScript = `
<script>
  // Make all link clicks open in new tab instead of navigating the iframe
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (link && link.href) {
      e.preventDefault();
      window.open(link.href, '_blank');
    }
  }, true);

  // Disable form submissions inside preview
  document.addEventListener('submit', function(e) {
    e.preventDefault();
  }, true);
</script>
`
    html = html.replace('</body>', injectedScript + '</body>')

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    console.error('Preview proxy error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch storefront preview' },
      { status: 500 }
    )
  }
}
