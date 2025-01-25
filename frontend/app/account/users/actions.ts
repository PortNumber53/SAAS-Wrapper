"use server";

import { xata } from "@/lib/xata";
import { requirePermission } from "@/lib/server-auth";
import type { UserProfile } from "@/lib/profile-utils";
import type { NextauthUsersRecord } from "@/vendor/xata";

interface UserData {
  name: string;
  email: string;
  profile: string;
  company?: string;
}

export async function getUsers() {
  // Ensure user has permission to manage users
  await requirePermission("canManageUsers");

  // Get all users
  const users = await xata.db.nextauth_users.getAll();

  // Map users to a simpler format
  return users.map((user: NextauthUsersRecord) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    company: user.company?.id || "null",
  }));
}

export async function createUser(data: UserData) {
  // Ensure user has permission to manage users
  await requirePermission("canManageUsers");

  // Create new user
  const user = await xata.db.nextauth_users.create({
    name: data.name,
    email: data.email,
    profile: data.profile,
    company: data.company === "null" ? null : data.company,
  });

  return user;
}

export async function updateUser(id: string, data: UserData) {
  // Ensure user has permission to manage users
  await requirePermission("canManageUsers");

  // Check if we're updating a god user's profile
  const currentUser = await xata.db.nextauth_users.read(id);
  if (currentUser?.profile === "god" && data.profile !== "god") {
    // Count how many god users we have
    const godUsers = await xata.db.nextauth_users
      .filter("profile", "god")
      .getAll();
    if (godUsers.length <= 1) {
      throw new Error("Cannot remove the last god user from the system");
    }
  }

  // Update user
  const user = await xata.db.nextauth_users.update(id, {
    name: data.name,
    email: data.email,
    profile: data.profile,
    company: data.company === "null" ? null : data.company,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function deleteUser(id: string) {
  // Ensure user has permission to manage users
  await requirePermission("canManageUsers");

  // Check if we're deleting a god user
  const user = await xata.db.nextauth_users.read(id);
  if (user?.profile === "god") {
    // Count how many god users we have
    const godUsers = await xata.db.nextauth_users
      .filter("profile", "god")
      .getAll();
    if (godUsers.length <= 1) {
      throw new Error("Cannot delete the last god user from the system");
    }
  }

  // Delete user
  await xata.db.nextauth_users.delete(id);
}
