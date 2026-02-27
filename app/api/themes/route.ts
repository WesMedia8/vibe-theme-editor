import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'

const SHOPIFY_API_VERSION = '2026-01'

export async function GET() {
  const session = await getSession()

  if (!session.accessToken || !session.shopDomain) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const query = `
    query ThemeList {
      themes(first: 50, reverse: true) {
        edges {
          node {
            id
            name
            role
            createdAt
            updatedAt
            processing
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
        body: JSON.stringify({ query }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('Themes API error:', text)
      return NextResponse.json({ error: 'Failed to fetch themes' }, { status: res.status })
    }

    const data = await res.json()

    if (data.errors) {
      console.error('GraphQL errors:', data.errors)
      return NextResponse.json({ error: data.errors[0]?.message || 'GraphQL error' }, { status: 400 })
    }

    const themes = (data.data?.themes?.edges || []).map((edge: {
      node: { id: string; name: string; role: string; createdAt: string; updatedAt: string; processing: boolean }
    }) => ({
      id: edge.node.id,
      name: edge.node.name,
      role: edge.node.role.toLowerCase(),
      createdAt: edge.node.createdAt,
      updatedAt: edge.node.updatedAt,
      processing: edge.node.processing,
    }))

    themes.sort((a: { role: string; updatedAt: string }, b: { role: string; updatedAt: string }) => {
      if (a.role === 'main' && b.role !== 'main') return -1
      if (b.role === 'main' && a.role !== 'main') return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return NextResponse.json({ themes })
  } catch (err) {
    console.error('Themes fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
