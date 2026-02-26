import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'

const SHOPIFY_API_VERSION = '2026-01'

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session.accessToken || !session.shopDomain) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { themeId: string; filenames: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { themeId, filenames } = body

  if (!themeId || !filenames || filenames.length === 0) {
    return NextResponse.json({ error: 'Missing themeId or filenames' }, { status: 400 })
  }

  const query = `
    query ThemeFileContent($themeId: ID!, $filenames: [String!]!) {
      theme(id: $themeId) {
        files(filenames: $filenames) {
          nodes {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
              ... on OnlineStoreThemeFileBodyBase64 {
                contentBase64
              }
            }
          }
        }
      }
    }
  `

  try {
    const res = await fetch(
      `https://${session.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken,
        },
        body: JSON.stringify({ query, variables: { themeId, filenames } }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('File content API error:', text)
      return NextResponse.json({ error: 'Failed to fetch file content' }, { status: res.status })
    }

    const data = await res.json()

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0]?.message || 'GraphQL error' }, { status: 400 })
    }

    const nodes = data.data?.theme?.files?.nodes || []
    const files = nodes.map((node: {
      filename: string
      body: { content?: string; contentBase64?: string }
    }) => ({
      filename: node.filename,
      content: node.body?.content ?? (
        node.body?.contentBase64
          ? Buffer.from(node.body.contentBase64, 'base64').toString('utf-8')
          : ''
      ),
    }))

    return NextResponse.json({ files })
  } catch (err) {
    console.error('File content fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
