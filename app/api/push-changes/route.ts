import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'

const SHOPIFY_API_VERSION = '2026-01'

interface FileUpdate {
  filename: string
  content: string
}

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session.accessToken || !session.shopDomain) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { themeId: string; files: FileUpdate[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { themeId, files } = body

  if (!themeId || !files || files.length === 0) {
    return NextResponse.json({ error: 'Missing themeId or files' }, { status: 400 })
  }

  // Extract numeric theme ID from GID
  const numericThemeId = themeId.split('/').pop()
  if (!numericThemeId) {
    return NextResponse.json({ error: 'Invalid theme ID' }, { status: 400 })
  }

  const results: Array<{ filename: string; success: boolean; error?: string }> = []

  // Push each file via REST API
  for (const file of files) {
    try {
      const res = await fetch(
        `https://${session.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/themes/${numericThemeId}/assets.json`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': session.accessToken,
          },
          body: JSON.stringify({
            asset: {
              key: file.filename,
              value: file.content,
            },
          }),
        }
      )

      if (res.ok) {
        results.push({ filename: file.filename, success: true })
      } else {
        const errData = await res.json().catch(() => ({}))
        const errMsg = errData.errors || `HTTP ${res.status}`
        console.error(`Failed to push ${file.filename}:`, errMsg)
        results.push({ filename: file.filename, success: false, error: String(errMsg) })
      }

      // Rate limiting: small delay between requests
      if (files.length > 1) {
        await new Promise(r => setTimeout(r, 250))
      }
    } catch (err) {
      console.error(`Error pushing ${file.filename}:`, err)
      results.push({ filename: file.filename, success: false, error: 'Network error' })
    }
  }

  const allSuccess = results.every(r => r.success)
  const anySuccess = results.some(r => r.success)

  return NextResponse.json({
    success: allSuccess,
    partial: !allSuccess && anySuccess,
    results,
  }, { status: allSuccess ? 200 : anySuccess ? 207 : 500 })
}
