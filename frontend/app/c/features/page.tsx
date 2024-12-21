import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  CheckCircle2, 
  Rocket, 
  Shield, 
  Zap 
} from "lucide-react"

export default function FeaturesPage() {
  const features = [
    {
      icon: Rocket,
      title: "Rapid Deployment",
      description: "Deploy your applications faster with our streamlined infrastructure."
    },
    {
      icon: Shield,
      title: "Advanced Security",
      description: "Enterprise-grade security with end-to-end encryption and multi-factor authentication."
    },
    {
      icon: Zap,
      title: "High Performance",
      description: "Optimized for speed and scalability, handling millions of requests seamlessly."
    },
    {
      icon: CheckCircle2,
      title: "Comprehensive Monitoring",
      description: "Real-time analytics and insights into your application's performance."
    }
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Product Features</h1>
        <p className="text-muted-foreground">
          Powerful tools designed to accelerate your workflow and enhance productivity
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <feature.icon className="w-10 h-10 text-primary" />
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
