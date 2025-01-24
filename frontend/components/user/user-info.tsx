import { getUserProfile } from "@/lib/server-auth"

export async function UserInfo() {
    const user = await getUserProfile()
    
    if (!user?.name) {
        return (
            <>
                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
                <div className="w-20 h-4 bg-gray-300 rounded animate-pulse" />
            </>
        )
    }
    
    return (
        <>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <span>{user.name}</span>
        </>
    )
}
