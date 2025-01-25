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

async function getCurrentUser() {
  const user = await requirePermission("canManageCompanyUsers");
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function validateCompanyAccess(
  currentUser: NextauthUsersRecord,
  targetCompanyId: string | null
) {
  // God users can manage any company
  if (currentUser.profile === "god") return;

  // Admin users can only manage their own company
  if (currentUser.profile === "admin") {
    if (!currentUser.company)
      throw new Error("Admin user must belong to a company");
    if (targetCompanyId !== currentUser.company.id) {
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

export async function getUsers() {
  const currentUser = await getCurrentUser();

  // Build query based on user's profile
  let query = xata.db.nextauth_users;

  if (currentUser.profile === "admin" && currentUser.company) {
    // Admin users can only see users in their company
    query = query.filter("company", currentUser.company.id);
  }

  const users = await query.getAll();

  return users.map((user: NextauthUsersRecord) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    company: user.company?.id || "null",
  }));
}

export async function createUser(data: UserData) {
  const currentUser = await getCurrentUser();
  const targetCompanyId = data.company === "null" ? null : data.company;

  // Admin users can only create users in their company
  if (currentUser.profile === "admin") {
    if (!currentUser.company)
      throw new Error("Admin user must belong to a company");
    // Force company to be the admin's company
    data.company = currentUser.company.id;
  } else {
    // For god users, validate company access
    await validateCompanyAccess(currentUser, targetCompanyId);
  }

  // Admin users cannot create god users
  if (currentUser.profile === "admin" && data.profile === "god") {
    throw new Error("Admin users cannot create god users");
  }

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
  const currentUser = await getCurrentUser();
  const targetCompanyId = data.company === "null" ? null : data.company;

  // Get the user being updated
  const userToUpdate = await xata.db.nextauth_users.read(id);
  if (!userToUpdate) throw new Error("User not found");

  // For god users, validate company access
  if (currentUser.profile === "god") {
    const currentCompanyId = userToUpdate.company?.id;
    await validateCompanyAccess(
      currentUser,
      currentCompanyId === undefined ? null : currentCompanyId
    );
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
