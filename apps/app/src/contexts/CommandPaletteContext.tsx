import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * App-wide command palette (⌘K) controller. Lives at the authenticated
 * shell level so every surface inside `Layout` — the sidebar "Search…"
 * button and the app-bar search icon alike — can open the same single
 * palette instance. The ⌘K / Ctrl+K hotkey is installed once here.
 *
 * The palette itself (`<CommandPalette>`) is rendered by the provider, so
 * consumers only ever need `open()` / `close()` / `isOpen`.
 */
type CommandPaletteContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (next: boolean) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Global ⌘K / Ctrl+K toggle. Ctrl/Cmd+B is already owned by the sidebar
  // toggle (SidebarProvider) — no collision.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore key-repeat (held combo) and IME composition.
      if (e.repeat || e.isComposing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ isOpen, open, close, setOpen: setIsOpen }),
    [isOpen, open, close]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider"
    );
  }
  return ctx;
}
