import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CloudIcon, 
  CodeIcon, 
  DatabaseIcon, 
  LockIcon, 
  RocketIcon, 
  UsersIcon 
} from "lucide-react"

export const runtime = 'edge';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-foreground">
            SaaS Wrapper: Accelerate Your Software Delivery
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform that simplifies and streamlines your SaaS development, 
            from prototype to production, with powerful integrations and scalable infrastructure.
          </p>
          <div className="flex justify-center space-x-4">
            <Button size="lg" variant="default">
              Get Started
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-x-4">
              <CodeIcon className="w-8 h-8 text-primary" />
              <CardTitle>Rapid Development</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Accelerate your development with pre-built components, 
                 authentication flows, and seamless integrations.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-x-4">
              <CloudIcon className="w-8 h-8 text-primary" />
              <CardTitle>Cloud Native</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Deploy instantly to Cloudflare Pages with built-in 
                 edge runtime support and global scalability.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-x-4">
              <DatabaseIcon className="w-8 h-8 text-primary" />
              <CardTitle>Database Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Seamless database management with Xata, 
                 providing type-safe and scalable data solutions.</p>
            </CardContent>
          </Card>
        </div>

        {/* Key Capabilities */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8">Key Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <UsersIcon className="mx-auto w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">Authentication</h3>
              <p>Google OAuth and secure session management out of the box.</p>
            </div>
            <div>
              <RocketIcon className="mx-auto w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">Deployment</h3>
              <p>One-click deployments to Cloudflare with zero configuration.</p>
            </div>
            <div>
              <LockIcon className="mx-auto w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">Security</h3>
              <p>Built-in security best practices and edge runtime protection.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
