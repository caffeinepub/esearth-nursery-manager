import { useCallback, useEffect, useState } from "react";
import type { Invoice, InvoiceLineItem, PaymentMethod } from "../types";
import { useInventory } from "./useInventory";

const STORAGE_KEY = "esearth_invoices_v2";

function calcSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

export function useSales() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const { deductStock } = useInventory();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch {}
  }, [invoices]);

  const addInvoice = useCallback(
    async (
      invoiceData: Omit<Invoice, "id" | "createdAt">,
      performedBy: string,
    ) => {
      const newInvoice: Invoice = {
        ...invoiceData,
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString().split("T")[0],
      };

      // Deduct stock for each line item
      for (const lineItem of invoiceData.lineItems) {
        if (lineItem.inventoryItemId && lineItem.quantity > 0) {
          deductStock(
            lineItem.inventoryItemId,
            lineItem.quantity,
            performedBy,
            `Sales - ${invoiceData.invoiceNumber}`,
            "Sales",
          );
        }
      }

      setInvoices((prev) => [newInvoice, ...prev]);
      return newInvoice;
    },
    [deductStock],
  );

  const updateInvoice = useCallback(
    (id: string, updates: Partial<Omit<Invoice, "id">>) => {
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
      );
    },
    [],
  );

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  const togglePaid = useCallback((id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, paid: !inv.paid } : inv)),
    );
  }, []);

  const getInvoiceTotal = (invoice: Invoice) => calcSubtotal(invoice.lineItems);
  const getInvoiceSubtotal = (invoice: Invoice) =>
    calcSubtotal(invoice.lineItems);

  return {
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    togglePaid,
    getInvoiceTotal,
    getInvoiceSubtotal,
  };
}

export type { PaymentMethod };
