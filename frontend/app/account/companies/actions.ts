"use server";

import { xata } from "@/lib/xata";
import { requirePermission } from "@/lib/server-auth";
import type { CompaniesRecord } from "@/vendor/xata";

interface CompanyData {
  name: string;
  logo?: string;
  plan: string;
  is_active: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
}

export async function getCompanies() {
  // Ensure user has permission to manage companies
  await requirePermission("canManageUsers");

  // Get all companies
  const companies = await xata.db.companies.getAll();

  // Map companies to a simpler format
  return companies.map((company: CompaniesRecord) => ({
    id: company.id,
    name: company.name,
    logo: company.logo,
    plan: company.plan,
    is_active: company.is_active,
    address: company.address,
  }));
}

export async function createCompany(data: CompanyData) {
  // Ensure user has permission to manage companies
  await requirePermission("canManageUsers");

  // Create new company
  const company = await xata.db.companies.create({
    name: data.name,
    logo: data.logo,
    plan: data.plan,
    is_active: data.is_active,
    address: data.address || {},
  });

  return company;
}

export async function updateCompany(id: string, data: CompanyData) {
  // Ensure user has permission to manage companies
  await requirePermission("canManageUsers");

  // Update company
  const company = await xata.db.companies.update(id, {
    name: data.name,
    logo: data.logo,
    plan: data.plan,
    is_active: data.is_active,
    address: data.address || {},
  });

  if (!company) {
    throw new Error("Company not found");
  }

  return company;
}

export async function deleteCompany(id: string) {
  // Ensure user has permission to manage companies
  await requirePermission("canManageUsers");

  // Delete company
  await xata.db.companies.delete(id);
}
