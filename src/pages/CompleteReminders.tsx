import { useEffect, useState } from "react";
import { db, auth as firebaseAuth } from "../services/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import { Sidebar } from "../components/Sidebar";
import "./Home.style.css";

export function CompletedReminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribeAuth = firebaseAuth.onAuthStateChanged((user) => {
      if (!user) {
        setReminders([]);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "reminders"),
        where("uid", "==", user.uid),
        where("lastDone", "!=", null)
      );

      const unsubscribeReminders = onSnapshot(q, (snapshot) => {
        const updated = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReminders(updated);
        setLoading(false);
      });

      return () => unsubscribeReminders();
    });

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
          Lembretes Concluídos
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
              .filter((reminder) =>
                reminder.title.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .sort((a, b) => {
                const dateA = a.dueDate.toDate().getTime();
                const dateB = b.dueDate.toDate().getTime();
                return dateA - dateB;
              })
              .map((reminder) => {
                const dueDate = reminder.dueDate?.toDate();
                const lastDoneDate = reminder.lastDone?.toDate();

                const formattedDone = lastDoneDate?.toLocaleDateString("pt-BR");
                const formattedDue = dueDate?.toLocaleDateString("pt-BR");

                const conclusionText =
                  reminder.periodicity === "none" || !reminder.periodicity
                    ? `✅ Concluído em: ${formattedDone}`
                    : `✅ Concluído este ${
                        reminder.periodicity === "weekly"
                          ? "ciclo"
                          : reminder.periodicity === "monthly"
                          ? "mês"
                          : "ano"
                      }`;

                return (
                  <Grid key={reminder.id}>
                    <Card
                      className="reminder-card reminder-done"
                      sx={{ cursor: "pointer" }}
                      onClick={() => setSelectedReminder(reminder)}
                    >
                      <CardContent>
                        <Typography variant="h6">{reminder.title}</Typography>
                        {formattedDue && (
                          <Typography variant="body2" color="text.secondary">
                            Venceu em: {formattedDue} (
                            {periodicityMap[reminder.periodicity]})
                          </Typography>
                        )}
                        <Typography variant="caption" color="green">
                          {conclusionText}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })
          )}
        </Grid>

        {/* Modal de detalhes */}
        <Dialog
          open={Boolean(selectedReminder)}
          onClose={() => setSelectedReminder(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: "#1976d2", color: "white" }}>
            Detalhes do Lembrete
          </DialogTitle>
          <DialogContent dividers>
            {selectedReminder && (
              <Box display="flex" flexDirection="column" gap={2} mt={1}>
                <Typography variant="h6" color="primary">
                  {selectedReminder.title}
                </Typography>

                <Typography>
                  <strong>Data de vencimento:</strong>{" "}
                  {selectedReminder.dueDate
                    ?.toDate()
                    .toLocaleDateString("pt-BR")}
                </Typography>

                <Typography>
                  <strong>Recorrência:</strong>{" "}
                  {periodicityMap[selectedReminder.periodicity] || "Nenhuma"}
                </Typography>

                {selectedReminder.lastDone && (
                  <Typography>
                    <strong>Concluído em:</strong>{" "}
                    {selectedReminder.lastDone
                      ?.toDate()
                      .toLocaleDateString("pt-BR")}
                  </Typography>
                )}

                {"amount" in selectedReminder &&
                  selectedReminder.amount > 0 && (
                    <Typography>
                      <strong>Valor pago:</strong> R${" "}
                      {selectedReminder.amount.toFixed(2).replace(".", ",")}
                    </Typography>
                  )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setSelectedReminder(null)}
              variant="outlined"
            >
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
