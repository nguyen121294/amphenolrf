import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { type UserRole } from "@/lib/auth/permissions";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";
import { SchedulingClient } from "./scheduling-client";

export const metadata = {
  title: "Production Scheduling - Production",
  description: "Công cụ lập kế hoạch sản xuất (Production Scheduling Output Tool) tích hợp.",
};

export default async function ProductionSchedulingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;

  // Dynamic permission guard
  const hasViewAccess = await checkUserPermission(session.userId, role, "/console/production/scheduling", "view");
  if (!hasViewAccess) {
    redirect("/console");
  }

  return (
    <div className="flex-1 space-y-6">
      <SchedulingClient username={session.username} />
    </div>
  );
}
