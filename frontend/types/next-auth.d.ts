import { UserProfile } from "@/lib/profile-utils"
import NextAuth from "next-auth"

declare module "next-auth" {
    interface User {
        id: string
        profile: UserProfile
    }
    
    interface Session {
        user: User & {
            id: string
            profile: UserProfile
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        profile: UserProfile
    }
}
