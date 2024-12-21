import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HomeIcon, SearchIcon } from "lucide-react"

export const runtime = "edge"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="max-w-md w-full text-center">
        <div className="text-9xl font-bold text-primary/10 mb-4">404</div>
        <h1 className="text-3xl font-semibold text-foreground mb-4">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          Oops! The page you are looking for seems to have wandered off into the digital wilderness.
        </p>
        
        <div className="flex justify-center space-x-4">
          <Link href="/">
            <Button variant="default" size="lg">
              <HomeIcon className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline" size="lg">
              <SearchIcon className="mr-2 h-4 w-4" />
              Search Site
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
