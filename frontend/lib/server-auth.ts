import { redirect } from "next/navigation"
import { xata } from "./xata"
import { ProfilePermissions, getProfilePermissions, UserProfile } from "./profile-utils"
import type { NextauthUsersRecord } from "@/vendor/xata"
import { auth } from "@/app/auth"
import { unstable_noStore } from "next/cache"

export async function requirePermission(permission: keyof ProfilePermissions): Promise<NextauthUsersRecord> {
    unstable_noStore()
    const session = await auth()
    if (!session?.user?.id) {
        redirect('/login')
    }

    // Always fetch fresh user data from database
    const user = await xata.db.nextauth_users.read(session.user.id)
    if (!user) {
        redirect('/login')
    }

    const permissions = getProfilePermissions(user.profile as UserProfile)
    if (!permissions[permission]) {
        redirect('/')
    }

    return user
}

export async function getUserProfile(): Promise<NextauthUsersRecord | null> {
    unstable_noStore()
    const session = await auth()
    if (!session?.user?.id) {
        return null
    }

    // Always fetch fresh user data from database
    const user = await xata.db.nextauth_users.read(session.user.id)
    return user
}
