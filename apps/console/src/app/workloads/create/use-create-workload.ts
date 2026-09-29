"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mapInstance } from "@/components/create/instance-utils";

interface VolumeInput {
  name: string;
  type?: string;
  size?: string;
  hostPath?: string;
}

interface ContainerInput {
  id?: string;
  image?: string;
  gpu?: boolean;
  cmd?: string;
  entrypoint?: string;
  envVars?: { key: string; value: string }[];
  ports?: { port: string; is_public: boolean }[];
  mounts?: { volumeName: string; mountPath: string }[];
  resources?: {
    type: string;
    url: string;
    target: string;
    filesFilter?: string;
    files?: string[];
  }[];
}

export interface WorkloadFormData {
  workloadName: string;
  replicas: number;
  templateId: string;
  provider: string;
  providerConnectionId: string;
  providerConfig: Record<string, unknown>;
  volumeSizeGb: number;
  instance: any;
  volumes: VolumeInput[];
  containers: ContainerInput[];
}

function parseTemplateData(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function mapTemplateToForm(parsed: any) {
  return {
    volumes: (parsed.volumes || []).map((v: any) => ({
      name: v.name,
      type: v.type || "persistent",
      size: v.size_gb?.toString() || "10",
      hostPath: v.host_path || "",
    })),
    containers: (parsed.containers || []).map((c: any) => {
      const args = c.args || {};
      return {
        id: c.id || "",
        image: args.image || "",
        gpu: args.gpu || false,
        cmd: (args.cmd || []).join(" "),
        entrypoint: (args.entrypoint || []).join(" "),
        envVars: Object.entries(args.env || {}).map(([key, value]) => ({
          key,
          value,
        })),
        ports: (args.expose || [])
          .filter((p: any) => p?.port)
          .map((p: any) => ({
            port: p.port.toString(),
            is_public: p.is_public ?? true,
          })),
        mounts: (args.volume_mounts || []).map((m: any) => ({
          volumeName: m.volume_name || "",
          mountPath: m.mount_path || "",
        })),
        resources: (args.resources || []).map((r: any) => ({
          type: (r.type || "hf").toLowerCase(),
          url: r.url || "",
          target: r.target || "",
          files: Array.isArray(r.files) ? r.files : [],
        })),
      };
    }),
  };
}

function parseCommand(str: string) {
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
}

export function useCreateWorkload() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const [formData, setFormData] = useState<WorkloadFormData>({
    workloadName: "",
    replicas: 1,
    templateId: "",
    provider: "nosana",
    providerConnectionId: "",
    providerConfig: {},
    volumeSizeGb: 50,
    instance: null as any,
    volumes: [],
    containers: [],
  });

  const [isDeploying, setIsDeploying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let urlTemplateId = "";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      urlTemplateId = params.get("template") || "";
      if (urlTemplateId) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }

    fetch("/api/v1/templates")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setTemplates(json);
          if (urlTemplateId) {
            const t = json.find((x) => x.id === urlTemplateId);
            if (t) {
              const parsed = parseTemplateData(t.data);
              setFormData((prev) => ({
                ...prev,
                templateId: urlTemplateId,
                ...mapTemplateToForm(parsed),
              }));
            } else {
              setFormData((prev) => ({ ...prev, templateId: urlTemplateId }));
            }
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/v1/instances?provider=${formData.provider}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.instances && Array.isArray(json.instances)) {
          setInstances(json.instances.map(mapInstance));
        } else {
          setInstances([]);
        }
      })
      .catch(console.error);
  }, [formData.provider]);

  const handleTemplateSelect = (id: string) => {
    if (!id) {
      setFormData((prev) => ({
        ...prev,
        templateId: "",
        volumes: [],
        containers: [],
      }));
      return;
    }

    const t = templates.find((x) => x.id === id);
    if (!t) return;

    const parsed = parseTemplateData(t.data);
    setFormData((prev) => ({
      ...prev,
      templateId: id,
      ...mapTemplateToForm(parsed),
    }));
  };

  const updateData = (newData: Partial<WorkloadFormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const generateFinalSpec = () => {
    const originalTemplate = templates.find(
      (t) => t.id === formData.templateId,
    );
    let originalData: any = {};
    if (originalTemplate) originalData = parseTemplateData(originalTemplate.data);

    const storageVolumes = (formData.volumes || []).map((s) => ({
      name: s.name,
      type: s.type || "persistent",
      size_gb: parseInt(s.size || "0") || 10,
      ...(s.type === "bind" && s.hostPath ? { host_path: s.hostPath } : {}),
    }));

    return {
      name: formData.workloadName,
      computeType: originalData.computeType || "CPU",
      version: "v2",
      type: "container",
      meta: originalData.meta || { trigger: "dashboard" },
      ...(storageVolumes.length > 0 ? { volumes: storageVolumes } : {}),
      containers: (formData.containers || []).map((c) => {
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

        const env = (c.envVars || []).reduce(
          (acc: Record<string, string>, env) => {
            if (env.key) acc[env.key] = env.value;
            return acc;
          },
          {},
        );

        const mounts = (c.mounts || [])
          .filter((m) => m.volumeName && m.mountPath)
          .map((m) => ({
            volume_name: m.volumeName,
            mount_path: m.mountPath,
          }));

        const expose = (c.ports || [])
          .filter((p) => parseInt(p.port))
          .map((p) => ({
            port: parseInt(p.port),
            protocol: "tcp",
            is_public: p.is_public ?? true,
          }));

        const resources = (c.resources || [])
          .filter((r) => r.url && r.target)
          .map((r) => ({
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

        const args: any = {
          image: c.image || "ubuntu:latest",
          gpu: c.gpu,
        };

        if (cmd.length > 0) args.cmd = cmd;
        if (entrypoint.length > 0) args.entrypoint = entrypoint;
        if (Object.keys(env).length > 0) args.env = env;
        if (mounts.length > 0) args.volume_mounts = mounts;
        if (expose.length > 0) args.expose = expose;
        if (resources.length > 0) args.resources = resources;

        return {
          id: c.id || "master",
          args,
        };
      }),
    };
  };

  const handleDeploy = () => {
    setConfirmOpen(true);
  };

  const performDeploy = async () => {
    if (!formData.workloadName || !formData.templateId || !formData.instance || !formData.providerConnectionId)
      return;
    setIsDeploying(true);
    setConfirmOpen(false);

    const finalSpec = generateFinalSpec();

    try {
      const payload = {
        name: formData.workloadName,
        template_id: formData.templateId,
        provider_id: formData.provider,
        provider_connection_id: formData.providerConnectionId,
        instance_type_id: formData.instance.id,
        instance_name: formData.instance.name,
        replicas: formData.replicas,
        spec: finalSpec,
      };

      const res = await fetch("/api/v1/workloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.warning) alert(data.warning);
        router.push("/");
      } else {
        alert(data.error || "Failed to deploy workload");
        if (data.details) console.error("Validation Errors:", data.details);
      }
    } catch (e) {
      console.error(e);
      alert("Network error while deploying");
    } finally {
      setIsDeploying(false);
    }
  };

  return {
    router,
    step,
    setStep,
    templates,
    instances,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    formData,
    updateData,
    isDeploying,
    confirmOpen,
    setConfirmOpen,
    handleTemplateSelect,
    handleDeploy,
    performDeploy,
    generateFinalSpec,
  };
}
