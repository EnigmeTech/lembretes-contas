import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  Paper,
  type SxProps,
  type Theme,
} from "@mui/material";
import { type ReactNode, useEffect, useRef } from "react";
import GroupIcon from "@mui/icons-material/Group";
import { EmptyState, type EmptyStateProps } from "./EmptyState/EmptyState";

interface Column {
  label: string;
  align?: "left" | "center" | "right";
  width?: string | number;
  sx?: SxProps<Theme>;
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
  rootMargin?: string; // ex: "160px"
  containerSx?: SxProps<Theme>;
  tableSx?: SxProps<Theme>;
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
  rootMargin = "160px",
  containerSx,
  tableSx,
}: InfiniteTableProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = containerRef.current;
    const sentinelEl = sentinelRef.current;

    // IMPORTANT: root precisa ser o container rolável
    if (!rootEl || !sentinelEl) return;
    if (!hasMore) return;

    // evita ficar chamando enquanto já está carregando
    if (loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        // guard extra: não chama se já tá carregando / não tem mais
        if (loadingMore || !hasMore) return;

        onLoadMore();
      },
      {
        root: rootEl,
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, rootMargin]);

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
        icon={
          emptyState?.icon ?? (
            <GroupIcon sx={{ fontSize: 48, color: "#737373" }} />
          )
        }
        title={emptyState?.title ?? "Nenhum resultado"}
        description={emptyState?.description ?? "Não encontramos resultados."}
      />
    );
  }

  return (
    <TableContainer
      component={Paper}
      ref={containerRef}
      sx={{
        maxHeight,
        overflow: "auto",
        borderRadius: 3,
        ...containerSx,
      }}
    >
      <Table stickyHeader sx={tableSx}>
        <TableHead>
          <TableRow>
            {columns.map((col, idx) => (
              <TableCell
                key={idx}
                align={col.align || "left"}
                sx={{
                  width: col.width,
                  ...(col.sx as any),
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((item) => renderRow(item))}

          {/* Linha “sentinel” dentro da tabela (importante pro root=container) */}
          <TableRow>
            <TableCell colSpan={columns.length} sx={{ p: 0, border: 0 }}>
              <div ref={sentinelRef} style={{ height: 1 }} />
            </TableCell>
          </TableRow>

          {/* Loading more dentro da tabela */}
          {loadingMore && (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
