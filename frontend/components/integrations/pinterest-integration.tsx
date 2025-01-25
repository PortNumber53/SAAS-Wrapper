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

interface PinterestIntegrationResponse {
  integration: {
    accessToken?: string;
    username?: string;
    is_active: boolean;
  } | null;
}

interface PinterestIntegrationErrorResponse {
  error?: string;
}

interface PinterestAuthUrlResponse {
  authUrl: string;
}

export function PinterestIntegration() {
  const { toast } = useToast();
  const [pinterestSettings, setPinterestSettings] = useState({
    accessToken: "",
    username: "",
    is_active: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPinterestSettings = async () => {
      try {
        const response = await fetch("/api/integrations/pinterest");
        const data = (await response.json()) as PinterestIntegrationResponse;

        if (!response.ok) {
          throw new Error("Failed to fetch Pinterest settings");
        }

        if (data.integration) {
          setPinterestSettings((prev) => ({
            ...prev,
            accessToken: data.integration?.accessToken || "",
            username: data.integration?.username || "",
            is_active: data.integration?.is_active || false,
          }));
        }
      } catch (error) {
        console.error("Error fetching Pinterest settings:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load Pinterest settings",
          variant: "destructive",
        });
      }
    };

    fetchPinterestSettings();
  }, [toast]);

  const handlePinterestAuth = async () => {
    try {
      const response = await fetch("/api/integrations/pinterest/auth-url");
      const data = (await response.json()) as PinterestAuthUrlResponse;

      if (!response.ok) {
        throw new Error("Failed to get authentication URL");
      }

      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error starting Pinterest auth:", error);
      toast({
        title: "Error",
        description: "Failed to start Pinterest authentication",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (checked: boolean) => {
    setPinterestSettings((prev) => ({ ...prev, is_active: checked }));

    try {
      const response = await fetch("/api/integrations/pinterest/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: checked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update integration status");
      }

      updateStoredIntegrationStatus({ pinterest: checked });

      toast({
        title: "Pinterest",
        description: `Integration ${
          checked ? "enabled" : "disabled"
        } successfully`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      setPinterestSettings((prev) => ({ ...prev, is_active: !checked }));
      toast({
        title: "Error",
        description: "Failed to update integration status",
        variant: "destructive",
      });
    }
  };

  const disconnectPinterest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/integrations/pinterest/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect Pinterest account");
      }

      setPinterestSettings({
        accessToken: "",
        username: "",
        is_active: false,
      });

      updateStoredIntegrationStatus({ pinterest: false });

      toast({
        title: "Pinterest",
        description: "Successfully disconnected Pinterest account",
      });
    } catch (error) {
      console.error("Error disconnecting Pinterest:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect Pinterest account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    handlePinterestAuth();
  };

  const handleDisconnect = async () => {
    disconnectPinterest();
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
            aria-label="Pinterest"
          >
            <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.217-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
          </svg>
          Pinterest
        </CardTitle>
        <CardDescription>
          Connect your Pinterest account to automatically publish content.
        </CardDescription>
        {pinterestSettings.username && (
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium">Connected Account:</span>{" "}
            <a
              href={`https://pinterest.com/${pinterestSettings.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @{pinterestSettings.username}
            </a>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {pinterestSettings.is_active ? (
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
            Connect Pinterest
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
