import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    CircularProgress,
} from "@mui/material";
import { type ReactNode, useEffect, useRef } from "react";
import GroupIcon from "@mui/icons-material/Group";
import { EmptyState, type EmptyStateProps } from "../EmptyState/EmptyState";

interface Column {
    label: string;
    align?: "left" | "center" | "right";
    width?: string | number;
}

interface InfiniteTableProps<T> {
    columns: Column[];
    data: T[];
    renderRow: (item: T) => ReactNode;
    loadingInitial: boolean;
    loadingMore: boolean;
    onLoadMore: () => void;
    hasMore: boolean;
    error?: string | null;
    emptyState?: EmptyStateProps;
    maxHeight?: string | number;
}

export function InfiniteTable<T>({
    columns,
    data,
    renderRow,
    loadingInitial,
    loadingMore,
    onLoadMore,
    hasMore,
    error,
    emptyState,
    maxHeight = "calc(90vh - 280px)",
}: InfiniteTableProps<T>) {
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || loadingMore || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first?.isIntersecting) {
                    onLoadMore();
                }
            },
            {
                root: null,
                rootMargin: "100px",
                threshold: 0,
            }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [loadingMore, hasMore, onLoadMore]);

    if (loadingInitial) {
        return (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <EmptyState
                icon={<GroupIcon sx={{ fontSize: 48, color: "#737373" }} />}
                title="Erro ao carregar dados"
                description={error}
            />
        );
    }

    if (data.length === 0) {
        return (
            <EmptyState
                icon={emptyState?.icon ?? <GroupIcon sx={{ fontSize: 48, color: "#737373" }} />}
                title={emptyState?.title ?? "Nenhum resultado"}
                description={emptyState?.description ?? "Não encontramos resultados."}
            />
        );
    }

    return (
        <TableContainer
            sx={{ maxHeight: maxHeight, overflow: "auto" }}
        >
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map((col, idx) => (
                            <TableCell
                                key={idx}
                                align={col.align || "left"}
                                sx={{
                                    width: col.width,
                                }}
                            >
                                {col.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>{data.map((item) => renderRow(item))}</TableBody>
            </Table>

            <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                {loadingMore ? <CircularProgress size={24} /> : null}
            </Box>
            <div ref={sentinelRef} style={{ height: 1 }} />
        </TableContainer>
    );
}
