import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Post = {
  id: string
  content: string
  platform: string
  creator: string
  campaign: string
  scheduledFor: string
  status: "draft" | "scheduled" | "published" | "failed"
  engagement: {
    likes: number
    comments: number
    shares: number
  }
}

export const columns: ColumnDef<Post>[] = [
  {
    accessorKey: "content",
    header: "Content",
    cell: ({ row }) => {
      const content = row.getValue("content") as string
      return <div className="max-w-[300px] truncate">{content}</div>
    },
  },
  {
    accessorKey: "platform",
    header: "Platform",
  },
  {
    accessorKey: "creator",
    header: "Creator",
  },
  {
    accessorKey: "campaign",
    header: "Campaign",
  },
  {
    accessorKey: "scheduledFor",
    header: "Scheduled For",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "engagement",
    header: "Engagement",
    cell: ({ row }) => {
      const engagement = row.getValue("engagement") as Post["engagement"]
      return (
        <div className="text-sm">
          {engagement.likes} likes • {engagement.comments} comments • {engagement.shares} shares
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const post = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(post.id)}
            >
              Copy post ID
            </DropdownMenuItem>
            <DropdownMenuItem>Edit post</DropdownMenuItem>
            <DropdownMenuItem>View analytics</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
