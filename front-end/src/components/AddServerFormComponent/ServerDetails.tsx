import { Input } from "@/components/ui/input";
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

interface ServerDetailsProps {
  form: UseFormReturn<AddServerFormData>;
}

export const ServerDetails = ({ form }: ServerDetailsProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Server Name</FormLabel>
              <FormControl>
                <Input placeholder="Production RabbitMQ" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host</FormLabel>
              <FormControl>
                <Input placeholder="localhost" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="port"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Management API Port</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="15672"
                  {...field}
                  onChange={(e) => {
                    const port = parseInt(e.target.value) || 0;
                    field.onChange(port);

                    // Auto-detect HTTPS based on common HTTPS ports
                    if ([443, 15671, 8443, 9443].includes(port)) {
                      form.setValue("useHttps", true);
                    } else if ([80, 15672, 8080, 9090].includes(port)) {
                      form.setValue("useHttps", false);
                    }
                  }}
                />
              </FormControl>
              <div className="text-xs text-muted-foreground mt-1">
                Default: 15672
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amqpPort"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AMQP Protocol Port</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="5672"
                  {...field}
                  onChange={(e) => {
                    const port = parseInt(e.target.value) || 0;
                    field.onChange(port);
                  }}
                />
              </FormControl>
              <div className="text-xs text-muted-foreground mt-1">
                Default: 5672
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="useHttps"
          render={({ field }) => (
            <FormItem className="flex items-center justify-center space-x-3 space-y-0">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-medium">Use HTTPS</FormLabel>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="vhost"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Virtual Host</FormLabel>
            <FormControl>
              <Input placeholder="/" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
