"use server";

import { signOut } from "@/auth";

export async function signOutFromDashboard() {
  await signOut({ redirectTo: "/login" });
}
