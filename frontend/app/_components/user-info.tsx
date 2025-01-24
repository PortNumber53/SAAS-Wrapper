"use client";

import { useSession } from "next-auth/react";

export function UserInfo() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <>
        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-gray-300 rounded animate-pulse" />
      </>
    );
  }

  if (!session?.user?.name) {
    return null;
  }

  const getBadgeColor = (profile: string) => {
    switch (profile) {
      case "god":
        return "bg-red-500";
      case "admin":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <>
      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
        {session.user.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex items-center gap-2">
        <span>{session.user.name}</span>
        {session.user.profile && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full text-white ${getBadgeColor(
              session.user.profile
            )}`}
          >
            {session.user.profile}
          </span>
        )}
      </div>
    </>
  );
}
