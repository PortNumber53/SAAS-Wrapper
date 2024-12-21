import Link from "next/link"
import { 
  GithubIcon, 
  TwitterIcon, 
  LinkedinIcon 
} from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted border-t">
      <div className="container mx-auto px-4 py-8 grid md:grid-cols-3 gap-8">
        {/* Company Info */}
        <div>
          <h3 className="text-lg font-semibold mb-4">SaaS Wrapper</h3>
          <p className="text-muted-foreground">
            Accelerating software delivery with modern, scalable solutions.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-md font-semibold mb-4">Quick Links</h4>
          <div className="grid gap-2">
            <Link 
              href="/features" 
              className="text-muted-foreground hover:text-foreground"
            >
              Features
            </Link>
            <Link 
              href="/pricing" 
              className="text-muted-foreground hover:text-foreground"
            >
              Pricing
            </Link>
            <Link 
              href="/docs" 
              className="text-muted-foreground hover:text-foreground"
            >
              Documentation
            </Link>
          </div>
        </div>

        {/* Social Links */}
        <div>
          <h4 className="text-md font-semibold mb-4">Connect</h4>
          <div className="flex space-x-4">
            <Link 
              href="https://github.com/your-org" 
              target="_blank" 
              className="text-muted-foreground hover:text-foreground"
            >
              <GithubIcon className="w-6 h-6" />
            </Link>
            <Link 
              href="https://twitter.com/your-handle" 
              target="_blank" 
              className="text-muted-foreground hover:text-foreground"
            >
              <TwitterIcon className="w-6 h-6" />
            </Link>
            <Link 
              href="https://linkedin.com/company/your-company" 
              target="_blank" 
              className="text-muted-foreground hover:text-foreground"
            >
              <LinkedinIcon className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-background border-t py-4 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} SaaS Wrapper. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
