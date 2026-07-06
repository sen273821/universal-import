import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** GET /api/v3/health
 *  V3 健康检查接口
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'v2-v3-bridge', timestamp: new Date().toISOString() })
}
