"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Zap,
  Blocks,
  ChevronLeft,
  Boxes,
  Sun,
  Moon,
} from "lucide-react";

export function Sidebar({ isCollapsed, setIsCollapsed }: any) {
  const pathname = usePathname();
  const width = isCollapsed ? 72 : 240;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const navItemStyle = (isActive: boolean) => ({
    padding: isCollapsed ? "0.75rem" : "0.6rem 0.8rem",
    borderRadius: "6px",
    backgroundColor: isActive ? "var(--surface-hover)" : "transparent",
    color: isActive ? "var(--text-main)" : "var(--text-muted)",
    fontWeight: 500,
    fontSize: "0.875rem",
    display: "flex",
    alignItems: "center",
    justifyContent: isCollapsed ? "center" : "flex-start",
    gap: "0.75rem",
    transition: "background-color 0.15s ease, color 0.15s ease",
  });

  return (
    <div
      style={{
        width: `${width}px`,
        height: "100vh",
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "width 0.2s ease",
        overflowX: "hidden",
        zIndex: 40,
      }}
    >
      {/* Top Logo & Toggle */}
      <div
        style={{
          padding: isCollapsed ? "1.5rem 0" : "1.5rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              letterSpacing: "-0.05em",
              fontFamily: '"Space Grotesk", sans-serif',
              color: "var(--text-main)",
              display: isCollapsed ? "none" : "block",
            }}
          >
            ORCN
          </span>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.25rem",
            borderRadius: "4px",
          }}
        >
          <ChevronLeft
            size={18}
            style={{
              transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
      </div>

      {/* Navigation items */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed ? "0 0.5rem" : "0 0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <div
          style={{
            marginTop: "0.5rem",
            marginBottom: "0.25rem",
            padding: "0 0.75rem",
            display: isCollapsed ? "none" : "block",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Deploy
          </span>
        </div>

        <Link
          href="/deployments"
          style={navItemStyle(
            pathname.startsWith("/deployments") || pathname === "/",
          )}
        >
          <LayoutGrid size={18} strokeWidth={2.2} />
          {!isCollapsed && (
            <span style={{ whiteSpace: "nowrap" }}>Deployments</span>
          )}
        </Link>
        <Link
          href="/workloads/create"
          style={navItemStyle(pathname === "/workloads/create")}
        >
          <Boxes size={18} strokeWidth={2.2} />
          {!isCollapsed && (
            <span style={{ whiteSpace: "nowrap" }}>Create Workload</span>
          )}
        </Link>
        <Link
          href="/models/deploy"
          style={navItemStyle(pathname === "/models/deploy")}
        >
          <Zap size={18} strokeWidth={2.2} />
          {!isCollapsed && (
            <span style={{ whiteSpace: "nowrap" }}>Deploy AI Model</span>
          )}
        </Link>

        <div
          style={{
            marginTop: "1.5rem",
            marginBottom: "0.25rem",
            padding: "0 0.75rem",
            display: isCollapsed ? "none" : "block",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Configuration
          </span>
        </div>

        <Link
          href="/templates"
          style={navItemStyle(pathname.startsWith("/templates"))}
        >
          <Blocks size={18} strokeWidth={2.2} />
          {!isCollapsed && (
            <span style={{ whiteSpace: "nowrap" }}>Templates</span>
          )}
        </Link>
      </nav>

      {/* Bottom Footer Section: Profile & Theme Toggle */}
      <div
        style={{
          padding: isCollapsed ? "0.75rem 0.5rem" : "0.75rem 0.75rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          gap: "0.5rem",
          backgroundColor: "var(--surface)",
        }}
      >
        {/* Reserved Profile Button */}
        <button
          title="User Profile"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: isCollapsed ? "0.5rem" : "0.4rem 0.6rem",
            borderRadius: "6px",
            backgroundColor: "transparent",
            color: "var(--text-main)",
            border: "none",
            cursor: "pointer",
            flex: isCollapsed ? "initial" : 1,
            overflow: "hidden",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--surface-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            V
          </div>
          {!isCollapsed && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                overflow: "hidden",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                Vinit
              </span>
            </div>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            color: "var(--text-muted)",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background-color 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--surface-hover)";
            e.currentTarget.style.color = "var(--text-main)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}
