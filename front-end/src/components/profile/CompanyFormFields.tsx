import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyFormState } from "./profileUtils";

interface CompanyFormFieldsProps {
  editingCompany: boolean;
  isAdmin: boolean;
  companyForm: CompanyFormState;
  setCompanyForm: (form: CompanyFormState) => void;
  company: {
    name: string;
    contactEmail?: string;
    logoUrl?: string;
    planType: string;
  };
}

export const CompanyFormFields = ({
  editingCompany,
  isAdmin,
  companyForm,
  setCompanyForm,
  company,
}: CompanyFormFieldsProps) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          {editingCompany && isAdmin ? (
            <Input
              id="companyName"
              value={companyForm.name}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  name: e.target.value,
                })
              }
            />
          ) : (
            <p className="text-sm p-2 border rounded-md bg-muted">
              {company.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          {editingCompany && isAdmin ? (
            <Input
              id="contactEmail"
              type="email"
              value={companyForm.contactEmail}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  contactEmail: e.target.value,
                })
              }
            />
          ) : (
            <p className="text-sm p-2 border rounded-md bg-muted">
              {company.contactEmail || "Not set"}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          {editingCompany && isAdmin ? (
            <Input
              id="logoUrl"
              type="url"
              value={companyForm.logoUrl}
              onChange={(e) =>
                setCompanyForm({
                  ...companyForm,
                  logoUrl: e.target.value,
                })
              }
            />
          ) : (
            <p className="text-sm p-2 border rounded-md bg-muted">
              {company.logoUrl || "Not set"}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="planType">Plan Type</Label>
          {editingCompany && isAdmin ? (
            <Select
              value={companyForm.planType}
              onValueChange={(value) =>
                setCompanyForm({
                  ...companyForm,
                  planType: value as "FREE" | "PREMIUM" | "ENTERPRISE",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm p-2 border rounded-md bg-muted">
              {company.planType}
            </p>
          )}
        </div>
      </div>
    </>
  );
};
