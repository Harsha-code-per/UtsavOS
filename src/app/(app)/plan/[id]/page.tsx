import type { Metadata } from "next";
import { PlanDashboard } from "@/components/plan/PlanDashboard";

export const metadata: Metadata = { title: "Your plan" };

export default async function PlanPage({ params, searchParams }: PageProps<"/plan/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <PlanDashboard id={id} starter={query.starter === "1"} />;
}
