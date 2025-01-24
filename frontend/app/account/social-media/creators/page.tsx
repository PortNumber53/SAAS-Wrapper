"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import type { Creator } from "./columns";
import { useEffect } from "react";
import { usePageTitle } from "@/lib/page-title-context";
import { Users } from "lucide-react";

export const runtime = "edge";

export default function CreatorsPage() {
  const { setPageTitle } = usePageTitle();
  const creators: Creator[] = [];

  useEffect(() => {
    setPageTitle("Social Media Creators", Users);
  }, [setPageTitle]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="gnome-header">Creators</h1>
        <p className="text-gnome-dark/70 dark:text-white/70">
          Manage your social media creators and influencers.
        </p>
      </div>
      <div className="gnome-card">
        <DataTable
          columns={columns}
          data={creators}
          filterColumn="name"
          filterPlaceholder="Filter creators..."
        />
      </div>
    </div>
  );
}
