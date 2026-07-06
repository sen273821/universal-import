import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'

export const runtime = 'nodejs'

/** POST /api/v3/orders/:externalCode/exception
 *  V3 回写"该运单是否存在未关闭异常"
 *  Body: { hasOpenException: boolean }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ externalCode: string }> }) {
  try {
    const { externalCode } = await params
    const body = await request.json()
    const hasOpenException = Boolean(body.hasOpenException)

    await db.order.updateMany({
      where: { externalCode },
      data: { hasOpenException },
    })

    return NextResponse.json({ success: true, externalCode, hasOpenException })
  } catch (error) {
    console.error('V3 回写异常标记失败', error)
    return NextResponse.json({ error: '回写失败' }, { status: 500 })
  }
}
