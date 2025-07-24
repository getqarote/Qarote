import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import type { AddServerFormData } from "@/schemas/forms";

interface SSLConfigurationProps {
  form: UseFormReturn<AddServerFormData>;
}

export const SSLConfiguration = ({ form }: SSLConfigurationProps) => {
  const useHttps = form.watch("useHttps");

  if (!useHttps) {
    return null; // Don't show SSL config if not using HTTPS
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-medium">
          SSL Configuration (Optional)
        </Label>

        <div className="space-y-6 ml-6 pl-6 border-l-2 border-blue-200 bg-blue-50/30 px-5 py-4 rounded-r-lg">
          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="sslConfig.caCertContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    CA Certificate (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      <Input
                        type="file"
                        accept=".pem,.crt,.cer,.ca-bundle"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              field.onChange(event.target?.result as string);
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {field.value && (
                        <div className="text-xs text-green-600">
                          Certificate loaded successfully
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Upload your CA certificate file (.pem, .crt, .cer, or
                    .ca-bundle)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sslConfig.clientCertContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Client Certificate (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      <Input
                        type="file"
                        accept=".pem,.crt,.cer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              field.onChange(event.target?.result as string);
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {field.value && (
                        <div className="text-xs text-green-600">
                          Certificate loaded successfully
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Upload your client certificate file (.pem, .crt, or .cer)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sslConfig.clientKeyContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Client Key (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      <Input
                        type="file"
                        accept=".pem,.key"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              field.onChange(event.target?.result as string);
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {field.value && (
                        <div className="text-xs text-green-600">
                          Key loaded successfully
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Upload your client key file (.pem or .key)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sslConfig.verifyPeer"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium">
                    Verify SSL Certificate
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
