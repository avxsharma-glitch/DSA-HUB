import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GithubSyncWorkspace } from "./github-sync-workspace";

export const dynamic = "force-dynamic";

export default async function GithubSyncPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <GithubSyncWorkspace />;
}
