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
import { getCompanies } from "../companies/actions";
import { useProfile } from "@/hooks/use-profile";

interface Company {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  profile: string;
  company?: string;
}

export default function UsersPage() {
  const { toast } = useToast();
  const { setPageTitle } = usePageTitle();
  const { checkPermission } = useProfile();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    profile: "user",
    company: "null",
  });

  const canManageAllCompanies = checkPermission("canManageUsers");

  useEffect(() => {
    setPageTitle("User Management", Users);
    loadUsers();
    if (canManageAllCompanies) {
      loadCompanies();
    } else {
      setLoadingCompanies(false);
    }
  }, [setPageTitle, canManageAllCompanies]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await getCompanies();
      setCompanies(data || []);
    } catch (error) {
      console.error("Error loading companies:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load companies. Please try again.",
        variant: "destructive",
      });
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load users. Please try again.",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoadingUsers(false);
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
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        profile: "user",
        company: "null",
      });
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      profile: user.profile,
      company: user.company || "null",
    });
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
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      profile: "user",
      company: "null",
    });
  };

  if ((canManageAllCompanies && loadingCompanies) || loadingUsers) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Users</h1>
        </div>

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
                onValueChange={(value) =>
                  setFormData({ ...formData, profile: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="god">God</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canManageAllCompanies && (
              <div>
                <Label htmlFor="company">Company</Label>
                <Select
                  value={formData.company}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      company: value === "null" ? "null" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">No Company</SelectItem>
                    {!loadingCompanies && companies && companies.length > 0 ? (
                      companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))
                    ) : loadingCompanies ? (
                      <SelectItem value="loading" disabled>
                        Loading companies...
                      </SelectItem>
                    ) : (
                      <SelectItem value="no-companies" disabled>
                        No companies available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? "Update" : "Create"} User
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex-1 p-6 pt-0 overflow-hidden">
        <div className="gnome-card h-full overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Profile</th>
                  {canManageAllCompanies && (
                    <th className="text-left p-4">Company</th>
                  )}
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-muted/50">
                      <td className="p-4">{user.name}</td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">{user.profile}</td>
                      {canManageAllCompanies && (
                        <td className="p-4">
                          {companies.find((c) => c.id === user.company)?.name ||
                            "-"}
                        </td>
                      )}
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
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={canManageAllCompanies ? 5 : 4}
                      className="text-center p-4 text-muted-foreground"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
