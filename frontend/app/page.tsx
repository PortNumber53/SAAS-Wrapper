import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <header className="container mx-auto px-4 py-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Image 
            src="/logo.svg" 
            alt="SAAS Wrapper Logo" 
            width={120} 
            height={40} 
            className="dark:invert"
          />
        </div>
        <nav className="flex items-center gap-6">
          <Link href="#features" className="hover:text-primary">Features</Link>
          <Link href="#pricing" className="hover:text-primary">Pricing</Link>
          <Link href="/login" className="rounded-full bg-primary text-primary-foreground px-4 py-2 hover:opacity-90">
            Get Started
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 flex-grow flex flex-col justify-center text-center">
        <section className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Launch Your SAAS in Hours, Not Months
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Our comprehensive SAAS Wrapper provides everything you need to rapidly build, deploy, and scale your software service. From authentication to billing, we&apos;ve got you covered.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link 
              href="/signup" 
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-lg hover:opacity-90 transition-all"
            >
              Start Your Free Trial
            </Link>
            <Link 
              href="#features" 
              className="rounded-full border border-primary text-primary px-6 py-3 text-lg hover:bg-primary/10 transition-all"
            >
              Learn More
            </Link>
          </div>
        </section>

        <section id="features" className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-muted p-6 rounded-xl text-center">
            <h3 className="text-2xl font-semibold mb-4">Rapid Development</h3>
            <p className="text-muted-foreground">
              Pre-built components and integrations let you focus on your core product, not boilerplate code.
            </p>
          </div>
          <div className="bg-muted p-6 rounded-xl text-center">
            <h3 className="text-2xl font-semibold mb-4">Scalable Infrastructure</h3>
            <p className="text-muted-foreground">
              Built on modern cloud technologies to handle millions of users with ease and reliability.
            </p>
          </div>
          <div className="bg-muted p-6 rounded-xl text-center">
            <h3 className="text-2xl font-semibold mb-4">Complete Ecosystem</h3>
            <p className="text-muted-foreground">
              Authentication, payments, analytics, and more – all integrated and ready to use out of the box.
            </p>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p> 2024 SAAS Wrapper. All rights reserved.</p>
      </footer>
    </div>
  );
}
