"use client";

export function TopHeader({ sidebarWidth }: { sidebarWidth: number }) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: `${sidebarWidth}px`,
        right: 0,
        height: "56px",
        backgroundColor: "var(--background)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        transition: "left 0.2s ease",
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          title="Organization Switcher (Reserved)"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 0.615rem",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--text-main)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--surface-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--surface)")
          }
        >
          {/* Organization Switcher */}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "20px",
            backgroundColor: "var(--surface-hover)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            V
          </div>
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "var(--text-main)",
              paddingRight: "0.25rem",
            }}
          >
            Vinit
          </span>
        </div>
      </div>
    </header>
  );
}
