import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { type UserRole } from "@/lib/auth/permissions";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";
import { DashboardClient } from "./dashboard-client";

export const metadata = {
  title: "Production Dashboard",
  description: "Tổng hợp sản xuất và hiệu suất lắp ráp hàng ngày.",
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;

  // Dynamic permission guard for viewing the page
  const hasViewAccess = await checkUserPermission(
    session.userId,
    role,
    "/app/production/dashboard",
    "view"
  );
  if (!hasViewAccess) {
    redirect("/app");
  }

  // Determine if user can edit/configure daily summary
  const canEdit = await checkUserPermission(
    session.userId,
    role,
    "/app/production/dashboard",
    "edit"
  );

  return (
    <div className="flex-1 space-y-6">
      <DashboardClient canEdit={canEdit} />
    </div>
  );
}
