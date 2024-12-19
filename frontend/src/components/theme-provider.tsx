"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Aggressive theme forcing
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
    document.body.classList.add('light')
    document.body.classList.remove('dark')
    
    // Optional: Override localStorage theme
    try {
      localStorage.setItem('theme', 'light')
    } catch (e) {
      console.error('Could not set theme in localStorage', e)
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <NextThemesProvider 
      {...props} 
      defaultTheme="light" 
      forcedTheme="light"
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  )
}
