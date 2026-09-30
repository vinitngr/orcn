"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export function NodeVolumesConfig({ data, updateData }: any) {
  const volumes = data.volumes || [];

  const addVolume = () => {
    updateData({
      volumes: [
        ...volumes,
        { name: `vol-${volumes.length}`, type: "persistent", size: "", hostPath: "" },
      ],
    });
  };

  const updateVolume = (index: number, field: string, val: string) => {
    const newVols = [...volumes];
    newVols[index][field] = val;
    updateData({ volumes: newVols });
  };

  const removeVolume = (index: number) => {
    const newVols = volumes.filter((_: any, i: number) => i !== index);
    updateData({ volumes: newVols });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-main)]">
            Node Storage Volumes
          </label>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Define persistent disks (like EBS) allocated on the host node.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addVolume}>
          + Add Disk
        </Button>
      </div>

      {volumes.length === 0 ? (
        <div className="p-8 border border-dashed border-[var(--border)] rounded-lg text-center text-[var(--text-muted)] bg-[var(--surface)]">
          No physical volumes defined. Only ephemeral storage will be used.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {volumes.map((vol: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                value={vol.name}
                onChange={(e) => updateVolume(i, "name", e.target.value)}
                placeholder="Name (e.g. cache)"
                className="flex-1"
              />
              <Select
                value={vol.type || "persistent"}
                onChange={(val: string) => updateVolume(i, "type", val)}
                options={[
                  { value: "persistent", label: "Persistent Disk (Cloud/EBS)" },
                  { value: "docker", label: "Docker Managed Volume" },
                  { value: "bind", label: "Host Path (Bind)" },
                ]}
                className="w-48"
              />
              {vol.type === "bind" ? (
                <Input
                  value={vol.hostPath || ""}
                  onChange={(e) => updateVolume(i, "hostPath", e.target.value)}
                  placeholder="Host Path (e.g. /home/ubuntu)"
                  className="flex-1"
                />
              ) : vol.type === "persistent" ? (
                <div className="flex items-center border border-[var(--border)] rounded-lg bg-[var(--bg-color)] flex-1">
                  <Input
                    type="number"
                    value={vol.size || ""}
                    onChange={(e) => updateVolume(i, "size", e.target.value)}
                    placeholder="Size"
                    className="flex-1 border-none focus:outline-none"
                  />
                  <span className="px-2 text-[var(--text-muted)] border-l border-[var(--border)]">
                    GB
                  </span>
                </div>
              ) : (
                <span className="text-[var(--text-muted)] italic flex items-center">
                  Stored on VM&apos;s default root disk
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeVolume(i)}
                className="h-9 w-9 p-0"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
