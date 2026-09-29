"use client";

import { useParams } from "next/navigation";
import { ProviderWizard } from "@/components/providers/ProviderWizard";

export default function EditProviderPage() {
  const params = useParams<{ id: string }>();
  return <ProviderWizard connectionId={String(params.id)} />;
}
