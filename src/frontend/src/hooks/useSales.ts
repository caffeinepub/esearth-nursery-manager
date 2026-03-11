import { useCallback } from "react";
import type { Invoice, InvoiceLineItem, PaymentMethod } from "../types";
import { useInventory } from "./useInventory";
import { useSharedBackendData } from "./useSharedBackendData";

const BACKEND_KEY = "esearth_invoices_v3";

function calcSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

export function useSales() {
  const { data: invoices, saveData: saveInvoices } = useSharedBackendData<
    Invoice[]
  >(BACKEND_KEY, []);

  const { deductStock } = useInventory();

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

      await saveInvoices([newInvoice, ...invoices]);
      return newInvoice;
    },
    [invoices, saveInvoices, deductStock],
  );

  const updateInvoice = useCallback(
    (id: string, updates: Partial<Omit<Invoice, "id">>) => {
      saveInvoices(
        invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv)),
      );
    },
    [invoices, saveInvoices],
  );

  const deleteInvoice = useCallback(
    (id: string) => {
      saveInvoices(invoices.filter((inv) => inv.id !== id));
    },
    [invoices, saveInvoices],
  );

  const togglePaid = useCallback(
    (id: string) => {
      saveInvoices(
        invoices.map((inv) =>
          inv.id === id ? { ...inv, paid: !inv.paid } : inv,
        ),
      );
    },
    [invoices, saveInvoices],
  );

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
