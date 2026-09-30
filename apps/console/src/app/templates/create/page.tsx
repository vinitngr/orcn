"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BasicConfig } from "@/components/templates/BasicConfig";
import { CompatibilityConfig } from "@/components/templates/CompatibilityConfig";
import { NodeVolumesConfig } from "@/components/templates/NodeVolumesConfig";
import { ContainersConfig } from "@/components/templates/ContainersConfig";
import { ReadmeConfig } from "@/components/templates/ReadmeConfig";
import { TemplateSummary } from "@/components/templates/TemplateSummary";
import { TemplateWizard } from "@/components/templates/TemplateWizard";

const STEPS = [
  "General Setup",
  "Node Requirements",
  "Node Storage Volumes",
  "Containers",
  "Documentation",
];

export default function CreateTemplatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({
    computeType: "GPU",
    volumes: [],
    containers: [],
  });
  const [viewMode, setViewMode] = useState<"wizard" | "spec">("wizard");
  const [rawSpec, setRawSpec] = useState<string>("");

  const updateData = (newData: any) => {
    setFormData({ ...formData, ...newData });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const generateSpec = (data: any) => {
    const parseCommand = (str: string) => {
      if (!str) return [];
      const matches = str.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      return matches.map((s) => {
        if (
          (s.startsWith('"') && s.endsWith('"')) ||
          (s.startsWith("'") && s.endsWith("'"))
        ) {
          return s.slice(1, -1);
        }
        return s;
      });
    };

    const storageVolumes = (data.volumes || []).map((s: any) => ({
      name: s.name,
      type: s.type || "persistent",
      size_gb: parseInt(s.size) || 10,
      ...(s.type === "bind" && s.hostPath ? { host_path: s.hostPath } : {}),
    }));

    const systemReqs: any = {};
    if (parseInt(data.minVram)) systemReqs.min_vram_gb = parseInt(data.minVram);
    if (parseInt(data.minCores)) systemReqs.min_cores = parseInt(data.minCores);
    if (parseInt(data.minRam)) systemReqs.min_ram_gb = parseInt(data.minRam);
    if (data.cudaVersion) systemReqs.cuda_version = data.cudaVersion;
    if (data.arch && data.arch !== "any") systemReqs.arch = data.arch;
    if (data.gpuModel) systemReqs.gpu_model = data.gpuModel;

    const meta: any = { trigger: "dashboard" };
    if (data.readme) meta.description = data.readme;
    if (Object.keys(systemReqs).length > 0)
      meta.system_requirements = systemReqs;

    return {
      name: data.name || "untitled-template",
      computeType: data.computeType || "CPU",
      version: "v2",
      type: "container",
      meta,
      ...(storageVolumes.length > 0 ? { volumes: storageVolumes } : {}),
      containers: (data.containers || []).map((c: any) => {
        const entrypoint = parseCommand((c.entrypoint || "").trim());

        let cmd: string[] = [];
        const rawCmd = (c.cmd || "").trim();
        if (rawCmd) {
          if (entrypoint.includes("-c")) {
            cmd = [rawCmd];
          } else {
            cmd = parseCommand(rawCmd);
          }
        }

        const env = (c.envVars || []).reduce((acc: any, env: any) => {
          if (env.key) acc[env.key] = env.value;
          return acc;
        }, {});

        const mounts = (c.mounts || [])
          .filter((m: any) => m.volumeName && m.mountPath)
          .map((m: any) => ({
            volume_name: m.volumeName,
            mount_path: m.mountPath,
          }));

        const resources = (c.resources || [])
          .filter((r: any) => r.url && r.target)
          .map((r: any) => ({
            type: r.type,
            url: r.url,
            target: r.target,
            files: Array.isArray(r.files)
              ? r.files
              : (r.filesFilter || "")
                  .split(",")
                  .map((f: string) => f.trim())
                  .filter((f: string) => f),
          }));

        return {
          id: c.id || `container-${Date.now()}`,
          args: {
            image: c.image || "ubuntu:latest",
            gpu: data.computeType === "GPU",
            ...(entrypoint.length > 0 ? { entrypoint } : {}),
            ...(cmd.length > 0 ? { cmd } : {}),
            ...(Object.keys(env).length > 0 ? { env } : {}),
            ...(mounts.length > 0 ? { volume_mounts: mounts } : {}),
            ...(resources.length > 0 ? { resources } : {}),
            ...(c.ports &&
            (c.ports || []).filter((p: any) => parseInt(p.port)).length > 0
              ? {
                  expose: (c.ports || [])
                    .filter((p: any) => parseInt(p.port))
                    .map((p: any) => ({
                      port: parseInt(p.port),
                      protocol: "tcp",
                      is_public: p.is_public ?? true,
                    })),
                }
              : {}),
          },
        };
      }),
    };
  };

  const handleSave = async () => {
    try {
      let spec;
      if (viewMode === "spec") {
        try {
          spec = JSON.parse(rawSpec);
        } catch (e) {
          alert("Invalid JSON format in the Spec editor.");
          return;
        }
      } else {
        spec = generateSpec(formData);
      }

      const res = await fetch("http://localhost:8080/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });
      if (res.ok) {
        router.push("/templates");
      } else {
        const errJson = await res.json();
        let msg = errJson.error || "Failed to save template";
        if (errJson.details && errJson.details.length > 0) {
          msg += ":\n- " + errJson.details.join("\n- ");
        }
        alert("Validation Error:\n" + msg);
      }
    } catch (e: any) {
      alert("Error: " + e.toString());
      console.error(e);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <button
          type="button"
          onClick={() => router.push("/templates")}
          className="hover:text-zinc-300"
        >
          Templates
        </button>
        <span>/</span>
        <span className="text-zinc-300">Create template</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Create Template
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Build a reusable container configuration for your workloads.
        </p>
      </div>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
        <TemplateWizard
          data={formData}
          updateData={updateData}
          currentStep={currentStep}
          onStepChange={(step) => setCurrentStep(step - 1)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          rawSpec={rawSpec}
          onRawSpecChange={setRawSpec}
          generateSpec={generateSpec}
        />
        <TemplateSummary data={formData} onSave={handleSave} />
      </div>
    </div>
  );
}
