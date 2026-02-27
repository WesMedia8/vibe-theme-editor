import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MINIMAX_API_URL = 'https://api.minimax.io/v1/chat/completions'

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'
const DEFAULT_OPENAI_MODEL = 'gpt-4o'
const DEFAULT_MINIMAX_MODEL = 'MiniMax-M2.5'

interface FileContext {
  filename: string
  content: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type Provider = 'anthropic' | 'openai' | 'minimax'

function buildSystemPrompt(themeFiles: FileContext[]): string {
  let prompt = `You are an expert Shopify theme developer with deep knowledge of Liquid templating, CSS, JavaScript, and Shopify's theme architecture.

You help users modify their Shopify theme files through natural language conversation. You understand all aspects of:
- Shopify Liquid templating language
- Dawn theme structure and sections
- Theme customization best practices
- CSS/SCSS for Shopify themes
- JavaScript (vanilla, Alpine.js, custom elements)
- Schema JSON for section settings
- Theme locales and translations

## How to respond

When the user asks for theme changes:

1. **Explain** what you're going to do and why
2. **Provide the complete modified file** in a structured block:

<file_change>
{"filename": "sections/header.liquid", "content": "...COMPLETE FILE CONTENT HERE..."}
</file_change>

**CRITICAL RULES:**
- Always include the COMPLETE file content \u2014 never partial snippets with \"...\" placeholders
- You can include multiple <file_change> blocks if modifying multiple files
- If you need to see a file's content that hasn't been shared, ask the user to open it first
- Preserve all existing functionality unless explicitly asked to change it
- Include helpful inline comments explaining significant changes

## When NOT to provide file_change blocks
- Explaining concepts or architecture
- Answering questions that don't require file edits
- Asking for clarification before proceeding`

  if (themeFiles.length > 0) {
    prompt += `\n\n## Currently Open Files\n\nThe user has these theme files open:\n\n`
    for (const file of themeFiles) {
      prompt += `### ${file.filename}\n\`\`\`\n${file.content.slice(0, 6000)}${file.content.length > 6000 ? '\n... (truncated)' : ''}\n\`\`\`\n\n`
    }
  } else {
    prompt += `\n\n## Note\nNo theme files are currently open. Ask the user to click on files in the sidebar to share their content, so you can make targeted edits.`
  }

  return prompt
}

async function handleAnthropic(apiKey: string, model: string, systemPrompt: string, messages: Message[]) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    const errMsg = (errData as { error?: { message?: string } }).error?.message || `Anthropic API error: ${res.status}`
    
    if (res.status === 401) {
      return NextResponse.json({ error: 'Invalid API key. Please check your Anthropic API key.' }, { status: 401 })
    }
    if (res.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again in a moment.' }, { status: 429 })
    }
    
    return NextResponse.json({ error: errMsg }, { status: res.status })
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    try {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        await writer.write(encoder.encode(chunk))
      }
    } catch (err) {
      console.error('Anthropic stream error:', err)
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

async function handleOpenAICompatible(apiKey: string, model: string, systemPrompt: string, messages: Message[], apiUrl: string, providerName: string) {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      stream: true,
    }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    const errMsg = (errData as { error?: { message?: string } }).error?.message || `${providerName} API error: ${res.status}`

    if (res.status === 401) {
      return NextResponse.json({ error: `Invalid API key. Please check your ${providerName} API key.` }, { status: 401 })
    }
    if (res.status === 429) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again in a moment.' }, { status: 429 })
    }

    return NextResponse.json({ error: errMsg }, { status: res.status })
  }

  // Transform OpenAI-compatible SSE format to Anthropic format so the client parser works uniformly
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  ;(async () => {
    try {
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              await writer.write(encoder.encode('data: [DONE]\n\n'))
              continue
            }
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta
              if (delta?.content) {
                const anthropicEvent = {
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text: delta.content },
                }
                await writer.write(encoder.encode(`data: ${JSON.stringify(anthropicEvent)}\n\n`))
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
    } catch (err) {
      console.error(`${providerName} stream error:`, err)
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function POST(request: NextRequest) {
  let body: {
    messages: Message[]
    apiKey: string
    themeFiles?: FileContext[]
    model?: string
    provider?: Provider
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages, apiKey, themeFiles = [], provider = 'anthropic' } = body

  let model = body.model
  if (!model) {
    if (provider === 'openai') model = DEFAULT_OPENAI_MODEL
    else if (provider === 'minimax') model = DEFAULT_MINIMAX_MODEL
    else model = DEFAULT_ANTHROPIC_MODEL
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 400 })
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  const systemPrompt = buildSystemPrompt(themeFiles)

  try {
    if (provider === 'openai') {
      return await handleOpenAICompatible(apiKey, model, systemPrompt, messages, OPENAI_API_URL, 'OpenAI')
    } else if (provider === 'minimax') {
      return await handleOpenAICompatible(apiKey, model, systemPrompt, messages, MINIMAX_API_URL, 'MiniMax')
    } else {
      return await handleAnthropic(apiKey, model, systemPrompt, messages)
    }
  } catch (err) {
    console.error('Chat API error:', err)
    const name = provider === 'openai' ? 'OpenAI' : provider === 'minimax' ? 'MiniMax' : 'Anthropic'
    return NextResponse.json({ error: `Failed to connect to ${name} API` }, { status: 500 })
  }
}
