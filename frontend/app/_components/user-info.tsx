"use client"

import { useSession } from "next-auth/react"

export function UserInfo() {
    const { data: session, status } = useSession()
    
    if (status === "loading") {
        return (
            <>
                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
                <div className="w-20 h-4 bg-gray-300 rounded animate-pulse" />
            </>
        )
    }
    
    if (!session?.user?.name) {
        return null
    }
    
    return (
        <>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                {session.user.name.charAt(0).toUpperCase()}
            </div>
            <span>{session.user.name}</span>
        </>
    )
}
