import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/auth.config";
import LoginPageContent from "./LoginPageContent";

export default async function LoginPage() {
  const session = await getServerSession(authConfig);

  if (session) {
    redirect("/dashboard");
  }

  return <LoginPageContent />;
}
