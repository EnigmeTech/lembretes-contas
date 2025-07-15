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
    <>
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
          NextDue
        </Typography>
        <footer
          style={{
            position: "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="center">
            <Typography variant="caption" color="white" mr={1}>
              Produced by
            </Typography>
            <img
              src="/logoEnigme.png"
              alt="Logo Enigme"
              className="footer-logo"
              style={{ height: 60 }}
            />
          </Box>
        </footer>
      </Box>
    </>
  );
}
