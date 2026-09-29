"use client";

import { useRouter } from "next/navigation";
import { WorkloadWorkflow } from "@/components/create/WorkloadWorkflow";
import { WorkloadSummary } from "@/components/create/WorkloadSummary";
import { WorkloadTemplatePicker } from "@/components/create/WorkloadTemplatePicker";
import { useCreateWorkload } from "./use-create-workload";
import { DeployConfirmDialog } from "./DeployConfirmDialog";

export default function CreateDeploymentPage() {
  const {
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
  } = useCreateWorkload();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <button
          type="button"
          onClick={() => router.push("/workloads")}
          className="hover:text-zinc-300"
        >
          Workloads
        </button>
        <span>/</span>
        <span className="text-zinc-300">Create workload</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Create Workload
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          Launch a template on dedicated compute from the network.
        </p>
      </div>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
        <WorkloadWorkflow
          data={formData}
          templates={templates}
          instances={instances}
          updateData={updateData}
          onOpenTemplatePicker={() => setIsTemplateModalOpen(true)}
          step={step}
          onStepChange={setStep}
        />
        <WorkloadSummary
          formData={formData}
          templates={templates}
          isDeploying={isDeploying}
          handleDeploy={handleDeploy}
          generateFinalSpec={generateFinalSpec}
          currentStep={step}
          onNext={() => setStep((current) => Math.min(3, current + 1))}
          canNext={
            step === 1
              ? Boolean(formData.workloadName && formData.templateId)
              : Boolean(formData.instance)
          }
        />
      </div>
      <WorkloadTemplatePicker
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        templates={templates}
        selectedTemplateId={formData.templateId}
        onSelect={handleTemplateSelect}
      />

      <DeployConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        isDeploying={isDeploying}
        onConfirm={performDeploy}
        workloadName={formData.workloadName}
        templateName={
          templates.find((t) => t.id === formData.templateId)?.name || "-"
        }
        instance={formData.instance}
        containerCount={(formData.containers || []).length || 0}
        replicas={formData.replicas || 1}
      />
    </div>
  );
}
