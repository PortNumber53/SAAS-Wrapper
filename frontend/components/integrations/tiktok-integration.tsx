"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { updateStoredIntegrationStatus } from "@/lib/integration-utils";
import { CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { LogOut } from "lucide-react";
import { LogIn } from "lucide-react";

interface TikTokIntegrationResponse {
  integration: {
    accessToken?: string;
    username?: string;
    is_active: boolean;
  } | null;
}

interface TikTokIntegrationErrorResponse {
  error?: string;
}

interface TikTokAuthUrlResponse {
  authUrl: string;
}

export function TikTokIntegration() {
  const { toast } = useToast();
  const [tiktokSettings, setTiktokSettings] = useState({
    accessToken: "",
    username: "",
    is_active: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTikTokSettings = async () => {
      try {
        const response = await fetch("/api/integrations/tiktok");
        const data = (await response.json()) as TikTokIntegrationResponse;

        if (!response.ok) {
          throw new Error("Failed to fetch TikTok settings");
        }

        if (data.integration) {
          setTiktokSettings((prev) => ({
            ...prev,
            accessToken: data.integration?.accessToken || "",
            username: data.integration?.username || "",
            is_active: data.integration?.is_active || false,
          }));
        }
      } catch (error) {
        console.error("Error fetching TikTok settings:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load TikTok settings",
          variant: "destructive",
        });
      }
    };

    fetchTikTokSettings();
  }, [toast]);

  const handleTikTokAuth = async () => {
    try {
      const response = await fetch("/api/integrations/tiktok/auth-url");
      const data = (await response.json()) as TikTokAuthUrlResponse;

      if (!response.ok) {
        throw new Error("Failed to get authentication URL");
      }

      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error starting TikTok auth:", error);
      toast({
        title: "Error",
        description: "Failed to start TikTok authentication",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (checked: boolean) => {
    setTiktokSettings((prev) => ({ ...prev, is_active: checked }));

    try {
      const response = await fetch("/api/integrations/tiktok/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: checked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update integration status");
      }

      updateStoredIntegrationStatus({ tiktok: checked });

      toast({
        title: "TikTok",
        description: `Integration ${
          checked ? "enabled" : "disabled"
        } successfully`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      setTiktokSettings((prev) => ({ ...prev, is_active: !checked }));
      toast({
        title: "Error",
        description: "Failed to update integration status",
        variant: "destructive",
      });
    }
  };

  const disconnectTikTok = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/integrations/tiktok/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect TikTok account");
      }

      setTiktokSettings({
        accessToken: "",
        username: "",
        is_active: false,
      });

      updateStoredIntegrationStatus({ tiktok: false });

      toast({
        title: "TikTok",
        description: "Successfully disconnected TikTok account",
      });
    } catch (error) {
      console.error("Error disconnecting TikTok:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect TikTok account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    handleTikTokAuth();
  };

  const handleDisconnect = async () => {
    disconnectTikTok();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="TikTok"
          >
            <path d="M19.321 5.562a5.122 5.122 0 0 1-.443-.258 6.228 6.228 0 0 1-1.138-.924c-1.467-1.467-1.875-3.174-1.924-3.693h.004A.876.876 0 0 1 15 0h-3.654v12.579c0 1.556-1.265 2.821-2.821 2.821s-2.821-1.265-2.821-2.821 1.265-2.821 2.821-2.821c.177 0 .349.016.518.045v-3.731a6.586 6.586 0 0 0-.518-.02C5.149 6.052 2.5 8.701 2.5 12.077s2.649 6.025 5.925 6.025 5.925-2.649 5.925-5.925V7.871c1.301.926 2.851 1.475 4.45 1.475V5.746a5.44 5.44 0 0 1-3.004-.91c.063.024.127.047.192.069.079.025.157.051.236.074.087.025.175.048.264.069.069.016.139.03.209.043.084.016.169.029.254.041.073.01.146.019.22.027.087.009.175.015.264.019.073.003.145.005.219.005V2.5" />
          </svg>
          TikTok
        </CardTitle>
        <CardDescription>
          Connect your TikTok account to automatically publish content.
        </CardDescription>
        {tiktokSettings.username && (
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium">Connected Account:</span>{" "}
            <a
              href={`https://tiktok.com/@${tiktokSettings.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @{tiktokSettings.username}
            </a>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {tiktokSettings.is_active ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Connected and ready to use
            </div>
            <Button
              variant="destructive"
              onClick={() => handleDisconnect()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={() => handleConnect()} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Connect TikTok
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
