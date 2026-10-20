import type { Metadata } from "next";
import { PlanList } from "@/components/plan/PlanList";

export const metadata: Metadata = { title: "My plans" };

export default function PlansPage() {
  return <PlanList />;
}
