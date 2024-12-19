import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  NavigationMenu, 
  NavigationMenuList, 
  NavigationMenuItem, 
  NavigationMenuLink
} from '@/components/ui/navigation-menu'
import { ModeToggle } from '@/components/mode-toggle'

export function TopToolbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3">
            <span className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              Your Logo
            </span>
          </Link>
          
          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink 
                  href="/features" 
                  className="px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md font-medium transition-colors"
                >
                  Features
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink 
                  href="/pricing" 
                  className="px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md font-medium transition-colors"
                >
                  Pricing
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:block">
            <Button 
              variant="ghost" 
              className="text-gray-700 hover:text-blue-600 hover:bg-gray-100 font-medium"
            >
              Contact
            </Button>
          </div>
          <ModeToggle />
          <Button 
            variant="outline" 
            className="border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-blue-500 transition-colors"
          >
            Sign In
          </Button>
        </div>
      </div>
    </header>
  )
}
