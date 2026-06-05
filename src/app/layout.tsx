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
  title: '万能导入 V2',
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
          <aside className="ui-sidebar">
            <div className="ui-card mb-6 bg-[linear-gradient(135deg,rgba(15,198,194,0.98),rgba(13,181,177,0.88))] text-white shadow-[0_20px_40px_rgba(15,198,194,0.28)]">
              <div className="ui-card-body">
                <div className="text-xs uppercase tracking-[0.32em] text-cyan-50/80">WhaleSky</div>
                <div className="mt-3 text-2xl font-semibold">万能导入 V2</div>
                <p className="mt-2 text-sm text-cyan-50/88">面向物流批量下单的智能多格式解析工作台</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-cyan-100 hover:bg-white/88 hover:text-slate-900"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto rounded-3xl border border-white/60 bg-white/72 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">规则驱动优先</div>
              <p className="mt-2 leading-6">解析逻辑只依赖规则配置，不绑定任何客户文件名或固定列头。</p>
            </div>
          </aside>

          <div className="ui-main">
            <header className="ui-topbar">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-700">智能多格式批量下单系统</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">鲸天系统导入控制台</div>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/78 px-3 py-2 shadow-sm backdrop-blur">
                <span className="text-sm text-slate-600">当前用户</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <CircleUserRound className="h-5 w-5" />
                </span>
              </div>
            </header>

            <main className="ui-page">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
