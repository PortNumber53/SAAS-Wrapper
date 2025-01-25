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
import { Facebook } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { LogOut } from "lucide-react";
import { LogIn } from "lucide-react";

interface FacebookIntegrationResponse {
  integration: {
    accessToken?: string;
    username?: string;
    is_active: boolean;
  } | null;
}

interface FacebookIntegrationErrorResponse {
  error?: string;
}

interface FacebookAuthUrlResponse {
  authUrl: string;
}

export function FacebookIntegration() {
  const { toast } = useToast();
  const [facebookSettings, setFacebookSettings] = useState({
    accessToken: "",
    username: "",
    is_active: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFacebookSettings = async () => {
      try {
        const response = await fetch("/api/integrations/facebook");
        const data = (await response.json()) as FacebookIntegrationResponse;

        if (!response.ok) {
          throw new Error("Failed to fetch Facebook settings");
        }

        if (data.integration) {
          setFacebookSettings((prev) => ({
            ...prev,
            accessToken: data.integration?.accessToken || "",
            username: data.integration?.username || "",
            is_active: data.integration?.is_active || false,
          }));
        }
      } catch (error) {
        console.error("Error fetching Facebook settings:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load Facebook settings",
          variant: "destructive",
        });
      }
    };

    fetchFacebookSettings();
  }, [toast]);

  const handleFacebookAuth = async () => {
    try {
      const response = await fetch("/api/integrations/facebook/auth-url");
      const data = (await response.json()) as FacebookAuthUrlResponse;

      if (!response.ok) {
        throw new Error("Failed to get authentication URL");
      }

      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error starting Facebook auth:", error);
      toast({
        title: "Error",
        description: "Failed to start Facebook authentication",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (checked: boolean) => {
    setFacebookSettings((prev) => ({ ...prev, is_active: checked }));

    try {
      const response = await fetch("/api/integrations/facebook/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: checked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update integration status");
      }

      updateStoredIntegrationStatus({ facebook: checked });

      toast({
        title: "Facebook",
        description: `Integration ${
          checked ? "enabled" : "disabled"
        } successfully`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      setFacebookSettings((prev) => ({ ...prev, is_active: !checked }));
      toast({
        title: "Error",
        description: "Failed to update integration status",
        variant: "destructive",
      });
    }
  };

  const disconnectFacebook = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/integrations/facebook/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect Facebook account");
      }

      setFacebookSettings({
        accessToken: "",
        username: "",
        is_active: false,
      });

      updateStoredIntegrationStatus({ facebook: false });

      toast({
        title: "Facebook",
        description: "Successfully disconnected Facebook account",
      });
    } catch (error) {
      console.error("Error disconnecting Facebook:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect Facebook account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    handleFacebookAuth();
  };

  const handleDisconnect = async () => {
    disconnectFacebook();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5" />
          Facebook
        </CardTitle>
        <CardDescription>
          Connect your Facebook account to automatically publish content.
        </CardDescription>
        {facebookSettings.username && (
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium">Connected Account:</span>{" "}
            <a
              href={`https://facebook.com/${facebookSettings.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @{facebookSettings.username}
            </a>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {facebookSettings.is_active ? (
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
            Connect Facebook
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
