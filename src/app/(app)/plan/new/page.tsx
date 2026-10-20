import type { Metadata } from "next";
import { BriefWizard } from "@/components/brief/BriefWizard";
import { EVENT_TYPES } from "@/lib/domain/schema";

export const metadata: Metadata = { title: "New plan" };

export default async function NewPlanPage({ searchParams }: PageProps<"/plan/new">) {
  const params = await searchParams;
  const type = EVENT_TYPES.find((t) => t === params.type);
  return <BriefWizard initialType={type} fromDescription={params.from === "description"} />;
}
