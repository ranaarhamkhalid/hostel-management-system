import React, { createContext, useContext, useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { Btn } from '../components/ui/Btn';

const ConfirmationContext = createContext();

export function ConfirmationProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({ title: "", message: "", confirmText: "Confirm", cancelText: "Cancel", variant: "primary" });
  const [resolver, setResolver] = useState(null);

  const confirm = (message, title = "Confirm Action", confirmText = "Yes", cancelText = "No", variant = "primary") => {
    setOptions({ title, message, confirmText, cancelText, variant });
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    if (resolver) resolver(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    setIsOpen(false);
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <Modal open={isOpen} onClose={handleCancel} title={options.title}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 14, color: "var(--text)" }}>
            {options.message}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn variant="ghost" onClick={handleCancel}>{options.cancelText}</Btn>
            <Btn variant={options.variant} onClick={handleConfirm}>{options.confirmText}</Btn>
          </div>
        </div>
      </Modal>
    </ConfirmationContext.Provider>
  );
}

export const useConfirmation = () => useContext(ConfirmationContext);
