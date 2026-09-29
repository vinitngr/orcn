import { Button } from "@/components/ui/Button";

export function TemplateSummary({ data, onSave }: any) {
  const volumes = data.volumes || [];
  const containers = data.containers || [];
  const hasCompat =
    data.computeType === "GPU" &&
    Boolean(
      data.minVram ||
      data.minRam ||
      data.minCores ||
      data.cudaVersion ||
      data.gpuModel,
    );
  const totalStorage = volumes.reduce(
    (total: number, volume: any) => total + (parseInt(volume.size) || 0),
    0,
  );

  return (
    <aside
      style={{
        position: "sticky",
        top: "2rem",
        background: "#0a0a0a",
        color: "#e5e5e5",
        border: "1px solid #27272a",
        borderRadius: "var(--radius-md)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div
            style={{
              color: "#737373",
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.35rem",
            }}
          >
            Review
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>
            Template summary
          </h2>
        </div>
        <span
          style={{
            color: "#a3a3a3",
            fontSize: "0.6875rem",
            border: "1px solid #3f3f46",
            padding: "0.3rem 0.45rem",
          }}
        >
          {data.computeType || "CPU"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginTop: "1.25rem",
          fontSize: "0.8125rem",
        }}
      >
        <SummaryRow label="Name" value={data.name || "Untitled template"} />
        <SummaryRow label="Compute" value={data.computeType || "CPU"} />
        <div style={{ height: "1px", background: "#333" }} />
        <SummaryRow
          label="Containers"
          value={`${containers.length} configured`}
        />
        <SummaryRow
          label="Node volumes"
          value={`${volumes.length} · ${totalStorage} GB`}
        />

        {containers.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.45rem",
              paddingTop: "0.15rem",
            }}
          >
            <span style={{ color: "#737373", fontSize: "0.75rem" }}>
              Images
            </span>
            {containers.slice(0, 3).map((container: any, index: number) => (
              <div
                key={`${container.id || "container"}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  fontSize: "0.75rem",
                }}
              >
                <span style={{ color: "#737373" }}>
                  {container.id || `container-${index + 1}`}
                </span>
                <code
                  style={{
                    maxWidth: "62%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {container.image || "No image"}
                </code>
              </div>
            ))}
            {containers.length > 3 && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                +{containers.length - 3} more
              </span>
            )}
          </div>
        )}

        {hasCompat && (
          <>
            <div style={{ height: "1px", background: "#333" }} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
              }}
            >
              <span
                style={{
                  color: "#737373",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Hardware limits
              </span>
              {data.minVram && (
                <SummaryRow label="Min VRAM" value={`${data.minVram} GB`} />
              )}
              {data.minRam && (
                <SummaryRow label="Min RAM" value={`${data.minRam} GB`} />
              )}
              {data.minCores && (
                <SummaryRow label="Min cores" value={data.minCores} />
              )}
            </div>
          </>
        )}
      </div>

      <Button
        size="sm"
        onClick={onSave}
        style={{
          width: "100%",
          marginTop: "1.5rem",
          borderRadius: "var(--radius-sm)",
          background: "#fff",
          color: "#000",
          fontWeight: 600,
        }}
        disabled={!data.name || containers.length === 0}
      >
        {data.id ? "Update template" : "Create template"}
      </Button>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}
    >
      <span style={{ color: "#737373" }}>{label}</span>
      <span
        style={{ fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}
      >
        {value}
      </span>
    </div>
  );
}
