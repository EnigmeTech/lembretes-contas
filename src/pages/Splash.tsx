import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import Logo from "/logo.png";

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 5000); // 3 segundos

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box
      height="100vh"
      width="100vw"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      sx={{
        background: "linear-gradient(135deg, #1976d2, #42a5f5)",
        color: "white",
      }}
    >
      <img src={Logo} alt="Logo" className="splash-logo" />

      <Typography variant="h4" fontWeight="bold">
        RememberMe
      </Typography>
    </Box>
  );
}
