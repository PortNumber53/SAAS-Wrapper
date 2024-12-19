import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { 
  ArrowRight,
  CheckCircle2, 
  Sparkles,
  Zap 
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-6 py-2 mb-4">
              <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Launching our new platform
              </span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight max-w-3xl text-gray-900">
              Build Better Software Faster with Our Platform
            </h1>
            
            <p className="text-xl text-gray-700 max-w-2xl">
              Streamline your development workflow with our modern tools and intuitive interface. 
              Experience the future of software development.
            </p>

            <div className="flex items-center gap-4 pt-4">
              <Button size="lg" className="h-12 px-6 bg-blue-600 hover:bg-blue-700">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 border-gray-300 text-gray-700 hover:bg-gray-50">
                View Demo
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-8 text-gray-700">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                <span>Free Trial</span>
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                <span>No Credit Card</span>
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-100">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="rounded-full w-12 h-12 flex items-center justify-center bg-blue-100 mb-4">
                    <Zap className="h-6 w-6 text-blue-700" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-700">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <p className="text-center text-gray-700 mb-12 text-lg">
            Trusted by leading companies worldwide
          </p>
          <div className="flex justify-center items-center gap-12 opacity-80">
            <Image 
              src="/vercel.svg" 
              alt="Vercel" 
              width={120} 
              height={40} 
              className="h-8 object-contain filter grayscale" 
            />
            <Image 
              src="/next.svg" 
              alt="Next.js" 
              width={120} 
              height={40} 
              className="h-8 object-contain filter grayscale" 
            />
            <div className="text-xl font-bold text-gray-600">
              Company
            </div>
            <div className="text-xl font-bold text-gray-600">
              Enterprise
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    title: "Lightning Fast",
    description: "Experience unparalleled speed and performance with our optimized platform."
  },
  {
    title: "Highly Secure",
    description: "Enterprise-grade security to keep your data safe and protected."
  },
  {
    title: "Easy to Scale",
    description: "Grow your application without worrying about infrastructure limitations."
  }
];
