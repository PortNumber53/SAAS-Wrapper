"use client";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import type { Post } from "./columns";
import { useEffect } from "react";
import { usePageTitle } from "@/lib/page-title-context";
import { MessageSquare } from "lucide-react";

export const runtime = "edge";

export default function PostsPage() {
  const { setPageTitle } = usePageTitle();
  const posts: Post[] = [];

  useEffect(() => {
    setPageTitle("Social Media Posts", MessageSquare);
  }, [setPageTitle]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="gnome-header">Posts</h1>
        <p className="text-gnome-dark/70 dark:text-white/70">
          Manage and track your social media posts.
        </p>
      </div>
      <div className="gnome-card">
        <DataTable
          columns={columns}
          data={posts}
          filterColumn="content"
          filterPlaceholder="Filter posts..."
        />
      </div>
    </div>
  );
}
