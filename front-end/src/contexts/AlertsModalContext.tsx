import React, { createContext, ReactNode, useState } from "react";

interface AlertsModalContextType {
  isThresholdsModalOpen: boolean;
  openThresholdsModal: () => void;
  closeThresholdsModal: () => void;
}

export const AlertsModalContext = createContext<
  AlertsModalContextType | undefined
>(undefined);

interface AlertsModalProviderProps {
  children: ReactNode;
}

export function AlertsModalProvider({ children }: AlertsModalProviderProps) {
  const [isThresholdsModalOpen, setIsThresholdsModalOpen] = useState(false);

  const openThresholdsModal = () => {
    setIsThresholdsModalOpen(true);
  };

  const closeThresholdsModal = () => {
    setIsThresholdsModalOpen(false);
  };

  return (
    <AlertsModalContext.Provider
      value={{
        isThresholdsModalOpen,
        openThresholdsModal,
        closeThresholdsModal,
      }}
    >
      {children}
    </AlertsModalContext.Provider>
  );
}
