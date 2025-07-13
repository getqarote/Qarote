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
  const sslEnabled = form.watch("sslConfig.enabled");

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base font-medium">SSL Configuration</Label>

        <FormField
          control={form.control}
          name="sslConfig.enabled"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-3 space-y-0">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-medium">
                Enable SSL/TLS
              </FormLabel>
            </FormItem>
          )}
        />

        {sslEnabled && (
          <div className="space-y-6 ml-6 pl-6 border-l-2 border-blue-200 bg-blue-50/30 px-5 py-4 rounded-r-lg">
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="sslConfig.caCertPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      CA Certificate Path (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="/path/to/ca-cert.pem" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sslConfig.clientCertPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Client Certificate Path (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="/path/to/client-cert.pem"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sslConfig.clientKeyPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Client Key Path (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="/path/to/client-key.pem" {...field} />
                    </FormControl>
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
        )}
      </div>
    </div>
  );
};
