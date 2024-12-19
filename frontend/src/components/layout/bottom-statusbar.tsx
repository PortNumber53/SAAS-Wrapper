import Link from 'next/link'
import { 
  Github, 
  Twitter, 
  Linkedin, 
  Copyright 
} from 'lucide-react'

export function BottomStatusBar() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50/50 py-6">
      <div className="container max-w-screen-2xl px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Copyright and Company Info */}
          <div className="flex items-center text-gray-600 space-x-2">
            <Copyright className="h-4 w-4" />
            <span className="text-sm">
              2024 Your Company. All rights reserved.
            </span>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-4">
            <Link 
              href="https://github.com/your-company" 
              target="_blank" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Github className="h-5 w-5" />
            </Link>
            <Link 
              href="https://twitter.com/your-company" 
              target="_blank" 
              className="text-gray-600 hover:text-blue-500 transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </Link>
            <Link 
              href="https://linkedin.com/company/your-company" 
              target="_blank" 
              className="text-gray-600 hover:text-blue-700 transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </Link>
          </div>

          {/* Quick Links */}
          <div className="flex items-center space-x-4 text-sm">
            <Link 
              href="/privacy" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Privacy
            </Link>
            <Link 
              href="/terms" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
