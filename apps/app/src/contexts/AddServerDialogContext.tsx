import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { AddServerForm } from "@/components/AddServerFormComponent";

/**
 * App-wide "Add server" dialog controller. The single AddServerForm instance
 * lives here, at the authenticated shell level — ABOVE the routed pages — so
 * its scanning → done reveal survives the very state change it triggers:
 * adding the first server flips `hasServers`, which swaps a page from its
 * `NoServerConfigured` empty state to real content. A form hosted inside that
 * empty state would unmount mid-reveal (the user gets bounced straight to the
 * page); hosted here it does not.
 *
 * Consumers (e.g. NoServerConfigured) only call `open()`.
 */
type AddServerDialogContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (next: boolean) => void;
};

const AddServerDialogContext =
  createContext<AddServerDialogContextValue | null>(null);

export function AddServerDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, open, close, setOpen: setIsOpen }),
    [isOpen, open, close]
  );

  return (
    <AddServerDialogContext.Provider value={value}>
      {children}
      <AddServerForm isOpen={isOpen} onOpenChange={setIsOpen} />
    </AddServerDialogContext.Provider>
  );
}

export function useAddServerDialog(): AddServerDialogContextValue {
  const ctx = useContext(AddServerDialogContext);
  if (!ctx) {
    throw new Error(
      "useAddServerDialog must be used within an AddServerDialogProvider"
    );
  }
  return ctx;
}
