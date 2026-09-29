import { ReactNode } from "react";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  className?: string;
}) {
  const styles = {
    default: {
      bg: "var(--surface-hover)",
      color: "var(--text-muted)",
      border: "var(--border)",
    },
    success: {
      bg: "var(--status-running-bg)",
      color: "var(--status-running)",
      border: "var(--status-running-border)",
    },
    warning: {
      bg: "var(--status-scaling-bg)",
      color: "var(--status-scaling)",
      border: "var(--status-scaling-border)",
    },
    error: {
      bg: "var(--status-stopped-bg)",
      color: "var(--status-stopped)",
      border: "var(--status-stopped-border)",
    },
  };

  const s = styles[variant];

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.125rem 0.5rem",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.75rem",
        fontWeight: 500,
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {children}
    </span>
  );
}
