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
import { InstagramIcon as Instagram } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { LogOut } from "lucide-react";
import { LogIn } from "lucide-react";

interface InstagramIntegrationResponse {
  integration: {
    accessToken?: string;
    username?: string;
    is_active: boolean;
  } | null;
}

interface InstagramIntegrationErrorResponse {
  error?: string;
}

interface InstagramAuthUrlResponse {
  authUrl: string;
}

export function InstagramIntegration() {
  const { toast } = useToast();
  const [instagramSettings, setInstagramSettings] = useState({
    accessToken: "",
    username: "",
    is_active: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchInstagramSettings = async () => {
      try {
        const response = await fetch("/api/integrations/instagram");
        const data = (await response.json()) as InstagramIntegrationResponse;

        if (!response.ok) {
          throw new Error("Failed to fetch Instagram settings");
        }

        if (data.integration) {
          setInstagramSettings((prev) => ({
            ...prev,
            accessToken: data.integration?.accessToken || "",
            username: data.integration?.username || "",
            is_active: data.integration?.is_active || false,
          }));
        }
      } catch (error) {
        console.error("Error fetching Instagram settings:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load Instagram settings",
          variant: "destructive",
        });
      }
    };

    fetchInstagramSettings();
  }, [toast]);

  const handleInstagramAuth = async () => {
    // Instagram OAuth URL will be configured in the backend
    try {
      const response = await fetch("/api/integrations/instagram/auth-url");
      const data = (await response.json()) as InstagramAuthUrlResponse;

      if (!response.ok) {
        throw new Error("Failed to get authentication URL");
      }

      // Redirect to Instagram authorization page
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error starting Instagram auth:", error);
      toast({
        title: "Error",
        description: "Failed to start Instagram authentication",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (checked: boolean) => {
    setInstagramSettings((prev) => ({ ...prev, is_active: checked }));

    try {
      const response = await fetch("/api/integrations/instagram/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: checked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update integration status");
      }

      // Update localStorage
      updateStoredIntegrationStatus({ instagram: checked });

      toast({
        title: "Instagram Business",
        description: `Integration ${
          checked ? "enabled" : "disabled"
        } successfully`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      // Revert the state if the API call fails
      setInstagramSettings((prev) => ({ ...prev, is_active: !checked }));
      toast({
        title: "Error",
        description: "Failed to update integration status",
        variant: "destructive",
      });
    }
  };

  const disconnectInstagram = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/integrations/instagram/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect Instagram account");
      }

      setInstagramSettings({
        accessToken: "",
        username: "",
        is_active: false,
      });

      // Update localStorage
      updateStoredIntegrationStatus({ instagram: false });

      toast({
        title: "Instagram Business",
        description: "Successfully disconnected Instagram account",
      });
    } catch (error) {
      console.error("Error disconnecting Instagram:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect Instagram account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    handleInstagramAuth();
  };

  const handleDisconnect = async () => {
    disconnectInstagram();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5" />
          Instagram Business
        </CardTitle>
        <CardDescription>
          Connect your Instagram Business account to automatically publish
          content.
        </CardDescription>
        {instagramSettings.username && (
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium">Connected Account:</span>{" "}
            <a
              href={`https://instagram.com/${instagramSettings.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @{instagramSettings.username}
            </a>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {instagramSettings.is_active ? (
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
            Connect Instagram
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
