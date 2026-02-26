import { NextRequest, NextResponse } from 'next/server'
import { getSession, clearSession } from '@/app/lib/session'

export async function GET() {
  const session = await getSession()
  return NextResponse.json({
    shopDomain: session.shopDomain || null,
    isConnected: !!session.accessToken,
  })
}

export async function DELETE() {
  await clearSession()
  return NextResponse.json({ success: true })
}
