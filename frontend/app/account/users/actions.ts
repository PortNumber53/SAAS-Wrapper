"use server";

import { getXataClient } from "@/lib/xata";
import { auth } from "@/app/auth";
import { hasPermission } from "@/lib/profile-utils";
import { requirePermission } from "@/lib/server-auth";
import type { UserProfile } from "@/lib/profile-utils";
import type { NextauthUsersRecord } from "@/vendor/xata";

const xata = getXataClient();

interface User {
  id: string;
  name: string;
  email: string;
  profile: string;
  company?: string | null;
}

interface CurrentUser extends User {
  canManageUsers: boolean;
  canManageCompanyUsers: boolean;
}

interface UserData {
  name: string;
  email: string;
  profile: string;
  company?: string | null;
}

async function validateCompanyAccess(
  user: CurrentUser,
  companyId: string | null
) {
  // God users can manage any company
  if (user.profile === "god") return;

  // Admin users can only manage their own company
  if (user.profile === "admin") {
    if (!user.company) throw new Error("Admin user must belong to a company");
    if (companyId !== user.company) {
      throw new Error("You can only manage users in your own company");
    }
  }
}

async function validateLastAdminInCompany(
  companyId: string | null,
  excludeUserId?: string
) {
  if (!companyId) return;

  const adminUsers = await xata.db.nextauth_users
    .filter({
      profile: "admin",
      company: companyId,
    })
    .getAll();

  // If we're updating a user, exclude them from the count
  const adminCount = excludeUserId
    ? adminUsers.filter((u: NextauthUsersRecord) => u.id !== excludeUserId)
        .length
    : adminUsers.length;

  if (adminCount <= 1) {
    throw new Error("Cannot remove the last admin user from the company");
  }
}

async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  const user = await xata.db.nextauth_users
    .filter({ email: session.user.email })
    .getFirst();

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    company: user.company?.id || null,
    canManageUsers: hasPermission(user.profile, "canManageUsers"),
    canManageCompanyUsers: hasPermission(user.profile, "canManageCompanyUsers"),
  };
}

export async function getUsers() {
  const currentUser = await getCurrentUser();
  const query = xata.db.nextauth_users.filter({});

  if (currentUser.canManageCompanyUsers && !currentUser.canManageUsers) {
    if (!currentUser.company) {
      throw new Error("Admin user must belong to a company");
    }
    query.filter({ "company.id": currentUser.company });
  }

  const users = await query.getMany();
  return users.map(
    (u: NextauthUsersRecord): User => ({
      id: u.id,
      name: u.name || "",
      email: u.email || "",
      profile: u.profile || "user",
      company: u.company?.id ?? null,
    })
  );
}

export async function createUser(data: UserData) {
  const currentUser = await getCurrentUser();

  // For admin users, ensure they can only create users in their company
  if (currentUser.canManageCompanyUsers && !currentUser.canManageUsers) {
    if (!currentUser.company) {
      throw new Error("Admin user must belong to a company");
    }
    data.company = currentUser.company;
  }

  // Admin users cannot create god users
  if (!currentUser.canManageUsers && data.profile === "god") {
    throw new Error("Only god users can create other god users");
  }

  // For god users, validate company access
  if (data.company !== undefined && data.company !== null) {
    await validateCompanyAccess(currentUser, data.company);
  }

  // Ensure company is either a valid ID or null
  let companyId: string | null = null;
  if (data.company && data.company !== "null") {
    companyId = data.company;
  }

  const user = await xata.db.nextauth_users.create({
    name: data.name,
    email: data.email,
    profile: data.profile,
    company: companyId,
  });

  return user;
}

export async function updateUser(id: string, data: UserData) {
  const currentUser = await getCurrentUser();
  const targetCompanyId: string | null =
    data.company === "null" ? null : data.company || null;

  // Get the user being updated
  const userToUpdate = await xata.db.nextauth_users.read(id);
  if (!userToUpdate) throw new Error("User not found");

  // For god users, validate company access
  if (currentUser.profile === "god") {
    const currentCompanyId = userToUpdate.company?.id ?? null;
    await validateCompanyAccess(currentUser, currentCompanyId);
    await validateCompanyAccess(currentUser, targetCompanyId);
  } else {
    // Admin users can only update users in their company
    if (!currentUser.company)
      throw new Error("Admin user must belong to a company");
    if (userToUpdate.company?.id !== currentUser.company.id) {
      throw new Error("You can only manage users in your own company");
    }
    // Force company to be the admin's company
    data.company = currentUser.company.id;
  }

  // Admin users cannot modify god users
  if (currentUser.profile === "admin" && userToUpdate.profile === "god") {
    throw new Error("Admin users cannot modify god users");
  }

  // Admin users cannot change users to god profile
  if (currentUser.profile === "admin" && data.profile === "god") {
    throw new Error("Admin users cannot assign god profile");
  }

  // Check if we're updating a god user's profile
  if (userToUpdate.profile === "god" && data.profile !== "god") {
    const godUsers = await xata.db.nextauth_users
      .filter("profile", "god")
      .getAll();
    if (godUsers.length <= 1) {
      throw new Error("Cannot remove the last god user from the system");
    }
  }

  // Check if we're updating an admin user's profile in a company
  if (
    userToUpdate.profile === "admin" &&
    data.profile !== "admin" &&
    userToUpdate.company
  ) {
    await validateLastAdminInCompany(userToUpdate.company.id, userToUpdate.id);
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
  const currentUser = await getCurrentUser();

  // Get the user being deleted
  const userToDelete = await xata.db.nextauth_users.read(id);
  if (!userToDelete) throw new Error("User not found");

  // Validate company access
  const userCompanyId = userToDelete.company?.id;
  await validateCompanyAccess(
    currentUser,
    userCompanyId === undefined ? null : userCompanyId
  );

  // Admin users cannot delete god users
  if (currentUser.profile === "admin" && userToDelete.profile === "god") {
    throw new Error("Admin users cannot delete god users");
  }

  // Check if we're deleting a god user
  if (userToDelete.profile === "god") {
    const godUsers = await xata.db.nextauth_users
      .filter("profile", "god")
      .getAll();
    if (godUsers.length <= 1) {
      throw new Error("Cannot delete the last god user from the system");
    }
  }

  // Check if we're deleting an admin user from a company
  if (userToDelete.profile === "admin" && userToDelete.company) {
    await validateLastAdminInCompany(userToDelete.company.id, userToDelete.id);
  }

  // Delete user
  await xata.db.nextauth_users.delete(id);
}
