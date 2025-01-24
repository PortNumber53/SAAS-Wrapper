import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/use-toast";
import { IntegrationStatusLoader } from "@/components/integration-status-loader";
import { Toaster } from "@/components/ui/use-toast";
import "./globals.css";
import { LayoutContent } from "./layout-content";
import { auth } from "@/app/auth";
import { CartProvider } from "@/lib/cart-context";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-gnome" suppressHydrationWarning>
        <SessionProvider session={session}>
          <CartProvider>
            <ToastProvider>
              <Providers>
                {session && <IntegrationStatusLoader />}
                <LayoutContent>{children}</LayoutContent>
              </Providers>
              <Toaster />
            </ToastProvider>
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
