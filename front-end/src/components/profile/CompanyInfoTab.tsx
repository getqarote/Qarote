import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Settings,
  Users,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Company } from "@/lib/api/authTypes";
import { CompanyFormState, formatDate, getPlanColor } from "./profileUtils";
import { NoCompanyCard } from "./NoCompanyCard";
import { CompanyFormFields } from "./CompanyFormFields";

interface CompanyInfoTabProps {
  company: Company | undefined;
  isAdmin: boolean;
  editingCompany: boolean;
  companyForm: CompanyFormState;
  setCompanyForm: (form: CompanyFormState) => void;
  setEditingCompany: (editing: boolean) => void;
  onUpdateCompany: () => void;
  isUpdating: boolean;
}

export const CompanyInfoTab = ({
  company,
  isAdmin,
  editingCompany,
  companyForm,
  setCompanyForm,
  setEditingCompany,
  onUpdateCompany,
  isUpdating,
}: CompanyInfoTabProps) => {
  if (!company) {
    return <NoCompanyCard />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span>Company Information</span>
          </div>
          <Badge className={getPlanColor(company.planType)}>
            {company.planType}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CompanyFormFields
          editingCompany={editingCompany}
          isAdmin={isAdmin}
          companyForm={companyForm}
          setCompanyForm={setCompanyForm}
          company={company}
        />

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Users: {company._count?.users || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Servers: {company._count?.servers || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Created: {formatDate(company.createdAt)}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end gap-2">
            {editingCompany ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setEditingCompany(false)}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={onUpdateCompany} disabled={isUpdating}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditingCompany(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Company
              </Button>
            )}
          </div>
        )}

        {!isAdmin && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Only admin users can edit company information.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
