"use client";

export const runtime = "edge";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import type { Creator } from "./columns";

export default function CreatorsPage() {
  // TODO: Fetch creators from database
  const creators: Creator[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Creators</h3>
        <p className="text-sm text-muted-foreground">
          Manage your social media creators and influencers.
        </p>
      </div>
      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={creators} />
      </div>
    </div>
  );
}
