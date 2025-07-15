import { useEffect, useState } from "react";
import { db, auth as firebaseAuth } from "../services/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import {
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Fab,
  CardActions,
  CardContent,
  Card,
  Grid,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { Sidebar } from "../components/Sidebar";
import { onAuthStateChanged } from "firebase/auth";
import "./Home.style.css";
import { CircularProgress } from "@mui/material";
import { toast } from "react-toastify";

export function Home() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [periodicity, setPeriodicity] = useState("none");
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [animateHighlight, setAnimateHighlight] = useState(true);
  const [confirmDoneOpen, setConfirmDoneOpen] = useState(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    null
  );
  const [doneAmount, setDoneAmount] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimateHighlight(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const handleMarkAsDone = (id: string) => {
    setSelectedReminderId(id);
    setDoneAmount("");
    setConfirmDoneOpen(true);
  };

  const confirmMarkAsDone = async () => {
    if (!selectedReminderId) return;

    const reminder = reminders.find((r) => r.id === selectedReminderId);
    if (!reminder) return;

    const now = new Date();
    const currentDue = reminder.dueDate.toDate();
    let newDueDate = currentDue;

    if (reminder.periodicity === "weekly") {
      newDueDate = new Date(currentDue);
      newDueDate.setDate(currentDue.getDate() + 7);
    } else if (reminder.periodicity === "monthly") {
      newDueDate = new Date(currentDue);
      newDueDate.setMonth(currentDue.getMonth() + 1);
    } else if (reminder.periodicity === "yearly") {
      newDueDate = new Date(currentDue);
      newDueDate.setFullYear(currentDue.getFullYear() + 1);
    }

    const updateData: any = {
      lastDone: Timestamp.fromDate(now),
    };

    if (reminder.periodicity === "none" || !reminder.periodicity) {
      updateData.done = true;
    } else {
      updateData.dueDate = Timestamp.fromDate(newDueDate);
    }

    if (doneAmount) {
      updateData.amount = parseFloat(doneAmount);
    }

    try {
      await updateDoc(doc(db, "reminders", selectedReminderId), updateData);
      toast.success("Lembrete marcado como concluído!");
    } catch (error) {
      console.error("Erro ao concluir lembrete:", error);
      toast.error("Erro ao concluir o lembrete.");
    }

    setConfirmDoneOpen(false);
    setSelectedReminderId(null);
  };

  const loadReminders = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    const q = query(collection(db, "reminders"), where("uid", "==", user.uid));
    const snapshot = await getDocs(q);
    setReminders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleSave = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) return;

    if (!title.trim() || !dueDate) {
      toast.error("Título e data de vencimento são obrigatórios.");
      return;
    }

    const reminderData = {
      uid: user.uid,
      title,
      dueDate: new Date(dueDate),
      periodicity,
      createdAt: Timestamp.now(),
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "reminders", editId), reminderData);
        toast.success("Lembrete atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "reminders"), reminderData);
        toast.success("Lembrete criado com sucesso!");
      }

      setTitle("");
      setDueDate("");
      setPeriodicity("none");
      setEditId(null);
      setOpen(false);
      loadReminders();
    } catch (error) {
      toast.error("Erro ao salvar o lembrete.");
      console.error("Erro ao salvar lembrete:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reminders", id));
      toast.success("Lembrete excluído com sucesso!");
      loadReminders();
    } catch (error) {
      console.error("Erro ao excluir lembrete:", error);
      toast.error("Erro ao excluir o lembrete.");
    }
  };

  const handleEdit = (reminder: any) => {
    toast.info(`Editando lembrete: ${reminder.title}`);
    setEditId(reminder.id);
    setTitle(reminder.title);
    setDueDate(reminder.dueDate.toDate().toISOString().split("T")[0]);
    setPeriodicity(reminder.periodicity || "none");
    setOpen(true);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) return;

      const q = query(
        collection(db, "reminders"),
        where("uid", "==", user.uid)
      );

      const unsubscribeReminders = onSnapshot(q, (snapshot) => {
        const updatedReminders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReminders(updatedReminders);
        setLoading(false);
      });

      // Quando o componente desmontar ou o user mudar, limpa o listener do banco
      return () => unsubscribeReminders();
    });

    // Quando o componente desmontar, limpa o listener do auth
    return () => unsubscribeAuth();
  }, []);

  const periodicityMap: Record<string, string> = {
    none: "Nenhuma",
    weekly: "Semanal",
    monthly: "Mensal",
    yearly: "Anual",
  };

  return (
    <Box display="flex">
      <Sidebar />
      <Box
        p={4}
        bgcolor="#fff"
        minHeight="100vh"
        flex={1}
        ml="100px"
        width="100vw"
      >
        <Typography variant="h4" color="primary" mb={2}>
          Meus Lembretes
        </Typography>
        <TextField
          label="Buscar lembrete"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3, width: "400px" }}
        />

        <Grid container spacing={2}>
          {loading ? (
            <Box width="100%" display="flex" justifyContent="center" mt={4}>
              <CircularProgress />
            </Box>
          ) : (
            reminders
              .filter(
                (reminder) =>
                  !(
                    reminder.done &&
                    (reminder.periodicity === "none" || !reminder.periodicity)
                  )
              )
              .filter((reminder) =>
                reminder.title.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .sort((a, b) => {
                const dateA = a.dueDate.toDate().getTime();
                const dateB = b.dueDate.toDate().getTime();
                return dateA - dateB;
              })
              .map((reminder) => {
                const utcDate = reminder.dueDate.toDate();
                const dueDate = new Date(
                  utcDate.getTime() + utcDate.getTimezoneOffset() * 60000
                );

                const today = new Date();
                const timeDiff = dueDate.getTime() - today.getTime();
                const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                const isDueSoon =
                  (daysLeft <= 2 || daysLeft <= 0) && !reminder.done;
                const isToday = dueDate.toDateString() === today.toDateString();

                const classList = [
                  "reminder-card",
                  reminder.done
                    ? "reminder-done"
                    : isToday
                    ? "reminder-today"
                    : isDueSoon
                    ? "reminder-due-soon"
                    : "",
                  isDueSoon && animateHighlight ? "pulse-animation" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <Grid key={reminder.id}>
                    <Card className={classList}>
                      <CardContent>
                        <Typography variant="h6">{reminder.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Vence em:{" "}
                          <strong>
                            {dueDate.toLocaleDateString("pt-BR")}{" "}
                          </strong>
                          ({periodicityMap[reminder.periodicity]})
                        </Typography>

                        {reminder.done && (
                          <Typography variant="caption" color="green">
                            ✅ Concluído
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        {!reminder.done && (
                          <Button
                            size="small"
                            sx={{ textTransform: "none" }}
                            onClick={() => handleMarkAsDone(reminder.id)}
                          >
                            Concluir
                          </Button>
                        )}
                        <IconButton onClick={() => handleEdit(reminder)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => {
                            setReminderToDelete(reminder);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })
          )}
        </Grid>

        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: "fixed", bottom: 32, right: 32 }}
          onClick={() => {
            setEditId(null);
            setTitle("");
            setDueDate("");
            setPeriodicity("none");
            setOpen(true);
          }}
        >
          <AddIcon />
        </Fab>

        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>
            {editId ? "Editar Lembrete" : "Novo Lembrete"}
          </DialogTitle>
          <DialogContent>
            <TextField
              label="Título"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mt: 2 }}
              inputProps={{ maxLength: 50 }}
              helperText={`${title.length}/50`}
              FormHelperTextProps={{
                sx: {
                  textAlign: "right",
                  width: "97%",
                },
              }}
            />
            <TextField
              label="Data de vencimento"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              sx={{ mt: 2 }}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="recorrencia-label">
                Recorrência (opcional)
              </InputLabel>
              <Select
                labelId="recorrencia-label"
                value={periodicity}
                onChange={(e) => setPeriodicity(e.target.value)}
                label="Recorrência (opcional)"
              >
                <MenuItem value="none">Nenhuma</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
                <MenuItem value="yearly">Anual</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave}>
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={confirmDoneOpen}
          onClose={() => setConfirmDoneOpen(false)}
        >
          <DialogTitle>Confirmar Conclusão</DialogTitle>
          <DialogContent>
            <Typography mb={2}>
              Deseja marcar este lembrete como concluído?
            </Typography>
            <TextField
              label="Valor da despesa (opcional)"
              type="number"
              value={doneAmount}
              onChange={(e) => setDoneAmount(e.target.value)}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDoneOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={confirmMarkAsDone}>
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <DialogTitle>Excluir Lembrete</DialogTitle>
          <DialogContent>
            <Typography>
              Tem certeza que deseja excluir{" "}
              <strong>{reminderToDelete?.title}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                if (reminderToDelete) {
                  await handleDelete(reminderToDelete.id); // chama aqui
                  setDeleteConfirmOpen(false);
                  setReminderToDelete(null);
                }
              }}
            >
              Excluir
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
