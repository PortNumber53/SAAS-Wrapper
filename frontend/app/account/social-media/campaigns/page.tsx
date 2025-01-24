"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import type { Campaign } from "./columns";

export const runtime = "edge";

export default function CampaignsPage() {
  // TODO: Fetch campaigns from database
  const campaigns: Campaign[] = [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="gnome-header">Campaigns</h1>
        <p className="text-gnome-dark/70 dark:text-white/70">
          Manage your social media campaigns and track their performance.
        </p>
      </div>
      <div className="gnome-card">
        <DataTable columns={columns} data={campaigns} />
      </div>
    </div>
  );
}
