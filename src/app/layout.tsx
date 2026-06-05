import type { Metadata } from 'next'
import { Noto_Sans_SC } from 'next/font/google'
import { CircleUserRound } from 'lucide-react'
import './globals.css'

const notoSans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: '中通冷链-万能导入',
  description: '智能多格式批量下单系统',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={notoSans.className}>
        <div className="ui-shell">
          {/* 主内容区 */}
          <div className="ui-main">
            {/* 渐变顶部导航 - 鲸天系统风格 */}
            <header className="ui-topbar">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-white/80">中通冷链</div>
                  <div className="text-base font-semibold text-white">万能导入 V2</div>
                </div>
              </div>
              <div className="ui-topbar-user">
                <CircleUserRound className="h-5 w-5" />
                <span>当前用户</span>
              </div>
            </header>

            {/* 主内容 */}
            <main className="ui-page">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
