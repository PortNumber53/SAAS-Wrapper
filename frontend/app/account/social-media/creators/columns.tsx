"use client";

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

export type Creator = {
  id: string;
  name: string;
  username: string;
  platform: string;
  followers: number;
  status: "active" | "inactive";
};

export const columns: ColumnDef<Creator>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Name</div>
    ),
    cell: ({ row }) => (
      <div className="text-gnome-dark dark:text-white font-medium">
        {row.getValue("name")}
      </div>
    ),
  },
  {
    accessorKey: "username",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Username</div>
    ),
    cell: ({ row }) => (
      <div className="text-gnome-dark/70 dark:text-white/70">
        {row.getValue("username")}
      </div>
    ),
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
    accessorKey: "followers",
    header: ({ column }) => (
      <div className="text-gnome-dark dark:text-white">Followers</div>
    ),
    cell: ({ row }) => (
      <div className="text-gnome-dark dark:text-white font-medium">
        {(row.getValue("followers") as number).toLocaleString()}
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
            status === "active"
              ? "bg-gnome-green/10 text-gnome-green"
              : "bg-gnome-red/10 text-gnome-red"
          }`}
        >
          {status}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const creator = row.original;

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
              onClick={() => navigator.clipboard.writeText(creator.id)}
              className="text-gnome-dark/70 dark:text-white/70 hover:bg-gnome-dark/5 dark:hover:bg-white/5 cursor-pointer"
            >
              Copy creator ID
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gnome-dark/70 dark:text-white/70 hover:bg-gnome-dark/5 dark:hover:bg-white/5 cursor-pointer">
              View creator details
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
