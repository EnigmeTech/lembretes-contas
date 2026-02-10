import { Box, IconButton, Stack, Tooltip } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ApartmentIcon from "@mui/icons-material/Apartment";
import CarRepairIcon from "@mui/icons-material/CarRepair";

import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname === "/home";
  const isCompleted = location.pathname === "/concluidos";
  const isRentControl = location.pathname === "/alugueis";

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const goTo = (path: string) => {
    sessionStorage.setItem("allowedNavigation", "true");
    navigate(path);
  };

  return (
    <Box
      width={100}
      height="100vh"
      bgcolor="#1976d2"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      alignItems="center"
      py={4}
      sx={{ position: "fixed", left: 0, top: 0 }}
    >
      <Stack spacing={4} alignItems="center">
        {/* Dashboard */}
        <Tooltip title="Dashboard" placement="right">
          <IconButton
            onClick={() => goTo("/home")}
            sx={{
              color: "white",
              bgcolor: isDashboard ? "rgba(255,255,255,0.15)" : "transparent",
              borderRadius: 2,
            }}
          >
            <HomeIcon sx={{ fontSize: 36 }} />
          </IconButton>
        </Tooltip>

        {/* Concluídos */}
        <Tooltip title="Concluídos" placement="right">
          <IconButton
            onClick={() => goTo("/concluidos")}
            sx={{
              color: "white",
              bgcolor: isCompleted ? "rgba(255,255,255,0.15)" : "transparent",
              borderRadius: 2,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 36 }} />
          </IconButton>
        </Tooltip>

        {/* Aluguéis */}
        {
          <Tooltip title="Aluguéis" placement="right">
            <IconButton
              onClick={() => goTo("/alugueis")}
              sx={{
                color: "white",
                bgcolor: isRentControl
                  ? "rgba(255,255,255,0.15)"
                  : "transparent",
                borderRadius: 2,
              }}
            >
              <ApartmentIcon sx={{ fontSize: 36 }} />
            </IconButton>
          </Tooltip>
        }

        {/* Manutenção de Carros */}
        <Tooltip title="Manutenção Carros" placement="right">
          <IconButton
            onClick={() => goTo("/manutencao-carros")}
            sx={{
              color: "white",
              bgcolor: location.pathname === "/manutencao-carros"
                ? "rgba(255,255,255,0.15)"
                : "transparent",
              borderRadius: 2,
            }}
          >
            <CarRepairIcon sx={{ fontSize: 36 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Logout */}
      <Box mb={6}>
        <Tooltip title="Sair" placement="right">
          <IconButton onClick={handleLogout} sx={{ color: "white" }}>
            <LogoutIcon sx={{ fontSize: 36 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
