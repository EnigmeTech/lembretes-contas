import type { Timestamp } from "firebase/firestore";

export type PaymentStatus = "open" | "paid" | "overdue";

export type IptuInstallmentDoc = {
  uid: string;
  propertyId: string;
  propertyName: string;
  responsibleName: string;
  iptuYear: number;
  installmentNumber: number; // 1..N
  dueDate: Timestamp;
  amount: number;
  status: PaymentStatus;
  paidAt?: Timestamp;
  createdAt: Timestamp;
};
export interface PropertyDoc {
  uid: string;
  responsibleName: string;
  propertyName: string;
  address?: string; // ✅ novo

  rentValue: number;
  rentFirstDueDate: any;
  rentRecurrenceMonths: number;

  iptuTotal?: number;
  iptuInstallments?: number;
  iptuYear?: number;
  iptuFirstDueDate?: any;

  createdAt: any;
}
export interface RentPaymentDoc {
  uid: string;
  propertyId: string;
  propertyName: string;
  responsibleName: string;
  propertyAddress?: string; // ✅ novo (snapshot no lançamento)

  referenceMonth: string;
  dueDate: any;
  amount: number;
  status: "open" | "overdue" | "paid";
  createdAt: any;
  paidAt?: any;
}
