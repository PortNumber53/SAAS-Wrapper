import Link from 'next/link'
import { Icons } from '@/components/icons'

export function BottomStatusBar() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center space-x-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Your Company Name
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/privacy" className="text-sm hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="text-sm hover:underline">
            Terms
          </Link>
          <div className="flex items-center space-x-2">
            <Link href="#" aria-label="GitHub">
              <Icons.gitHub className="h-5 w-5" />
            </Link>
            <Link href="#" aria-label="Twitter">
              <Icons.twitter className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
