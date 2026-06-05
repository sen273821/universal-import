import type { Metadata } from 'next'
import Link from 'next/link'
import { Noto_Sans_SC } from 'next/font/google'
import { CircleUserRound, FileArchive, Files, PackageSearch } from 'lucide-react'
import './globals.css'

const notoSans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: '中通冷链-万能导入',
  description: '智能多格式批量下单系统',
}

const navItems = [
  { href: '#file-import', label: '文件导入', icon: FileArchive },
  { href: '#rule-center', label: '规则管理', icon: Files },
  { href: '#order-history', label: '已导入运单', icon: PackageSearch },
]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={notoSans.className}>
        <div className="ui-shell">
          {/* 深色侧边栏 - 鲸天系统风格 */}
          <aside className="ui-sidebar">
            <div className="ui-sidebar-logo">
              <div className="text-center">
                <div className="text-xs tracking-[0.2em] text-white/60">中通冷链</div>
                <div className="text-lg font-semibold text-white">万能导入 V2</div>
              </div>
            </div>

            <nav className="ui-sidebar-nav">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="ui-sidebar-item"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="text-xs text-white/50">面向物流批量下单的智能多格式解析工作台</div>
            </div>
          </aside>

          {/* 主内容区 */}
          <div className="ui-main">
            {/* 渐变顶部导航 - 鲸天系统风格 */}
            <header className="ui-topbar">
              <div className="ui-topbar-title">万能导入控制台</div>
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
