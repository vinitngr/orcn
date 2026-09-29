"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaDocker } from "react-icons/fa";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/v1/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => {
        const text =
          `${template.name || ""} ${template.image || ""} ${template.computeType || template.compute_type || ""}`.toLowerCase();
        return text.includes(query.toLowerCase());
      }),
    [templates, query],
  );

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const response = await fetch(`/api/v1/templates/${id}`, {
      method: "DELETE",
    });
    if (response.ok)
      setTemplates((current) =>
        current.filter((template) => template.id !== id),
      );
  };

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Reusable container configurations for your workloads."
        action={
          <Button size="sm" onClick={() => router.push("/templates/create")}>
            New template
          </Button>
        }
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
          {filteredTemplates.length} template
          {filteredTemplates.length === 1 ? "" : "s"}
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search templates"
          style={{
            width: "260px",
            maxWidth: "100%",
            padding: "0.625rem 0.75rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-main)",
            fontSize: "0.8125rem",
          }}
        />
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(220px, 1.5fr) minmax(160px, 1fr) 100px 120px 190px",
            gap: "1rem",
            padding: "0.75rem 1.25rem",
            background: "var(--surface-hover)",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span>Template</span>
          <span>Image</span>
          <span>Compute</span>
          <span>Created</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>
        {filteredTemplates.length === 0 ? (
          <div
            style={{
              padding: "4rem 1.5rem",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.875rem",
            }}
          >
            {query
              ? "No templates match your search."
              : "No templates yet. Create your first template to get started."}
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const compute =
              template.computeType || template.compute_type || "CPU";
            return (
              <div
                key={template.id}
                onClick={() => router.push(`/templates/${template.id}`)}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(220px, 1.5fr) minmax(160px, 1fr) 100px 120px 190px",
                  gap: "1rem",
                  alignItems: "center",
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      display: "grid",
                      placeItems: "center",
                      background: "var(--bg-color)",
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  >
                    <FaDocker size={20} color="#2496ED" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {template.name || "Untitled template"}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.6875rem",
                        marginTop: "0.2rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {template.id}
                    </div>
                  </div>
                </div>
                <code
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {template.image || "Container template"}
                </code>
                <span
                  style={{
                    width: "fit-content",
                    padding: "0.25rem 0.45rem",
                    border: "1px solid var(--border)",
                    fontSize: "0.6875rem",
                  }}
                >
                  {compute}
                </span>
                <span
                  style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}
                >
                  {template.CreatedAt || template.created_at
                    ? new Date(
                        template.CreatedAt || template.created_at,
                      ).toLocaleDateString()
                    : "—"}
                </span>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      router.push(`/workloads/create?template=${template.id}`)
                    }
                  >
                    Deploy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteTemplate(template.id)}
                    style={{ color: "var(--danger)" }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
