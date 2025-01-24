import { xata } from "@/lib/xata";

const INTEGRATION_STATUS_KEY = "integrationStatus";

interface IntegrationStatus {
  stripe?: boolean;
  instagram?: boolean;
}

export async function fetchIntegrationStatus(): Promise<IntegrationStatus> {
  try {
    const response = await fetch("/api/integrations/status");
    if (!response.ok) {
      throw new Error("Failed to fetch integration status");
    }

    const status = (await response.json()) as IntegrationStatus;

    // Store in localStorage for quick access
    if (typeof window !== "undefined") {
      localStorage.setItem(INTEGRATION_STATUS_KEY, JSON.stringify(status));
    }

    return status;
  } catch (error) {
    console.error("Error fetching integration status:", error);
    return { stripe: false, instagram: false };
  }
}

export function getStoredIntegrationStatus(): IntegrationStatus {
  if (typeof window === "undefined") {
    return { stripe: false, instagram: false };
  }

  try {
    const stored = localStorage.getItem(INTEGRATION_STATUS_KEY);
    return stored ? JSON.parse(stored) : { stripe: false, instagram: false };
  } catch {
    return { stripe: false, instagram: false };
  }
}

export function updateStoredIntegrationStatus(
  status: Partial<IntegrationStatus>
) {
  if (typeof window === "undefined") return;

  const current = getStoredIntegrationStatus();
  const updated = { ...current, ...status };
  localStorage.setItem(INTEGRATION_STATUS_KEY, JSON.stringify(updated));
  return updated;
}
