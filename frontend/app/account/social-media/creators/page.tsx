"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import type { Creator } from "./columns";

export const runtime = "edge";

export default function CreatorsPage() {
  // TODO: Fetch creators from database
  const creators: Creator[] = [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="gnome-header">Creators</h1>
        <p className="text-gnome-dark/70 dark:text-white/70">
          Manage your social media creators and influencers.
        </p>
      </div>
      <div className="gnome-card">
        <DataTable columns={columns} data={creators} />
      </div>
    </div>
  );
}
