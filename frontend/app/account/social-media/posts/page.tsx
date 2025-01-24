"use client";

export const runtime = "edge";

import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import type { Post } from "./columns";

export default function PostsPage() {
  // TODO: Fetch posts from database
  const posts: Post[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Posts</h3>
        <p className="text-sm text-muted-foreground">
          Manage and track your social media posts.
        </p>
      </div>
      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={posts} />
      </div>
    </div>
  );
}
