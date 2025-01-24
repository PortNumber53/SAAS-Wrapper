import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { auth } from "@/app/auth";
import { Providers } from "@/app/providers";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/use-toast";
import { IntegrationStatusLoader } from "@/components/integration-status-loader";
import { Toaster } from "@/components/ui/use-toast";
import "./globals.css";
import { LayoutContent } from "./layout-content";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider session={session}>
          <Providers>
            {session && <IntegrationStatusLoader />}
            <Toaster />
            <LayoutContent>{children}</LayoutContent>
          </Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
