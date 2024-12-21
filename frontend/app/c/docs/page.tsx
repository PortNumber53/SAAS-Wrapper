import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { 
  Book, 
  Code, 
  Settings, 
  Terminal 
} from "lucide-react"

export default function DocsPage() {
  const documentationSections = [
    {
      title: "Getting Started",
      icon: Book,
      content: [
        {
          question: "Installation",
          answer: "To get started, run `npm install our-package` in your project directory."
        },
        {
          question: "Basic Configuration",
          answer: "Configure your project by creating a `config.json` file with your specific settings."
        }
      ]
    },
    {
      title: "API Reference",
      icon: Code,
      content: [
        {
          question: "Authentication",
          answer: "Use API keys and OAuth 2.0 for secure access to our services."
        },
        {
          question: "Endpoints",
          answer: "Explore our comprehensive list of REST API endpoints for various functionalities."
        }
      ]
    },
    {
      title: "Advanced Configuration",
      icon: Settings,
      content: [
        {
          question: "Environment Variables",
          answer: "Set up environment-specific configurations for development, staging, and production."
        },
        {
          question: "Performance Tuning",
          answer: "Optimize your application with our advanced configuration options."
        }
      ]
    }
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Documentation</h1>
        <p className="text-muted-foreground">
          Comprehensive guides to help you make the most of our platform
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {documentationSections.map((section, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <section.icon className="w-10 h-10 text-primary" />
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {section.content.map((item, itemIndex) => (
                  <AccordionItem key={itemIndex} value={`item-${index}-${itemIndex}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>
                      <code className="bg-muted p-2 rounded text-sm">
                        {item.answer}
                      </code>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
