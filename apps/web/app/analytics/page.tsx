import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <AnalyticsDashboard />;
}
