import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'

const SHOPIFY_API_VERSION = '2026-01'

export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session.accessToken || !session.shopDomain) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const themeId = searchParams.get('themeId')
  const cursor = searchParams.get('cursor')

  if (!themeId) {
    return NextResponse.json({ error: 'Missing themeId' }, { status: 400 })
  }

  // Paginate through all files
  const allFiles: Array<{
    filename: string
    contentType: string
    size: number
    updatedAt: string
  }> = []

  let currentCursor = cursor
  let hasNextPage = true

  while (hasNextPage) {
    const query = `
      query ThemeFiles($themeId: ID!, $cursor: String) {
        theme(id: $themeId) {
          files(first: 250, after: $cursor) {
            edges {
              node {
                filename
                contentType
                size
                updatedAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `

    const res = await fetch(
      `https://${session.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken,
        },
        body: JSON.stringify({
          query,
          variables: { themeId, cursor: currentCursor || null },
        }),
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch theme files' }, { status: res.status })
    }

    const data = await res.json()

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0]?.message || 'GraphQL error' }, { status: 400 })
    }

    const filesData = data.data?.theme?.files
    if (!filesData) break

    const files = (filesData.edges || []).map((edge: {
      node: {
        filename: string
        contentType: string
        size: number
        updatedAt: string
      }
    }) => edge.node)

    allFiles.push(...files)

    hasNextPage = filesData.pageInfo?.hasNextPage || false
    currentCursor = filesData.pageInfo?.endCursor || null

    // Safety: stop after 2000 files
    if (allFiles.length >= 2000) break
  }

  return NextResponse.json({ files: allFiles })
}
