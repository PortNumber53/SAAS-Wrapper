"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { usePageTitle } from "@/lib/page-title-context";
import { Plug } from "lucide-react";
import { StripeIntegration } from "@/components/integrations/stripe-integration";
import { InstagramIntegration } from "@/components/integrations/instagram-integration";

export const runtime = "edge";

export default function IntegrationsPage() {
  const { data: session } = useSession();
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    setPageTitle("Integrations", Plug);
  }, [setPageTitle]);

  if (!session) {
    redirect("/login");
  }

  const [activeIntegration, setActiveIntegration] = useState<string | null>(
    null
  );

  const handleIntegrationSelect = (id: string) => {
    setActiveIntegration(id);
  };

  const integrations = [
    {
      id: "stripe",
      name: "Stripe",
      description: "Payment processing and billing",
      icon: "/icons/stripe.svg",
      component: StripeIntegration,
    },
    {
      id: "instagram",
      name: "Instagram",
      description: "Connect your Instagram feed and showcase your content",
      icon: "/icons/instagram.svg",
      component: InstagramIntegration,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="gnome-header">Integrations</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <button
            key={integration.id}
            type="button"
            className={`gnome-card hover:shadow-gnome transition-all duration-200 cursor-pointer text-left ${
              activeIntegration === integration.id
                ? "ring-2 ring-gnome-blue ring-offset-2"
                : ""
            }`}
            onClick={() => handleIntegrationSelect(integration.id)}
          >
            <img
              src={integration.icon}
              alt={integration.name}
              className="w-12 h-12 mb-4"
            />
            <h2 className="text-lg font-semibold text-gnome-dark dark:text-white">
              {integration.name}
            </h2>
            <p className="text-gnome-dark/70 dark:text-white/70">
              {integration.description}
            </p>
          </button>
        ))}
      </div>

      {activeIntegration && (
        <div className="mt-8 gnome-card">
          {(() => {
            const Integration = integrations.find(
              (i) => i.id === activeIntegration
            )?.component;
            return Integration ? <Integration /> : null;
          })()}
        </div>
      )}
    </div>
  );
}
