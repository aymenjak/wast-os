import { multiplyQuantity, taxFor, type Minor } from "@/lib/money";
import { DomainError } from "./errors";
import type { InvoiceStatus } from "@/lib/generated/prisma/enums";

export type LineInput = { quantity: string; unitPriceMinor: Minor; taxRateBps: number };
export type LineAmounts = { subtotal: Minor; tax: Minor; total: Minor };

export function computeLine(line: LineInput): LineAmounts {
  if (line.unitPriceMinor < 0) throw new DomainError("errors.invoice.negativePrice");
  const subtotal = multiplyQuantity(line.quantity, line.unitPriceMinor);
  if (subtotal <= 0 && line.unitPriceMinor > 0) throw new DomainError("errors.invoice.invalidQuantity");
  const tax = taxFor(subtotal, line.taxRateBps);
  return { subtotal, tax, total: subtotal + tax };
}

/** Tax is computed per line and summed, so totals always equal the sum of printed lines. */
export function computeTotals(lines: LineAmounts[]): LineAmounts {
  return lines.reduce(
    (acc, l) => ({ subtotal: acc.subtotal + l.subtotal, tax: acc.tax + l.tax, total: acc.total + l.total }),
    { subtotal: 0, tax: 0, total: 0 },
  );
}

/** Applies a payment to an invoice balance. Overpayment and payments on non-open invoices are rejected. */
export function applyPayment(
  status: InvoiceStatus,
  totalMinor: Minor,
  paidMinor: Minor,
  amountMinor: Minor,
): { paid: Minor; status: InvoiceStatus } {
  if (status !== "ISSUED" && status !== "PARTIALLY_PAID") throw new DomainError("errors.payment.invoiceNotOpen");
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new DomainError("errors.payment.invalidAmount");
  const paid = paidMinor + amountMinor;
  if (paid > totalMinor) throw new DomainError("errors.payment.exceedsBalance", { balance: totalMinor - paidMinor });
  return { paid, status: paid === totalMinor ? "PAID" : "PARTIALLY_PAID" };
}

/** Status after reversing a payment (e.g. bounced cheque). */
export function reversePayment(totalMinor: Minor, paidMinor: Minor, amountMinor: Minor): { paid: Minor; status: InvoiceStatus } {
  const paid = paidMinor - amountMinor;
  if (paid < 0) throw new DomainError("errors.payment.invalidAmount");
  return { paid, status: paid === 0 ? "ISSUED" : paid === totalMinor ? "PAID" : "PARTIALLY_PAID" };
}
