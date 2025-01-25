"use client";

import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/page-title-context";
import { Building2 } from "lucide-react";
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
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from "./actions";
import { Switch } from "@/components/ui/switch";

interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

interface Company {
  id: string;
  name: string;
  logo?: string;
  plan: string;
  is_active: boolean;
  address?: Partial<Address>;
}

interface FormData {
  name: string;
  logo: string;
  plan: string;
  is_active: boolean;
  address: Address;
}

export const runtime = "edge";

export default function CompaniesPage() {
  const { toast } = useToast();
  const { setPageTitle } = usePageTitle();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    plan: "free_tier",
    is_active: true,
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      zip: "",
    },
  });

  useEffect(() => {
    setPageTitle("Company Management", Building2);
    loadCompanies();
  }, [setPageTitle]);

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, formData);
        toast({
          title: "Success",
          description: "Company updated successfully.",
        });
      } else {
        await createCompany(formData);
        toast({
          title: "Success",
          description: "Company created successfully.",
        });
      }
      setEditingCompany(null);
      setFormData({
        name: "",
        logo: "",
        plan: "free_tier",
        is_active: true,
        address: {
          street: "",
          city: "",
          state: "",
          country: "",
          zip: "",
        },
      });
      loadCompanies();
    } catch (error) {
      console.error("Error saving company:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save company. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      logo: company.logo || "",
      plan: company.plan,
      is_active: company.is_active,
      address: {
        street: company.address?.street || "",
        city: company.address?.city || "",
        state: company.address?.state || "",
        country: company.address?.country || "",
        zip: company.address?.zip || "",
      },
    });
  };

  const handleDelete = async (company: Company) => {
    if (!confirm("Are you sure you want to delete this company?")) return;
    try {
      await deleteCompany(company.id);
      toast({
        title: "Success",
        description: "Company deleted successfully.",
      });
      loadCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete company. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Companies</h1>
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
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={formData.logo}
                onChange={(e) =>
                  setFormData({ ...formData, logo: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="plan">Plan</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) =>
                  setFormData({ ...formData, plan: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_tier">Free Tier</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div>
              <Label>Address</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Street"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="City"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="State"
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Country"
                    value={formData.address.country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          country: e.target.value,
                        },
                      })
                    }
                  />
                  <Input
                    placeholder="ZIP"
                    value={formData.address.zip}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zip: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingCompany(null);
                  setFormData({
                    name: "",
                    logo: "",
                    plan: "free_tier",
                    is_active: true,
                    address: {
                      street: "",
                      city: "",
                      state: "",
                      country: "",
                      zip: "",
                    },
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingCompany ? "Update" : "Create"} Company
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
                  <th className="text-left p-4">Plan</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-t hover:bg-muted/50">
                    <td className="p-4">{company.name}</td>
                    <td className="p-4">{company.plan}</td>
                    <td className="p-4">
                      {company.is_active ? "Active" : "Inactive"}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(company)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(company)}
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
    </div>
  );
}
