import { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { db, auth as firebaseAuth } from "../services/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  TableRow,
  TableCell,
} from "@mui/material";

import Grid from "@mui/material/Grid";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PaidIcon from "@mui/icons-material/Paid";
import HomeIcon from "@mui/icons-material/Home";
import EditIcon from "@mui/icons-material/Edit";
import { toast } from "react-toastify";
import type {
  IptuInstallmentDoc,
  PaymentStatus,
  PropertyDoc,
  RentPaymentDoc,
} from "./types";
import {
  addMonths,
  formatDateInput,
  moneyBRL,
  normalizeDateToNoon,
  parseDateInput,
  statusChipColor,
  statusFromDueDate,
  statusLabel,
  ymFromDate,
} from "./utils";
import { downloadRentReceiptPdf } from "./helpers/generateRentReceiptPdf";
import { InfiniteTable } from "../components/InfiniteTable";

export function RentIptuControl() {
  const [uid, setUid] = useState<string | null>(null);

  const [properties, setProperties] = useState<
    Array<{ id: string } & PropertyDoc>
  >([]);
  const [rentPayments, setRentPayments] = useState<
    Array<{ id: string } & RentPaymentDoc>
  >([]);
  const [iptuInstallments, setIptuInstallments] = useState<
    Array<{ id: string } & IptuInstallmentDoc>
  >([]);

  const [loading, setLoading] = useState(true);

  // dialogs
  const [openProperty, setOpenProperty] = useState(false);
  const [openConfirmPay, setOpenConfirmPay] = useState(false);

  // confirm dialog (delete)
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>("");

  // NEW: dialog (edit settings)
  const [openEditSettings, setOpenEditSettings] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  // form property (create)
  const [responsibleName, setResponsibleName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [rentValue, setRentValue] = useState("0");

  const [rentFirstDueDate, setRentFirstDueDate] = useState(() =>
    formatDateInput(new Date())
  );
  const [rentRecurrenceMonths, setRentRecurrenceMonths] = useState("1");

  // IPTU (create)
  const [iptuTotal, setIptuTotal] = useState("");
  const [iptuInstallmentsCount, setIptuInstallmentsCount] = useState("10");
  const [iptuYear, setIptuYear] = useState(String(new Date().getFullYear()));
  const [iptuFirstDueDate, setIptuFirstDueDate] = useState(() =>
    formatDateInput(new Date())
  );

  // form edit settings (separado do create)
  const [editRentValue, setEditRentValue] = useState("0");
  const [editRentNextDueDate, setEditRentNextDueDate] = useState(() =>
    formatDateInput(new Date())
  );
  const [editRentRecurrenceMonths, setEditRentRecurrenceMonths] = useState("1");

  const [editIptuTotal, setEditIptuTotal] = useState("");
  const [editIptuInstallmentsCount, setEditIptuInstallmentsCount] =
    useState("10");
  const [editIptuYear, setEditIptuYear] = useState(
    String(new Date().getFullYear())
  );
  const [editIptuFirstDueDate, setEditIptuFirstDueDate] = useState(() =>
    formatDateInput(new Date())
  );

  // list filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "rent" | "iptu">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>(
    "all"
  );

  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // confirm pay
  const [confirmType, setConfirmType] = useState<"rent" | "iptu">("rent");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAmount, setConfirmAmount] = useState("0");
  const [address, setAddress] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // --- AUTH + LISTENERS
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        setUid(null);
        setLoading(false);
        return;
      }
      setUid(user.uid);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!uid) return;

    setLoading(true);

    const qProps = query(collection(db, "properties"), where("uid", "==", uid));
    const unsubProps = onSnapshot(qProps, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as PropertyDoc),
      }));
      setProperties(data);
    });

    const qRent = query(
      collection(db, "rent_payments"),
      where("uid", "==", uid)
    );
    const unsubRent = onSnapshot(qRent, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as RentPaymentDoc),
      }));
      setRentPayments(data);
      setLoading(false);
    });

    const qIptu = query(
      collection(db, "iptu_installments"),
      where("uid", "==", uid)
    );
    const unsubIptu = onSnapshot(qIptu, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as IptuInstallmentDoc),
      }));
      setIptuInstallments(data);
      setLoading(false);
    });

    return () => {
      unsubProps();
      unsubRent();
      unsubIptu();
    };
  }, [uid]);

  // --- HELPERS (create rent payment by dueDate if missing)
  const ensureRentForDueDate = async (
    property: { id: string } & PropertyDoc,
    dueDate: Date
  ) => {
    const referenceMonth = ymFromDate(dueDate);

    const q = query(
      collection(db, "rent_payments"),
      where("uid", "==", property.uid),
      where("propertyId", "==", property.id),
      where("referenceMonth", "==", referenceMonth)
    );

    const existing = await getDocs(q);
    if (!existing.empty) return;

    const due = normalizeDateToNoon(dueDate);

    const payload: Omit<RentPaymentDoc, "id"> = {
      uid: property.uid,
      propertyId: property.id,
      propertyName: property.propertyName,

      responsibleName: property.responsibleName,
      referenceMonth,
      dueDate: Timestamp.fromDate(due),
      amount: Number(property.rentValue || 0),
      status: statusFromDueDate(due, false),
      createdAt: Timestamp.now(),
    };

    await addDoc(collection(db, "rent_payments"), payload);
  };

  // --- HELPERS (create IPTU installments using iptuFirstDueDate as base)
  const createIptuInstallments = async (
    propertyId: string,
    prop: PropertyDoc
  ) => {
    const total = Number(prop.iptuTotal || 0);
    const installments = Number(prop.iptuInstallments || 0);
    const year = Number(prop.iptuYear || new Date().getFullYear());
    const firstDue = prop.iptuFirstDueDate?.toDate();

    if (!total || !installments) return;
    if (!firstDue) return;

    const q = query(
      collection(db, "iptu_installments"),
      where("uid", "==", prop.uid),
      where("propertyId", "==", propertyId),
      where("iptuYear", "==", year)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return;

    const amountPer = Number((total / installments).toFixed(2));
    const base = normalizeDateToNoon(firstDue);

    for (let i = 1; i <= installments; i++) {
      const due = addMonths(base, i - 1);

      const payload: Omit<IptuInstallmentDoc, "id"> = {
        uid: prop.uid,
        propertyId,
        propertyName: prop.propertyName,
        responsibleName: prop.responsibleName,
        iptuYear: year,
        installmentNumber: i,
        dueDate: Timestamp.fromDate(due),
        amount: amountPer,
        status: statusFromDueDate(due, false),
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "iptu_installments"), payload);
    }
  };

  // --- NEW: BATCH UPDATE HELPER
  const batchUpdateDocs = async (
    updates: Array<{ ref: ReturnType<typeof doc>; data: Record<string, any> }>
  ) => {
    let i = 0;
    while (i < updates.length) {
      const batch = writeBatch(db);
      const chunk = updates.slice(i, i + 450);
      chunk.forEach(({ ref, data }) => batch.update(ref, data));
      await batch.commit();
      i += 450;
    }
  };

  // --- NEW: SYNC RENT PAYMENTS AFTER EDIT (so list reflects updated values)
  const syncRentPaymentsFromProperty = async (args: {
    uid: string;
    propertyId: string;
    propertyName: string;
    propertyAddress?: string;
    responsibleName: string;
    newRentValue: number;
    rentNext: Date;
  }) => {
    const {
      uid,
      propertyId,
      propertyName,
      responsibleName,
      newRentValue,
      rentNext,
    } = args;

    const qAll = query(
      collection(db, "rent_payments"),
      where("uid", "==", uid),
      where("propertyId", "==", propertyId)
    );
    const snap = await getDocs(qAll);

    const nextYM = ymFromDate(rentNext);

    const updates: Array<{
      ref: ReturnType<typeof doc>;
      data: Record<string, any>;
    }> = [];

    snap.docs.forEach((d) => {
      const item = d.data() as RentPaymentDoc;

      // mantém nome/responsável consistente sempre
      const data: Record<string, any> = {
        propertyName,
        responsibleName,
        propertyAddress: (args as any).propertyAddress,
      };

      // só altera valor/vencimento/status se NÃO estiver pago (mantém histórico)
      if (item.status !== "paid") {
        data.amount = newRentValue;

        // se for o mês do "próximo vencimento" editado, atualiza o dueDate também
        if (item.referenceMonth === nextYM) {
          const due = normalizeDateToNoon(rentNext);
          data.dueDate = Timestamp.fromDate(due);
          data.status = statusFromDueDate(due, false);
        }
      }

      updates.push({ ref: doc(db, "rent_payments", d.id), data });
    });

    if (updates.length) await batchUpdateDocs(updates);
  };

  // --- NEW: SYNC IPTU INSTALLMENTS AFTER EDIT (so list reflects updated values)
  const syncIptuInstallmentsFromProperty = async (args: {
    uid: string;
    propertyId: string;
    propertyName: string;
    responsibleName: string;
    iptuTotal: number;
    iptuInstallments: number;
    iptuYear: number;
    iptuFirstDueDate: Date;
  }) => {
    const {
      uid,
      propertyId,
      propertyName,
      responsibleName,
      iptuTotal,
      iptuInstallments,
      iptuYear,
      iptuFirstDueDate,
    } = args;

    const qIptu = query(
      collection(db, "iptu_installments"),
      where("uid", "==", uid),
      where("propertyId", "==", propertyId),
      where("iptuYear", "==", iptuYear)
    );
    const snap = await getDocs(qIptu);
    if (snap.empty) return;

    const amountPer = Number((iptuTotal / iptuInstallments).toFixed(2));
    const baseFirst = normalizeDateToNoon(iptuFirstDueDate);

    const updates: Array<{
      ref: ReturnType<typeof doc>;
      data: Record<string, any>;
    }> = [];

    snap.docs.forEach((d) => {
      const item = d.data() as IptuInstallmentDoc;

      const data: Record<string, any> = {
        propertyName,
        responsibleName,
      };

      // só altera parcelas NÃO pagas (mantém histórico)
      if (item.status !== "paid") {
        data.amount = amountPer;

        const due = addMonths(baseFirst, (item.installmentNumber ?? 1) - 1);
        data.dueDate = Timestamp.fromDate(due);
        data.status = statusFromDueDate(due, false);
      }

      updates.push({ ref: doc(db, "iptu_installments", d.id), data });
    });

    if (updates.length) await batchUpdateDocs(updates);
  };

  // --- CREATE PROPERTY
  const handleCreateProperty = async () => {
    if (!uid) return;

    if (!responsibleName.trim() || !propertyName.trim() || !Number(rentValue)) {
      toast.error("Responsável, imóvel e valor do aluguel são obrigatórios.");
      return;
    }

    const rentStart = parseDateInput(rentFirstDueDate);
    if (!rentStart) {
      toast.error("Selecione a data de vencimento do aluguel.");
      return;
    }

    const recurrence = Math.max(1, Number(rentRecurrenceMonths || 1));

    const iptuStart = parseDateInput(iptuFirstDueDate);
    const iptuYearNum = iptuYear ? Number(iptuYear) : new Date().getFullYear();

    const prop: PropertyDoc = {
      uid,
      responsibleName: responsibleName.trim(),
      propertyName: propertyName.trim(),
      address: address.trim() || undefined,
      rentValue: Number(rentValue),

      rentFirstDueDate: Timestamp.fromDate(normalizeDateToNoon(rentStart)),
      rentRecurrenceMonths: recurrence,

      iptuTotal: iptuTotal ? Number(iptuTotal) : undefined,
      iptuInstallments: iptuInstallmentsCount
        ? Number(iptuInstallmentsCount)
        : undefined,
      iptuYear: iptuYearNum,
      iptuFirstDueDate:
        iptuTotal && iptuStart
          ? Timestamp.fromDate(normalizeDateToNoon(iptuStart))
          : undefined,

      createdAt: Timestamp.now(),
    };

    try {
      const ref = await addDoc(collection(db, "properties"), prop);

      // cria o aluguel a partir da data escolhida
      await ensureRentForDueDate({ id: ref.id, ...prop }, rentStart);

      // cria IPTU a partir da data escolhida (se informado)
      await createIptuInstallments(ref.id, prop);

      toast.success("Imóvel cadastrado!");
      setOpenProperty(false);

      setResponsibleName("");
      setPropertyName("");
      setAddress("");
      setRentValue("0");
      setRentFirstDueDate(formatDateInput(new Date()));
      setRentRecurrenceMonths("1");

      setIptuTotal("");
      setIptuInstallmentsCount("10");
      setIptuYear(String(new Date().getFullYear()));
      setIptuFirstDueDate(formatDateInput(new Date()));
    } catch (e) {
      console.error(e);
      toast.error("Erro ao cadastrar imóvel.");
    }
  };

  // --- OPEN DELETE CONFIRM
  const openDeleteDialog = (propId: string, propName: string) => {
    setDeleteTargetId(propId);
    setDeleteTargetName(propName);
    setOpenDeleteConfirm(true);
  };

  // --- DELETE PROPERTY + RELATED DOCS (confirmado)
  const handleDeletePropertyConfirmed = async () => {
    if (!uid) return;
    if (!deleteTargetId) return;

    const propId = deleteTargetId;

    try {
      const rentQ = query(
        collection(db, "rent_payments"),
        where("uid", "==", uid),
        where("propertyId", "==", propId)
      );
      const iptuQ = query(
        collection(db, "iptu_installments"),
        where("uid", "==", uid),
        where("propertyId", "==", propId)
      );

      const [rentSnap, iptuSnap] = await Promise.all([
        getDocs(rentQ),
        getDocs(iptuQ),
      ]);

      const refsToDelete: Array<ReturnType<typeof doc>> = [];

      rentSnap.docs.forEach((d) =>
        refsToDelete.push(doc(db, "rent_payments", d.id))
      );
      iptuSnap.docs.forEach((d) =>
        refsToDelete.push(doc(db, "iptu_installments", d.id))
      );

      refsToDelete.push(doc(db, "properties", propId));

      let i = 0;
      while (i < refsToDelete.length) {
        const batch = writeBatch(db);
        const chunk = refsToDelete.slice(i, i + 450);
        chunk.forEach((r) => batch.delete(r));
        await batch.commit();
        i += 450;
      }

      toast.success("Imóvel e lançamentos removidos.");
      setOpenDeleteConfirm(false);
      setDeleteTargetId(null);
      setDeleteTargetName("");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover imóvel e lançamentos.");
    }
  };

  // --- OPEN EDIT SETTINGS
  const openEditDialog = (prop: { id: string } & PropertyDoc) => {
    setEditTargetId(prop.id);

    setEditRentValue(String(prop.rentValue ?? 0));
    setEditAddress(prop.address ?? "");

    const nextRent = prop.rentFirstDueDate?.toDate() ?? new Date();
    setEditRentNextDueDate(formatDateInput(nextRent));

    setEditRentRecurrenceMonths(String(prop.rentRecurrenceMonths ?? 1));

    setEditIptuTotal(prop.iptuTotal ? String(prop.iptuTotal) : "");
    setEditIptuInstallmentsCount(String(prop.iptuInstallments ?? 10));
    setEditIptuYear(String(prop.iptuYear ?? new Date().getFullYear()));

    const firstIptu = prop.iptuFirstDueDate?.toDate() ?? new Date();
    setEditIptuFirstDueDate(formatDateInput(firstIptu));

    setOpenEditSettings(true);
  };

  // --- SAVE EDIT SETTINGS
  const saveEditSettings = async () => {
    if (!uid) return;
    if (!editTargetId) return;

    const prop = properties.find((p) => p.id === editTargetId);
    if (!prop) return;

    const newRentValue = Number(editRentValue || 0);
    if (!newRentValue) {
      toast.error("Valor do aluguel inválido.");
      return;
    }

    const rentNext = parseDateInput(editRentNextDueDate);
    if (!rentNext) {
      toast.error("Selecione a data do próximo vencimento do aluguel.");
      return;
    }

    const recurrence = Math.max(1, Number(editRentRecurrenceMonths || 1));

    const iptuTotalNum = editIptuTotal ? Number(editIptuTotal) : undefined;
    const iptuInstallmentsNum = editIptuInstallmentsCount
      ? Number(editIptuInstallmentsCount)
      : undefined;
    const iptuYearNum = editIptuYear ? Number(editIptuYear) : undefined;

    const iptuStart = parseDateInput(editIptuFirstDueDate);

    try {
      // 1) Atualiza o imóvel
      await updateDoc(doc(db, "properties", editTargetId), {
        rentValue: newRentValue,
        address: editAddress.trim() || undefined,
        rentFirstDueDate: Timestamp.fromDate(normalizeDateToNoon(rentNext)),
        rentRecurrenceMonths: recurrence,

        iptuTotal: iptuTotalNum,
        iptuInstallments: iptuTotalNum ? iptuInstallmentsNum : undefined,
        iptuYear: iptuTotalNum ? iptuYearNum : undefined,
        iptuFirstDueDate:
          iptuTotalNum && iptuStart
            ? Timestamp.fromDate(normalizeDateToNoon(iptuStart))
            : undefined,
      });

      // 2) Garante que existe lançamento do aluguel para o mês do vencimento escolhido
      const updatedProp: { id: string } & PropertyDoc = {
        ...prop,
        rentValue: newRentValue,
        address: editAddress.trim() || undefined,
        rentFirstDueDate: Timestamp.fromDate(normalizeDateToNoon(rentNext)),
        rentRecurrenceMonths: recurrence,
        iptuTotal: iptuTotalNum,
        iptuInstallments: iptuTotalNum ? iptuInstallmentsNum : undefined,
        iptuYear: iptuTotalNum ? iptuYearNum : undefined,
        iptuFirstDueDate:
          iptuTotalNum && iptuStart
            ? Timestamp.fromDate(normalizeDateToNoon(iptuStart))
            : undefined,
      };

      await ensureRentForDueDate(updatedProp, rentNext);
      if (iptuTotalNum && iptuInstallmentsNum && iptuYearNum && iptuStart) {
        await createIptuInstallments(editTargetId, updatedProp);
      }
      await syncRentPaymentsFromProperty({
        uid,
        propertyId: editTargetId,
        propertyName: updatedProp.propertyName,
        propertyAddress: updatedProp.address,
        responsibleName: updatedProp.responsibleName,
        newRentValue,
        rentNext,
      });

      if (iptuTotalNum && iptuInstallmentsNum && iptuYearNum && iptuStart) {
        await syncIptuInstallmentsFromProperty({
          uid,
          propertyId: editTargetId,
          propertyName: updatedProp.propertyName,
          responsibleName: updatedProp.responsibleName,
          iptuTotal: iptuTotalNum,
          iptuInstallments: iptuInstallmentsNum,
          iptuYear: iptuYearNum,
          iptuFirstDueDate: iptuStart,
        });
      }

      toast.success("Configurações atualizadas!");
      setOpenEditSettings(false);
      setEditTargetId(null);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar configurações.");
    }
  };

  // --- OPEN CONFIRM PAY
  const openConfirm = (type: "rent" | "iptu", id: string, amount: number) => {
    setConfirmType(type);
    setConfirmId(id);
    setConfirmAmount(String(amount ?? 0));
    setOpenConfirmPay(true);
  };

  // --- CONFIRM PAY
  const confirmPayment = async () => {
    if (!confirmId) return;

    try {
      const now = Timestamp.fromDate(new Date());
      const amount = Number(confirmAmount || 0);

      if (confirmType === "rent") {
        const item = rentPayments.find((x) => x.id === confirmId);
        if (!item) return;

        const prop = properties.find((p) => p.id === item.propertyId);

        const paidDate = new Date();
        const now = Timestamp.fromDate(paidDate);

        // valor pago que você vai salvar (pode continuar usando o input)
        const amountPaid = Number(confirmAmount || 0);

        await updateDoc(doc(db, "rent_payments", confirmId), {
          status: "paid",
          paidAt: now,
          amount: amountPaid,
        });
        const receiptAmount = Number(prop?.rentValue ?? amountPaid);

        downloadRentReceiptPdf({
          propertyName: item.propertyName,
          propertyAddress: prop?.address ?? item.propertyAddress ?? "-",
          responsibleName: item.responsibleName,
          referenceMonth: item.referenceMonth,
          amount: receiptAmount,
          paidAt: paidDate,
        });

        const stepMonths = Math.max(1, Number(prop?.rentRecurrenceMonths ?? 1));
        const nextDue = addMonths(item.dueDate.toDate(), stepMonths);

        if (prop) {
          await ensureRentForDueDate(prop, nextDue);
        }

        toast.success(
          "Aluguel confirmado, recibo baixado e próximo vencimento criado!"
        );
      } else {
        const item = iptuInstallments.find((x) => x.id === confirmId);
        if (!item) return;

        await updateDoc(doc(db, "iptu_installments", confirmId), {
          status: "paid",
          paidAt: now,
          amount,
        });

        toast.success("Parcela do IPTU confirmada!");
      }

      setOpenConfirmPay(false);
      setConfirmId(null);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao confirmar pagamento.");
    }
  };

  // --- REFRESH STATUSES
  const refreshStatuses = async () => {
    try {
      for (const p of rentPayments) {
        const due = p.dueDate.toDate();
        const should = statusFromDueDate(due, p.status === "paid");
        if (should !== p.status) {
          await updateDoc(doc(db, "rent_payments", p.id), { status: should });
        }
      }

      for (const p of iptuInstallments) {
        const due = p.dueDate.toDate();
        const should = statusFromDueDate(due, p.status === "paid");
        if (should !== p.status) {
          await updateDoc(doc(db, "iptu_installments", p.id), {
            status: should,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!uid) return;
    if (rentPayments.length || iptuInstallments.length) refreshStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // --- SUMMARY
  const rentSummary = useMemo(() => {
    const nowYM = ymFromDate(new Date());
    let due = 0,
      paid = 0,
      overdue = 0,
      open = 0;

    rentPayments.forEach((p) => {
      if (p.referenceMonth === nowYM) due += p.amount || 0;
      if (p.status === "paid") paid += p.amount || 0;
      if (p.status === "overdue") overdue += p.amount || 0;
      if (p.status === "open") open += p.amount || 0;
    });

    return { due, paid, overdue, open };
  }, [rentPayments]);

  const iptuSummary = useMemo(() => {
    let due = 0,
      paid = 0,
      overdue = 0,
      open = 0;

    const nowYM = ymFromDate(new Date());

    iptuInstallments.forEach((p) => {
      const dueDate = p.dueDate.toDate();
      const itemYM = ymFromDate(dueDate);

      if (itemYM === nowYM) due += p.amount || 0;

      if (p.status === "paid") paid += p.amount || 0;
      if (p.status === "overdue") overdue += p.amount || 0;
      if (p.status === "open") open += p.amount || 0;
    });

    return { due, paid, overdue, open };
  }, [iptuInstallments]);

  // --- COMBINED LIST
  const rows = useMemo(() => {
    const rentRows = rentPayments.map((p) => ({
      type: "Aluguel" as const,
      id: p.id,
      propertyName: p.propertyName,
      responsibleName: p.responsibleName,
      label: p.referenceMonth,
      dueDate: p.dueDate.toDate(),
      amount: p.amount,
      status: p.status,
    }));

    const iptuRows = iptuInstallments.map((p) => ({
      type: "IPTU" as const,
      id: p.id,
      propertyName: p.propertyName,
      responsibleName: p.responsibleName,
      label: `${p.iptuYear} • Parcela ${p.installmentNumber}`,
      dueDate: p.dueDate.toDate(),
      amount: p.amount,
      status: p.status,
    }));

    return [...rentRows, ...iptuRows]
      .filter((r) => {
        const term = search.toLowerCase().trim();
        if (!term) return true;
        return (
          r.propertyName.toLowerCase().includes(term) ||
          r.responsibleName.toLowerCase().includes(term) ||
          r.label.toLowerCase().includes(term) ||
          r.type.toLowerCase().includes(term)
        );
      })
      .filter((r) =>
        typeFilter === "all"
          ? true
          : typeFilter === "rent"
          ? r.type === "Aluguel"
          : r.type === "IPTU"
      )
      .filter((r) =>
        statusFilter === "all" ? true : r.status === statusFilter
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [rentPayments, iptuInstallments, search, typeFilter, statusFilter]);

  const hasMoreRows = visibleCount < rows.length;

  const onLoadMoreRows = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, rows.length));
  };

  return (
    <Layout>
      <Box p={4} minHeight="100vh">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h4" color="primary">
            Controle de Pagamentos (Aluguel + IPTU)
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenProperty(true)}
          >
            Cadastrar imóvel
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Confirme pagamentos e acompanhe totais por status. Ao confirmar o
          aluguel, o próximo vencimento é gerado automaticamente conforme a
          recorrência.
        </Typography>

        {loading ? (
          <Box width="100%" display="flex" justifyContent="center" mt={6}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* SUMMARY CARDS */}
            <Grid container spacing={2} sx={{ marginBottom: 3 }}>
              <Grid sx={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <PaidIcon />
                      <Typography variant="h6">Aluguel</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={1}>
                      <Grid sx={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Devido (mês atual)
                        </Typography>
                        <Typography variant="h6">
                          {moneyBRL(rentSummary.due)}
                        </Typography>
                      </Grid>
                      <Grid sx={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Pago
                        </Typography>
                        <Typography variant="h6">
                          {moneyBRL(rentSummary.paid)}
                        </Typography>
                      </Grid>
                      <Grid sx={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Atrasado
                        </Typography>
                        <Typography variant="h6">
                          {moneyBRL(rentSummary.overdue)}
                        </Typography>
                      </Grid>
                      <Grid sx={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Em aberto
                        </Typography>
                        <Typography variant="h6">
                          {moneyBRL(rentSummary.open)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid sx={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <HomeIcon />
                      <Typography variant="h6">IPTU</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={1}>
                      <Grid sx={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Devido (mês atual)
                        </Typography>
                        <Typography variant="h6">
                          {moneyBRL(iptuSummary.due)}
                        </Typography>
                      </Grid>
                      <Grid sx={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Pago
                        </Typography>
                        <Typography variant="h6">
                          {moneyBRL(iptuSummary.paid)}
                        </Typography>
                      </Grid>
                      <Grid sx={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Atrasado
                        </Typography>
                        <Typography variant="h6">
                          {moneyBRL(iptuSummary.overdue)}
                        </Typography>
                      </Grid>
                      <Grid sx={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Em aberto
                        </Typography>
                        <Typography variant="h6">
                          {moneyBRL(iptuSummary.open)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* FILTERS */}
            <Card sx={{ borderRadius: 3, mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid sx={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Buscar (imóvel, responsável, mês/parcela)"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      fullWidth
                    />
                  </Grid>

                  <Grid sx={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth>
                      <InputLabel id="tipo-label">Tipo</InputLabel>
                      <Select
                        labelId="tipo-label"
                        value={typeFilter}
                        label="Tipo"
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                      >
                        <MenuItem value="all">Todos</MenuItem>
                        <MenuItem value="rent">Aluguel</MenuItem>
                        <MenuItem value="iptu">IPTU</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid sx={{ xs: 12, md: 3 }}>
                    <FormControl fullWidth>
                      <InputLabel id="status-label">Status</InputLabel>
                      <Select
                        labelId="status-label"
                        value={statusFilter}
                        label="Status"
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                      >
                        <MenuItem value="all">Todos</MenuItem>
                        <MenuItem value="open">Em aberto</MenuItem>
                        <MenuItem value="overdue">Atrasado</MenuItem>
                        <MenuItem value="paid">Pago</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <InfiniteTable
              columns={[
                { label: "Tipo" },
                { label: "Imóvel" },
                { label: "Responsável" },
                { label: "Mês / Parcela" },
                { label: "Vencimento" },
                { label: "Valor", align: "right" },
                { label: "Status" },
                { label: "Ações", align: "right" },
              ]}
              data={rows.slice(0, visibleCount)}
              renderRow={(r: any) => (
                <TableRow key={`${r.type}-${r.id}`}>
                  <TableCell>
                    <Chip label={r.type} size="small" />
                  </TableCell>

                  <TableCell>{r.propertyName}</TableCell>
                  <TableCell>{r.responsibleName}</TableCell>
                  <TableCell>{r.label}</TableCell>

                  <TableCell>{r.dueDate.toLocaleDateString("pt-BR")}</TableCell>

                  <TableCell align="right">{moneyBRL(r.amount || 0)}</TableCell>

                  <TableCell>
                    <Chip
                      label={statusLabel(r.status)}
                      color={statusChipColor(r.status)}
                      size="small"
                      variant={r.status === "open" ? "outlined" : "filled"}
                    />
                  </TableCell>

                  <TableCell align="right">
                    {r.status !== "paid" && (
                      <Tooltip title="Confirmar pagamento">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() =>
                            openConfirm(
                              r.type === "Aluguel" ? "rent" : "iptu",
                              r.id,
                              r.amount || 0
                            )
                          }
                          sx={{ textTransform: "none" }}
                        >
                          Confirmar
                        </Button>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              )}
              loadingInitial={loading}
              loadingMore={false}
              onLoadMore={onLoadMoreRows}
              hasMore={hasMoreRows}
              error={null}
              emptyState={{
                title: "Nada encontrado",
                description: "Tente ajustar os filtros ou a busca.",
              }}
              maxHeight="62vh"
            />

            {/* PROPERTIES LIST */}
            <Box mt={3}>
              <Typography variant="h6" mb={1}>
                Imóveis cadastrados
              </Typography>

              <Grid container spacing={2}>
                {properties.map((p) => (
                  <Grid sx={{ xs: 12, md: 4 }} key={p.id}>
                    <Card sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {p.propertyName}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Responsável: <strong>{p.responsibleName}</strong>
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Aluguel:{" "}
                          <strong>{moneyBRL(Number(p.rentValue || 0))}</strong>
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Próx. vencimento:{" "}
                          <strong>
                            {(
                              p.rentFirstDueDate?.toDate() ?? new Date()
                            ).toLocaleDateString("pt-BR")}
                          </strong>{" "}
                          • Recorrência:{" "}
                          <strong>{p.rentRecurrenceMonths ?? 1} mês(es)</strong>
                        </Typography>

                        {!!p.iptuTotal && (
                          <Typography variant="body2" color="text.secondary">
                            IPTU: {moneyBRL(Number(p.iptuTotal))} •{" "}
                            {p.iptuInstallments || "-"}x • {p.iptuYear || "-"} •
                            1ª parcela:{" "}
                            {(
                              p.iptuFirstDueDate?.toDate() ?? new Date()
                            ).toLocaleDateString("pt-BR")}
                          </Typography>
                        )}
                      </CardContent>

                      <CardActions sx={{ justifyContent: "space-between" }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => openEditDialog(p)}
                          sx={{ textTransform: "none" }}
                        >
                          Editar
                        </Button>

                        <IconButton
                          color="error"
                          onClick={() => openDeleteDialog(p.id, p.propertyName)}
                          aria-label="delete-property"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </>
        )}

        {/* DIALOG: CREATE PROPERTY */}
        <Dialog
          open={openProperty}
          onClose={() => setOpenProperty(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Cadastrar imóvel</DialogTitle>
          <DialogContent>
            <TextField
              label="Nome do responsável"
              fullWidth
              sx={{ mt: 2 }}
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
            />

            <TextField
              label="Nome do imóvel"
              fullWidth
              sx={{ mt: 2 }}
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
            />
            <TextField
              label="Endereço do imóvel"
              fullWidth
              sx={{ mt: 2 }}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <TextField
              label="Valor do aluguel (R$)"
              type="number"
              fullWidth
              sx={{ mt: 2 }}
              value={rentValue}
              onChange={(e) => setRentValue(e.target.value)}
            />

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid sx={{ xs: 6 }}>
                <TextField
                  label="Próx. vencimento do aluguel (data)"
                  type="date"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={rentFirstDueDate}
                  onChange={(e) => setRentFirstDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid sx={{ xs: 6 }}>
                <TextField
                  label="Recorrência do aluguel (meses)"
                  type="number"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={rentRecurrenceMonths}
                  onChange={(e) => setRentRecurrenceMonths(e.target.value)}
                  helperText="1 = mensal, 2 = bimestral..."
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              IPTU (opcional)
            </Typography>

            <TextField
              label="Valor total do IPTU (R$)"
              type="number"
              fullWidth
              sx={{ mt: 2 }}
              value={iptuTotal}
              onChange={(e) => setIptuTotal(e.target.value)}
            />

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid sx={{ xs: 4 }}>
                <TextField
                  label="Quantidade de parcelas"
                  type="number"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={iptuInstallmentsCount}
                  onChange={(e) => setIptuInstallmentsCount(e.target.value)}
                />
              </Grid>

              <Grid sx={{ xs: 4 }}>
                <TextField
                  label="Ano do IPTU"
                  type="number"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={iptuYear}
                  onChange={(e) => setIptuYear(e.target.value)}
                />
              </Grid>

              <Grid sx={{ xs: 4 }}>
                <TextField
                  label="1ª parcela IPTU (data)"
                  type="date"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={iptuFirstDueDate}
                  onChange={(e) => setIptuFirstDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenProperty(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreateProperty}>
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG: EDIT SETTINGS */}
        <Dialog
          open={openEditSettings}
          onClose={() => setOpenEditSettings(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Editar configurações do imóvel</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Aqui você pode alterar vencimento, recorrência e valores.
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Aluguel
            </Typography>

            <TextField
              label="Endereço do imóvel"
              fullWidth
              sx={{ mt: 2 }}
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
            <TextField
              label="Valor do aluguel (R$)"
              type="number"
              fullWidth
              sx={{ mt: 2 }}
              value={editRentValue}
              onChange={(e) => setEditRentValue(e.target.value)}
            />

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid sx={{ xs: 6 }}>
                <TextField
                  label="Próx. vencimento (data)"
                  type="date"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={editRentNextDueDate}
                  onChange={(e) => setEditRentNextDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid sx={{ xs: 6 }}>
                <TextField
                  label="Recorrência (meses)"
                  type="number"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={editRentRecurrenceMonths}
                  onChange={(e) => setEditRentRecurrenceMonths(e.target.value)}
                  helperText="1 = mensal, 2 = bimestral..."
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              IPTU (opcional)
            </Typography>

            <TextField
              label="Valor total do IPTU (R$)"
              type="number"
              fullWidth
              sx={{ mt: 2 }}
              value={editIptuTotal}
              onChange={(e) => setEditIptuTotal(e.target.value)}
              helperText="Se deixar vazio, remove as infos de IPTU do imóvel (não apaga parcelas já lançadas)."
            />

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid sx={{ xs: 4 }}>
                <TextField
                  label="Parcelas"
                  type="number"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={editIptuInstallmentsCount}
                  onChange={(e) => setEditIptuInstallmentsCount(e.target.value)}
                />
              </Grid>

              <Grid sx={{ xs: 4 }}>
                <TextField
                  label="Ano"
                  type="number"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={editIptuYear}
                  onChange={(e) => setEditIptuYear(e.target.value)}
                />
              </Grid>

              <Grid sx={{ xs: 4 }}>
                <TextField
                  label="1ª parcela (data)"
                  type="date"
                  fullWidth
                  sx={{ mt: 2 }}
                  value={editIptuFirstDueDate}
                  onChange={(e) => setEditIptuFirstDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenEditSettings(false)}>Cancelar</Button>
            <Button variant="contained" onClick={saveEditSettings}>
              Salvar alterações
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG: CONFIRM PAYMENT */}
        <Dialog
          open={openConfirmPay}
          onClose={() => setOpenConfirmPay(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Confirmar pagamento</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Tipo:{" "}
              <strong>{confirmType === "rent" ? "Aluguel" : "IPTU"}</strong>
            </Typography>

            <TextField
              label="Valor pago (R$)"
              type="number"
              fullWidth
              value={confirmAmount}
              onChange={(e) => setConfirmAmount(e.target.value)}
            />

            {confirmType === "rent" && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={2}
              >
                Ao confirmar o aluguel, o próximo vencimento será criado
                automaticamente conforme a recorrência.
              </Typography>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenConfirmPay(false)}>Cancelar</Button>
            <Button variant="contained" onClick={confirmPayment}>
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG: DELETE CONFIRM */}
        <Dialog
          open={openDeleteConfirm}
          onClose={() => setOpenDeleteConfirm(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Você tem certeza que deseja excluir o imóvel{" "}
              <strong>{deleteTargetName}</strong>?
            </Typography>

            <Typography variant="body2" color="error" mt={2}>
              Isso também removerá todos os lançamentos de aluguel e IPTU
              relacionados.
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeletePropertyConfirmed}
            >
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
