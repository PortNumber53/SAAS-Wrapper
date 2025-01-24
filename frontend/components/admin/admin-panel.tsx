import { requirePermission } from "@/lib/server-auth"

export async function AdminPanel() {
    // This will redirect if user doesn't have permission
    const user = await requirePermission('canAccessAdmin')

    return (
        <div>
            {/* Admin content */}
            <h1>Admin Panel</h1>
            <p>Welcome, {user.email}</p>
        </div>
    )
}
