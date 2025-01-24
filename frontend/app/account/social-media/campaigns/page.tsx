"use client";

export const runtime = "edge";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import type { Campaign } from "./columns";

export default function CampaignsPage() {
  // TODO: Fetch campaigns from database
  const campaigns: Campaign[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Campaigns</h3>
        <p className="text-sm text-muted-foreground">
          Manage your social media campaigns and track their performance.
        </p>
      </div>
      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={campaigns} />
      </div>
    </div>
  );
}
