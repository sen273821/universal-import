'use client'

import { useEffect, useState } from 'react'
import { FileArchive, FileText, PackageSearch } from 'lucide-react'

const navItems = [
  { href: '#file-import', label: '文件导入', icon: FileArchive },
  { href: '#template-rules', label: '模版规则维护', icon: FileText },
  { href: '#order-history', label: '已导入运单', icon: PackageSearch },
]

export default function SidebarNav() {
  const [activeHash, setActiveHash] = useState('#file-import')

  useEffect(() => {
    setActiveHash(window.location.hash || '#file-import')
    const onHash = () => setActiveHash(window.location.hash || '#file-import')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <nav className="ui-sidebar-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = activeHash === item.href
        return (
          <a
            key={item.href}
            href={item.href}
            className={`ui-sidebar-item${isActive ? ' active' : ''}`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
