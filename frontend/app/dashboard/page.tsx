import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const runtime = 'nodejs';

export default async function DashboardPage() {
  try {
    console.log("Dashboard page: Fetching session");
    const session = await auth();
    console.log("Dashboard page: Session details", JSON.stringify(session, null, 2));

    // More explicit session checking
    if (!session) {
      console.log("Dashboard page: No session found, redirecting to login");
      return redirect("/login");
    }

    if (!session.user) {
      console.log("Dashboard page: Session exists but no user data, redirecting to login");
      return redirect("/login");
    }

    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">Welcome to your Dashboard, {session.user.name}&apos;s Workspace</h1>
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <p className="text-lg">Hello, {session.user.name || 'User'}!</p>
            <p className="text-gray-600 mt-2">You&apos;re signed in with: {session.user.email}</p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Dashboard page error:", error);
    return redirect("/login");
  }
}
