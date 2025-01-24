"use server";

import { xata } from "@/lib/xata";
import { requirePermission } from "@/lib/server-auth";
import type { UserProfile } from "@/lib/profile-utils";
import type { NextauthUsersRecord } from "@/vendor/xata";

interface UserData {
  name: string;
  email: string;
  profile: UserProfile;
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
    profile: user.profile as UserProfile,
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
    emailVerified: new Date().toISOString(),
  });

  return user;
}

export async function updateUser(id: string, data: UserData) {
  // Ensure user has permission to manage users
  await requirePermission("canManageUsers");

  // Get the current user being updated
  const currentUser = await xata.db.nextauth_users.read(id);
  if (!currentUser) {
    throw new Error("User not found");
  }

  // If we're changing from god to another profile, check if this is the last god user
  if (currentUser.profile === "god" && data.profile !== "god") {
    // Count how many god users we have
    const godUsers = await xata.db.nextauth_users
      .filter("profile", "god")
      .getAll();

    // If this is the last god user, prevent the change
    if (godUsers.length <= 1) {
      throw new Error("Cannot remove the last god user from the system");
    }
  }

  // Update user
  const user = await xata.db.nextauth_users.update(id, {
    name: data.name,
    email: data.email,
    profile: data.profile,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function deleteUser(id: string) {
  // Ensure user has permission to manage users
  await requirePermission("canManageUsers");

  // Get the user being deleted
  const user = await xata.db.nextauth_users.read(id);
  if (!user) {
    throw new Error("User not found");
  }

  // If this is a god user, check if it's the last one
  if (user.profile === "god") {
    const godUsers = await xata.db.nextauth_users
      .filter("profile", "god")
      .getAll();

    // If this is the last god user, prevent deletion
    if (godUsers.length <= 1) {
      throw new Error("Cannot delete the last god user from the system");
    }
  }

  // Delete user
  await xata.db.nextauth_users.delete(id);
}
