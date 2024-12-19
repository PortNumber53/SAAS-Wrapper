import React from 'react'
import { TopToolbar } from './top-toolbar'
import { BottomStatusBar } from './bottom-status-bar'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopToolbar />
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>
      <BottomStatusBar />
    </div>
  )
}
