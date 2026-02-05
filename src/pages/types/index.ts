import type { Timestamp } from "firebase/firestore";

export type PaymentStatus = "open" | "paid" | "overdue";

export type PropertyDoc = {
  uid: string;
  responsibleName: string;
  propertyName: string;
  rentValue: number;

  // aluguel (data completa + recorrência)
  rentFirstDueDate?: Timestamp; // data do 1º / próximo vencimento
  rentRecurrenceMonths?: number; // 1 = mensal, 2 = bimestral...

  // IPTU
  iptuTotal?: number;
  iptuInstallments?: number;
  iptuYear?: number;

  // IPTU: data completa (1ª parcela)
  iptuFirstDueDate?: Timestamp;

  createdAt: Timestamp;
};

export type RentPaymentDoc = {
  uid: string;
  propertyId: string;
  propertyName: string;
  responsibleName: string;
  referenceMonth: string; // "2026-02"
  dueDate: Timestamp;
  amount: number;
  status: PaymentStatus;
  paidAt?: Timestamp;
  createdAt: Timestamp;
};

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
