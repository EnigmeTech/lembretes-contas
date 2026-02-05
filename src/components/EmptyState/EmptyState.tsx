import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import "./EmptyState.css";

export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
}) => {
    return (
        <Box className="empty-state">
            <Box className="empty-state-icon-wrapper">
                {icon || <DescriptionIcon className="empty-state-icon" />}
            </Box>
            <Typography variant="h6" className="empty-state-title">
                {title}
            </Typography>
            <Typography variant="body2" className="empty-state-description">
                {description}
            </Typography>
            {action && <Box className="empty-state-action">{action}</Box>}
        </Box>
    );
};
