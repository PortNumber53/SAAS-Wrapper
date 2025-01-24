import { AdminPanel } from "@/components/admin/admin-panel"
import { requirePermission } from "@/lib/server-auth"

export const runtime = 'edge';

export default async function AdminPage() {
    // This will redirect if user doesn't have permission
    await requirePermission('canAccessAdmin')

    return <AdminPanel />
}
