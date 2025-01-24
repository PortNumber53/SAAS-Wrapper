"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import type { Campaign } from "./columns";
import { useEffect } from "react";
import { usePageTitle } from "@/lib/page-title-context";
import { Target } from "lucide-react";

export const runtime = "edge";

export default function CampaignsPage() {
  const { setPageTitle } = usePageTitle();
  // TODO: Fetch campaigns from database
  const campaigns: Campaign[] = [];

  useEffect(() => {
    setPageTitle("Social Media Campaigns", Target);
  }, [setPageTitle]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="gnome-header">Campaigns</h1>
        <p className="text-gnome-dark/70 dark:text-white/70">
          Manage your social media campaigns and track their performance.
        </p>
      </div>
      <div className="gnome-card">
        <DataTable
          columns={columns}
          data={campaigns}
          filterColumn="name"
          filterPlaceholder="Filter campaigns..."
        />
      </div>
    </div>
  );
}
