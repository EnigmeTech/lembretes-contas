import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { db, auth as firebaseAuth } from "../services/firebase";
import {
    addDoc,
    collection,
    onSnapshot,
    query,
    Timestamp,
    where,
    deleteDoc,
    doc,
    updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Box,
    Typography,
    Button,
    TextField,
    MenuItem,
    IconButton,
    Tooltip,
    InputAdornment,
    TableRow,
    TableCell,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close"; // Added CloseIcon
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { toast } from "react-toastify";
import type { CarMaintenanceDoc, MaintenanceRecurrence } from "./types/index";
import {
    formatDateInput,
    parseDateInput,
    normalizeDateToNoon,
} from "./utils";
import { InfiniteTable } from "../components/InfiniteTable/InfiniteTable";

export function CarMaintenance() {
    const [uid, setUid] = useState<string | null>(null);
    const [maintenanceList, setMaintenanceList] = useState<
        Array<{ id: string } & CarMaintenanceDoc>
    >([]);
    const [loading, setLoading] = useState(true);

    // Filter & Sort
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Form
    const [editId, setEditId] = useState<string | null>(null);
    const [carName, setCarName] = useState("");
    const [carPlate, setCarPlate] = useState("");
    const [serviceName, setServiceName] = useState("");
    const [chassis, setChassis] = useState("");
    const [serviceDate, setServiceDate] = useState(() =>
        formatDateInput(new Date())
    );
    const [location, setLocation] = useState("");
    const [recurrence, setRecurrence] = useState<MaintenanceRecurrence>("one-time");

    // Delete confirm dialog
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteTargetName, setDeleteTargetName] = useState<string>("");
    const [deleteTargetService, setDeleteTargetService] = useState<string>("");

    // Auth
    useEffect(() => {
        const unsub = onAuthStateChanged(firebaseAuth, (user) => {
            if (!user) {
                setUid(null);
                setLoading(false);
            } else {
                setUid(user.uid);
            }
        });
        return () => unsub();
    }, []);

    // Fetch
    useEffect(() => {
        if (!uid) return;

        setLoading(true);
        const q = query(
            collection(db, "car_maintenance"),
            where("uid", "==", uid)
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as CarMaintenanceDoc),
            }));
            // Sort by createdAt desc by default or whatever
            setMaintenanceList(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching car maintenance:", error);
            setLoading(false);
            toast.error("Erro ao carregar manutenções.");
        });

        return () => unsub();
    }, [uid]);

    const handleEdit = (item: { id: string } & CarMaintenanceDoc) => {
        setEditId(item.id);
        setCarName(item.carName);
        setCarPlate(item.carPlate || "");
        setServiceName(item.serviceName);
        setChassis(item.chassis || "");
        const d = item.serviceDate?.toDate ? item.serviceDate.toDate() : new Date(item.serviceDate);
        setServiceDate(formatDateInput(d));
        setLocation(item.location || "");
        setRecurrence(item.recurrence);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSave = async () => {
        if (!uid) return;
        if (!carName.trim() || !serviceName.trim()) {
            toast.error("Preencha carro e serviço.");
            return;
        }

        const date = parseDateInput(serviceDate);
        if (!date) {
            toast.error("Data inválida.");
            return;
        }

        try {
            const commonData = {
                uid,
                carName: carName.trim(),
                carPlate: carPlate.trim(),
                serviceName: serviceName.trim(),
                serviceDate: Timestamp.fromDate(normalizeDateToNoon(date)),
                chassis: chassis.trim(),
                location: location.trim(),
                recurrence,
            };

            const nextDue = getNextDueDate(date, recurrence);
            const dataToSave = {
                ...commonData,
                nextDueDate: nextDue ? Timestamp.fromDate(normalizeDateToNoon(nextDue)) : null,
            };

            if (editId) {
                // Update
                await updateDoc(doc(db, "car_maintenance", editId), {
                    ...dataToSave,
                    // keep original createdAt
                });
                toast.success("Manutenção atualizada!");
                setEditId(null);
            } else {
                // Create
                await addDoc(collection(db, "car_maintenance"), {
                    ...dataToSave,
                    createdAt: Timestamp.now(),
                });
                toast.success("Manutenção registrada!");
            }

            // Reset
            setCarName("");
            setCarPlate("");
            setServiceName("");
            setChassis("");
            setLocation("");
            setRecurrence("one-time");
            setServiceDate(formatDateInput(new Date()));
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar.");
        }
    };

    const handleCancelEdit = () => {
        setEditId(null);
        setCarName("");
        setCarPlate("");
        setServiceName("");
        setChassis("");
        setLocation("");
        setRecurrence("one-time");
        setServiceDate(formatDateInput(new Date()));
    };

    const handleDelete = (id: string, name: string, service: string) => {
        setDeleteTargetId(id);
        setDeleteTargetName(name);
        setDeleteTargetService(service);
        setOpenDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteDoc(doc(db, "car_maintenance", deleteTargetId));
            toast.success("Excluído!");
            setOpenDeleteConfirm(false);
            setDeleteTargetId(null);
            setDeleteTargetName("");
        } catch (err) {
            console.error(err);
            toast.error("Erro ao excluir.");
        }
    };

    // Helper to calculate next due date
    const getNextDueDate = (date: Date, recurrence: MaintenanceRecurrence) => {
        if (recurrence === "one-time") return null;
        const next = new Date(date);
        if (recurrence === "monthly") next.setMonth(next.getMonth() + 1);
        if (recurrence === "annual") next.setFullYear(next.getFullYear() + 1); // fixed: setFullYear
        return next;
    };

    // Filter & Sort logic
    const filteredData = maintenanceList
        .filter((item) => {
            if (!searchTerm) return true;
            const s = searchTerm.toLowerCase();
            return (
                item.carName.toLowerCase().includes(s) ||
                (item.carPlate || "").toLowerCase().includes(s) ||
                item.serviceName.toLowerCase().includes(s) ||
                (item.location || "").toLowerCase().includes(s)
            );
        })
        .sort((a, b) => {
            const da = a.serviceDate?.toDate ? a.serviceDate.toDate() : new Date(a.serviceDate);
            const db = b.serviceDate?.toDate ? b.serviceDate.toDate() : new Date(b.serviceDate);

            // Priority: Overdue > DueSoon > Normal
            const getStatusPriority = (date: Date, recurrence: MaintenanceRecurrence) => {
                const nextDue = getNextDueDate(date, recurrence);
                if (!nextDue) return 2; // Normal

                const today = new Date();
                const timeDiff = nextDue.getTime() - today.getTime();
                const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

                if (daysLeft < 0) return 0; // Overdue (Highest)
                if (daysLeft <= 30) return 1; // Due Soon
                return 2; // Normal
            };

            const pa = getStatusPriority(da, a.recurrence);
            const pb = getStatusPriority(db, b.recurrence);

            if (pa !== pb) return pa - pb; // Lower priority number comes first

            // Secondary sort by date
            if (sortOrder === "asc") {
                return da.getTime() - db.getTime();
            } else {
                return db.getTime() - da.getTime();
            }
        });

    // Columns definition (for Header)
    const columns = [
        { label: "Data", width: "10%" },
        { label: "Carro / Placa", width: "20%" },
        { label: "Serviço", width: "25%" },
        { label: "Local", width: "15%" },
        { label: "Recorrência", width: "10%" },
        { label: "Chassis", width: "15%" },
        { label: "Ações", width: "10%", align: "right" as const }, // increased width for actions
    ];

    const renderRow = (item: { id: string } & CarMaintenanceDoc) => {
        const d = item.serviceDate?.toDate ? item.serviceDate.toDate() : new Date(item.serviceDate);
        const dateStr = d.toLocaleDateString("pt-BR");
        const mapRecur: Record<string, string> = {
            "one-time": "Pontual",
            annual: "Anual",
            monthly: "Mensal",
        };

        // Recurrence Check
        const nextDue = getNextDueDate(d, item.recurrence);
        let dueStatus: "none" | "ok" | "due-soon" | "overdue" = "none";

        if (nextDue) {
            const today = new Date();
            const timeDiff = nextDue.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

            if (daysLeft < 0) dueStatus = "overdue";
            else if (daysLeft <= 30) dueStatus = "due-soon"; // 30 days notice
            else dueStatus = "ok";
        }

        // Row background
        let rowBg = "inherit";
        if (dueStatus === "overdue") rowBg = "#ffebee"; // red
        if (dueStatus === "due-soon") rowBg = "#fff8e1"; // orange/yellow

        return (
            <TableRow key={item.id} hover sx={{ backgroundColor: rowBg }}>
                <TableCell>{dateStr}</TableCell>
                <TableCell>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                        {item.carName}
                    </Typography>
                    {item.carPlate && (
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {item.carPlate}
                        </Typography>
                    )}
                </TableCell>
                <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {item.serviceName}
                        </Typography>
                        {dueStatus === "due-soon" && (
                            <Tooltip title="Próximo da recorrência">
                                <WarningAmberIcon color="warning" fontSize="small" />
                            </Tooltip>
                        )}
                        {dueStatus === "overdue" && (
                            <Tooltip title="Recorrência vencida">
                                <WarningAmberIcon color="error" fontSize="small" />
                            </Tooltip>
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {item.location || "-"}
                    </Typography>
                </TableCell>
                <TableCell>
                    {mapRecur[item.recurrence] || item.recurrence}
                    {nextDue && (
                        <Typography variant="caption" display="block" color="text.secondary" noWrap>
                            Próx: {nextDue.toLocaleDateString("pt-BR")}
                        </Typography>
                    )}
                </TableCell>
                <TableCell>{item.chassis || "-"}</TableCell>
                <TableCell align="right">
                    <Tooltip title="Editar">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(item)}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item.id, item.carName, item.serviceName)}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <Layout>
            <Box p={3}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <DirectionsCarIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h4" color="primary" fontWeight="bold">
                        Manutenção de Carros
                    </Typography>
                </Box>

                {/* Form */}
                {/* Form */}
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column", // Stack inputs and buttons vertically
                        gap: 2,
                        mb: 4,
                        p: 2,
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        boxShadow: 1,
                        border: editId ? "2px solid #1976d2" : "none",
                    }}
                >
                    {/* Inputs Row */}
                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" width="100%">
                        <TextField
                            label="Carro"
                            value={carName}
                            onChange={(e) => setCarName(e.target.value)}
                            size="small"
                            sx={{ width: "15%", minWidth: 150 }}
                            placeholder="Ex: Honda Civic"
                        />
                        <TextField
                            label="Placa"
                            value={carPlate}
                            onChange={(e) => setCarPlate(e.target.value.toUpperCase())}
                            size="small"
                            sx={{ width: "10%", minWidth: 110 }}
                            placeholder="ABC-1234"
                            inputProps={{ maxLength: 8 }}
                        />
                        <Autocomplete
                            freeSolo
                            options={[
                                "Troca de Óleo",
                                "Revisão Geral",
                                "Alinhamento e Balanceamento",
                                "Troca de Pneus",
                                "Troca de Pastilhas de Freio",
                                "Troca de Filtros",
                                "Bateria",
                                "Funilaria e Pintura",
                                "Lavagem",
                                "Troca de Correia",
                            ]}
                            value={serviceName}
                            onInputChange={(_, newValue) => setServiceName(newValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Serviço"
                                    size="small"
                                    placeholder="Selecione ou digite"
                                />
                            )}
                            sx={{ width: "15%", minWidth: 190 }}
                        />
                        <TextField
                            label="Chassis"
                            value={chassis}
                            onChange={(e) => setChassis(e.target.value.toUpperCase())}
                            size="small"
                            sx={{ width: "15%", minWidth: 170 }}
                            placeholder="Ex: XYZ...123"
                        />
                        <TextField
                            label="Data"
                            type="date"
                            value={serviceDate}
                            onChange={(e) => setServiceDate(e.target.value)}
                            size="small"
                            sx={{ width: "10%", minWidth: 130 }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Local"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            size="small"
                            sx={{ width: "15%", minWidth: 140 }}
                            placeholder="Ex: Oficina X"
                        />
                        <TextField
                            select
                            label="Recorrência"
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as MaintenanceRecurrence)}
                            size="small"
                            sx={{ width: "10%", minWidth: 120 }}
                        >
                            <MenuItem value="one-time">Pontual</MenuItem>
                            <MenuItem value="monthly">Mensal</MenuItem>
                            <MenuItem value="annual">Anual</MenuItem>
                        </TextField>
                    </Box>

                    {/* Buttons Row */}
                    <Box display="flex" alignItems="center" gap={1} alignSelf="flex-end">
                        {editId && (
                            <Tooltip title="Cancelar Edição">
                                <IconButton onClick={handleCancelEdit} color="default" size="small" sx={{ border: '1px solid #ccc' }}>
                                    <CloseIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            color={editId ? "warning" : "primary"}
                            sx={{ whiteSpace: "nowrap", height: '40px' }}
                            startIcon={editId ? <EditIcon /> : undefined}
                        >
                            {editId ? "Atualizar" : "Adicionar"}
                        </Button>
                    </Box>
                </Box>

                {/* Search & Sort */}
                <Box display="flex" gap={2} mb={2}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Buscar por carro, placa, serviço ou local..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ bgcolor: "background.paper" }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Tooltip title={`Ordenar por data (${sortOrder === "asc" ? "Mais antigos" : "Mais recentes"})`}>
                        <IconButton
                            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                            sx={{ bgcolor: "background.paper", borderRadius: 1, border: "1px solid #c4c4c4" }}
                        >
                            <FilterListIcon sx={{ transform: sortOrder === "asc" ? "rotate(180deg)" : "none" }} />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Table */}
                <InfiniteTable
                    columns={columns}
                    data={filteredData}
                    renderRow={renderRow}
                    loadingInitial={loading}
                    loadingMore={false}
                    onLoadMore={() => { }}
                    hasMore={false} // No pagination for now
                    error={null}
                    emptyState={{
                        title: "Nenhuma manutenção encontrada",
                        description: "Adicione um registro acima.",
                        icon: <DirectionsCarIcon fontSize="large" color="disabled" />
                    }}
                    maxHeight="60vh"
                />

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
                            Você tem certeza que deseja excluir o serviço{" "}
                            <strong>{deleteTargetService}</strong> do carro{" "}
                            <strong>{deleteTargetName}</strong>?
                        </Typography>
                    </DialogContent>

                    <DialogActions>
                        <Button onClick={() => setOpenDeleteConfirm(false)}>
                            Cancelar
                        </Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleConfirmDelete}
                        >
                            Excluir
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
}
