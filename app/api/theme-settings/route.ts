import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'

const SHOPIFY_API_VERSION = '2026-01'

const FILE_CONTENT_QUERY = `
  query ThemeSettingsFiles($themeId: ID!, $filenames: [String!]!) {
    theme(id: $themeId) {
      files(filenames: $filenames) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText {
              content
            }
          }
        }
      }
    }
  }
`

const UPSERT_MUTATION = `
  mutation ThemeFilesUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
    themeFilesUpsert(themeId: $themeId, files: $files) {
      upsertedThemeFiles {
        filename
      }
      userErrors {
        field
        message
      }
    }
  }
`

// GET /api/theme-settings?themeId=gid://shopify/OnlineStoreTheme/123
export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session.accessToken || !session.shopDomain) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const themeId = searchParams.get('themeId')

  if (!themeId) {
    return NextResponse.json({ error: 'Missing themeId' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://${session.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken,
        },
        body: JSON.stringify({
          query: FILE_CONTENT_QUERY,
          variables: {
            themeId,
            filenames: ['config/settings_schema.json', 'config/settings_data.json'],
          },
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('Theme settings fetch error:', text)
      return NextResponse.json({ error: 'Failed to fetch theme settings' }, { status: res.status })
    }

    const data = await res.json()

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0]?.message || 'GraphQL error' }, { status: 400 })
    }

    const nodes: Array<{ filename: string; body: { content?: string } }> =
      data.data?.theme?.files?.nodes || []

    const schemaNode = nodes.find(n => n.filename === 'config/settings_schema.json')
    const dataNode = nodes.find(n => n.filename === 'config/settings_data.json')

    let schema: unknown[] = []
    let settingsData: Record<string, unknown> = {}

    if (schemaNode?.body?.content) {
      try {
        schema = JSON.parse(schemaNode.body.content)
      } catch {
        console.error('Failed to parse settings_schema.json')
      }
    }

    if (dataNode?.body?.content) {
      try {
        settingsData = JSON.parse(dataNode.body.content)
      } catch {
        console.error('Failed to parse settings_data.json')
      }
    }

    return NextResponse.json({ schema, data: settingsData })
  } catch (err) {
    console.error('Theme settings GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/theme-settings
// Body: { themeId: string, settingsData: object }
export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session.accessToken || !session.shopDomain) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { themeId: string; settingsData: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { themeId, settingsData } = body

  if (!themeId || !settingsData) {
    return NextResponse.json({ error: 'Missing themeId or settingsData' }, { status: 400 })
  }

  const content = JSON.stringify(settingsData, null, 2)

  try {
    const res = await fetch(
      `https://${session.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken,
        },
        body: JSON.stringify({
          query: UPSERT_MUTATION,
          variables: {
            themeId,
            files: [
              {
                filename: 'config/settings_data.json',
                body: { type: 'TEXT', value: content },
              },
            ],
          },
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('Theme settings upsert error:', text)
      return NextResponse.json({ error: 'Failed to save theme settings' }, { status: res.status })
    }

    const data = await res.json()

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0]?.message || 'GraphQL error' }, { status: 400 })
    }

    const userErrors = data.data?.themeFilesUpsert?.userErrors || []
    if (userErrors.length > 0) {
      return NextResponse.json({ error: userErrors[0].message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Theme settings POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
