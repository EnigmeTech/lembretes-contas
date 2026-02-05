import { Box } from "@mui/material";
import { Sidebar } from "./Sidebar";
import type { ReactNode } from "react";

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <Box display="flex">
            <Sidebar />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 4,
                    ml: "100px",
                    width: "calc(100vw - 100px)",
                    minHeight: "100vh",
                    bgcolor: "#fff",
                    boxSizing: "border-box", // Important to include padding in width calculation if needed, though width calc handles it for main block.
                    overflowX: "hidden" // Prevent horizontal scroll
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
