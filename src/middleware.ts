import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: '/api/v3/:path*',
}

export function middleware(request: NextRequest) {
  const apiKey = request.headers.get('x-v3-api-key')
  const expected = process.env.V3_API_KEY

  if (!expected) {
    console.error('V3_API_KEY 未配置')
    return NextResponse.json({ error: '服务端未配置 V3_API_KEY' }, { status: 500 })
  }

  if (apiKey !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}
