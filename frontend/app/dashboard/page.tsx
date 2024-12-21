import { auth, signOut } from "@/app/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export const runtime = 'edge';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <p>Welcome, {session.user?.name || 'User'}!</p>
        <p>Email: {session.user?.email}</p>
        <form 
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-4"
        >
          <Button type="submit" variant="destructive">
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}
