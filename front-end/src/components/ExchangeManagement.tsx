import { useState } from "react";

import { HelpCircle, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useCreateExchange } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";

interface ExchangeManagementProps {
  serverId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const CreateExchangeDialog = ({
  serverId,
  isOpen,
  onClose,
}: ExchangeManagementProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [exchangeName, setExchangeName] = useState("");
  const [exchangeType, setExchangeType] = useState<string>("");
  const [durable, setDurable] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [internal, setInternal] = useState(false);
  const [arguments_, setArguments] = useState("");

  const createExchangeMutation = useCreateExchange();

  const handleCreateExchange = async () => {
    if (!exchangeName || !exchangeType) {
      toast({
        title: "Validation Error",
        description: "Exchange name and type are required",
        variant: "destructive",
      });
      return;
    }

    // Parse arguments if provided
    let parsedArguments = {};
    if (arguments_.trim()) {
      try {
        parsedArguments = JSON.parse(arguments_);
      } catch {
        toast({
          title: "Validation Error",
          description: "Arguments must be valid JSON",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await createExchangeMutation.mutateAsync({
        serverId,
        exchangeData: {
          name: exchangeName,
          type: exchangeType,
          durable,
          auto_delete: autoDelete,
          internal,
          arguments: parsedArguments,
        },
      });

      toast({
        title: "Success",
        description: `Exchange "${exchangeName}" created successfully`,
      });

      // Reset form and close modal
      setExchangeName("");
      setExchangeType("");
      setDurable(true);
      setAutoDelete(false);
      setInternal(false);
      setArguments("");
      if (isOpen !== undefined && onClose) {
        onClose();
      } else {
        setOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create exchange",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={isOpen !== undefined ? isOpen : open}
      onOpenChange={(open) => {
        if (isOpen !== undefined) {
          // External control
          if (!open && onClose) {
            onClose();
          }
        } else {
          // Internal control
          setOpen(open);
        }
      }}
    >
      {isOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Exchange
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <TooltipProvider>
          <DialogHeader>
            <DialogTitle>Create New Exchange</DialogTitle>
            <DialogDescription>
              Create a new RabbitMQ exchange to route messages between queues.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6 px-1 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="exchange-name"
                  className="text-base font-medium"
                >
                  Exchange Name
                </Label>
                <Input
                  id="exchange-name"
                  value={exchangeName}
                  onChange={(e) => setExchangeName(e.target.value)}
                  placeholder="Enter exchange name"
                  disabled={createExchangeMutation.isPending}
                  className="h-11 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 focus:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="exchange-type"
                  className="text-base font-medium"
                >
                  Exchange Type
                </Label>
                <Select value={exchangeType} onValueChange={setExchangeType}>
                  <SelectTrigger className="h-11 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 focus:ring-offset-0">
                    <SelectValue placeholder="Select exchange type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="fanout">Fanout</SelectItem>
                    <SelectItem value="topic">Topic</SelectItem>
                    <SelectItem value="headers">Headers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">Exchange Options</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="durable"
                    checked={durable}
                    onCheckedChange={(checked) => setDurable(checked === true)}
                    disabled={createExchangeMutation.isPending}
                    className="focus:ring-2 focus:ring-orange-200 focus:ring-offset-0"
                  />
                  <Label htmlFor="durable" className="text-sm font-medium">
                    Durable
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="z-50">
                      <p className="max-w-xs">
                        Durable exchanges survive broker restarts. If unchecked,
                        the exchange will be deleted when the broker restarts.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="auto-delete"
                    checked={autoDelete}
                    onCheckedChange={(checked) =>
                      setAutoDelete(checked === true)
                    }
                    disabled={createExchangeMutation.isPending}
                    className="focus:ring-2 focus:ring-orange-200 focus:ring-offset-0"
                  />
                  <Label htmlFor="auto-delete" className="text-sm font-medium">
                    Auto Delete
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="z-50">
                      <p className="max-w-xs">
                        Auto-delete exchanges are automatically deleted when the
                        last queue is unbound from it.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="internal"
                    checked={internal}
                    onCheckedChange={(checked) => setInternal(checked === true)}
                    disabled={createExchangeMutation.isPending}
                    className="focus:ring-2 focus:ring-orange-200 focus:ring-offset-0"
                  />
                  <Label htmlFor="internal" className="text-sm font-medium">
                    Internal
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="z-50">
                      <p className="max-w-xs">
                        Internal exchanges cannot be published to directly by
                        clients. They can only receive messages from other
                        exchanges.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Arguments</Label>
              </div>
              <Textarea
                value={arguments_}
                onChange={(e) => setArguments(e.target.value)}
                placeholder='{ "key": value }'
                disabled={createExchangeMutation.isPending}
                className="min-h-[120px] font-mono text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 focus:ring-offset-0"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Available options:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const newArg =
                            '"alternate-exchange": "exchange-name"';
                          const currentValue = arguments_.trim();
                          if (currentValue === "") {
                            setArguments(`{ ${newArg} }`);
                          } else if (currentValue === "{}") {
                            setArguments(`{ ${newArg} }`);
                          } else {
                            // Add to existing JSON
                            const cleanValue = currentValue.replace(/}$/, "");
                            const separator = cleanValue.endsWith("{")
                              ? ""
                              : ", ";
                            setArguments(
                              `${cleanValue}${separator}${newArg} }`
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                      >
                        alternate-exchange
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-50">
                      <p className="max-w-xs">
                        Specifies an alternate exchange to route messages that
                        cannot be routed by this exchange
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const newArg = '"x-message-deduplication": true';
                          const currentValue = arguments_.trim();
                          if (currentValue === "") {
                            setArguments(`{ ${newArg} }`);
                          } else if (currentValue === "{}") {
                            setArguments(`{ ${newArg} }`);
                          } else {
                            const cleanValue = currentValue.replace(/}$/, "");
                            const separator = cleanValue.endsWith("{")
                              ? ""
                              : ", ";
                            setArguments(
                              `${cleanValue}${separator}${newArg} }`
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                      >
                        x-message-deduplication
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-50">
                      <p className="max-w-xs">
                        Enable message deduplication for this exchange
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const newArg = '"x-cache-size": 1000';
                          const currentValue = arguments_.trim();
                          if (currentValue === "") {
                            setArguments(`{ ${newArg} }`);
                          } else if (currentValue === "{}") {
                            setArguments(`{ ${newArg} }`);
                          } else {
                            const cleanValue = currentValue.replace(/}$/, "");
                            const separator = cleanValue.endsWith("{")
                              ? ""
                              : ", ";
                            setArguments(
                              `${cleanValue}${separator}${newArg} }`
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                      >
                        x-cache-size
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-50">
                      <p className="max-w-xs">
                        Set the deduplication cache size (number of messages to
                        remember)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const newArg = '"x-cache-ttl": 3600000';
                          const currentValue = arguments_.trim();
                          if (currentValue === "") {
                            setArguments(`{ ${newArg} }`);
                          } else if (currentValue === "{}") {
                            setArguments(`{ ${newArg} }`);
                          } else {
                            const cleanValue = currentValue.replace(/}$/, "");
                            const separator = cleanValue.endsWith("{")
                              ? ""
                              : ", ";
                            setArguments(
                              `${cleanValue}${separator}${newArg} }`
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                      >
                        x-cache-ttl
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-50">
                      <p className="max-w-xs">
                        Set the deduplication cache TTL in milliseconds (how
                        long to remember messages)
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const newArg = '"x-cache-persistence": "memory"';
                          const currentValue = arguments_.trim();
                          if (currentValue === "") {
                            setArguments(`{ ${newArg} }`);
                          } else if (currentValue === "{}") {
                            setArguments(`{ ${newArg} }`);
                          } else {
                            const cleanValue = currentValue.replace(/}$/, "");
                            const separator = cleanValue.endsWith("{")
                              ? ""
                              : ", ";
                            setArguments(
                              `${cleanValue}${separator}${newArg} }`
                            );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-800 rounded-md border hover:border-orange-300 transition-colors"
                      >
                        x-cache-persistence
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-50">
                      <p className="max-w-xs">
                        Set the deduplication cache persistence type (memory or
                        disk)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreateExchange}
              disabled={
                createExchangeMutation.isPending ||
                !exchangeName ||
                !exchangeType
              }
              className="w-full h-12 text-base btn-primary"
            >
              {createExchangeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Exchange
                </>
              )}
            </Button>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};

export default CreateExchangeDialog;
