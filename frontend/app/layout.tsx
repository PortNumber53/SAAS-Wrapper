import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/app/auth"
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-sans',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'SaaS Wrapper',
  description: 'Modern SaaS platform built with Next.js and Cloudflare',
  icons: {
    icon: '/favicon.ico'
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider session={session}>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow pt-16 pb-16">
                {children}
              </main>
              <Footer />
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
