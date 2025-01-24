import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Post = {
  id: string;
  content: string;
  platform: string;
  creator: string;
  campaign: string;
  scheduledFor: string;
  status: "draft" | "scheduled" | "published" | "failed";
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
};

export const columns: ColumnDef<Post>[] = [
  {
    accessorKey: "content",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Content</div>
    ),
    cell: ({ row }) => {
      const content = row.getValue("content") as string;
      return (
        <div className="max-w-[300px] truncate text-gnome-dark dark:text-white">
          {content}
        </div>
      );
    },
  },
  {
    accessorKey: "platform",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Platform</div>
    ),
    cell: ({ row }) => (
      <div className="text-gnome-dark/70 dark:text-white/70">
        {row.getValue("platform")}
      </div>
    ),
  },
  {
    accessorKey: "creator",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Creator</div>
    ),
    cell: ({ row }) => (
      <div className="text-gnome-dark/70 dark:text-white/70">
        {row.getValue("creator")}
      </div>
    ),
  },
  {
    accessorKey: "campaign",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Campaign</div>
    ),
    cell: ({ row }) => (
      <div className="text-gnome-dark/70 dark:text-white/70">
        {row.getValue("campaign")}
      </div>
    ),
  },
  {
    accessorKey: "scheduledFor",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Scheduled For</div>
    ),
    cell: ({ row }) => (
      <div className="text-gnome-dark/70 dark:text-white/70">
        {row.getValue("scheduledFor")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Status</div>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <div
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
            status === "published"
              ? "bg-gnome-green/10 text-gnome-green"
              : status === "scheduled"
              ? "bg-gnome-blue/10 text-gnome-blue"
              : status === "draft"
              ? "bg-gnome-yellow/10 text-gnome-yellow"
              : "bg-gnome-red/10 text-gnome-red"
          }`}
        >
          {status}
        </div>
      );
    },
  },
  {
    accessorKey: "engagement",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Engagement</div>
    ),
    cell: ({ row }) => {
      const engagement = row.getValue("engagement") as Post["engagement"];
      return (
        <div className="text-sm text-gnome-dark/70 dark:text-white/70">
          {engagement.likes.toLocaleString()} likes •{" "}
          {engagement.comments.toLocaleString()} comments •{" "}
          {engagement.shares.toLocaleString()} shares
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const post = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-gnome-dark/5 dark:hover:bg-white/5"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4 text-gnome-dark dark:text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-white dark:bg-gnome-dark border border-gnome-dark/10 dark:border-white/10"
          >
            <DropdownMenuLabel className="text-gnome-dark dark:text-white">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(post.id)}
              className="text-gnome-dark/70 dark:text-white/70 hover:bg-gnome-dark/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Copy post ID
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gnome-dark/70 dark:text-white/70 hover:bg-gnome-dark/5 dark:hover:bg-white/5 cursor-pointer">
              Edit post
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gnome-dark/70 dark:text-white/70 hover:bg-gnome-dark/5 dark:hover:bg-white/5 cursor-pointer">
              View analytics
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
