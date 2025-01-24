"use client";

import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/page-title-context";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getUsers, createUser, updateUser, deleteUser } from "./actions";
import type { UserProfile } from "@/lib/profile-utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  profile: UserProfile;
}

export default function UsersPage() {
  const { toast } = useToast();
  const { setPageTitle } = usePageTitle();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    profile: "user" as UserProfile,
  });

  useEffect(() => {
    setPageTitle("User Management", Users);
    loadUsers();
  }, [setPageTitle]);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
        toast({
          title: "Success",
          description: "User updated successfully.",
        });
      } else {
        await createUser(formData);
        toast({
          title: "Success",
          description: "User created successfully.",
        });
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: "", email: "", profile: "user" });
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Error",
        description: "Failed to save user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email,
      profile: user.profile,
    });
    setShowForm(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(user.id);
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          Add User
        </Button>
      </div>

      {showForm && (
        <div className="gnome-card mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="profile">Profile</Label>
              <Select
                value={formData.profile}
                onValueChange={(value: UserProfile) =>
                  setFormData({ ...formData, profile: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="god">God</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                  setFormData({ name: "", email: "", profile: "user" });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? "Update" : "Create"} User
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="gnome-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Profile</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-4">{user.name}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.profile}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(user)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
