import { Box, IconButton, Stack, Tooltip } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/home";
  const isCompleted = location.pathname === "/concluidos";

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
      </Stack>

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
