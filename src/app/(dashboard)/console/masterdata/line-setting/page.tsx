import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { type UserRole } from "@/lib/auth/permissions";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";
import { LineSettingClient } from "./line-setting-client";

export const metadata = {
  title: "Line Settings - Master Data",
  description: "Quản lý danh sách Line sản xuất.",
};

export default async function LineSettingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;

  // Dynamic permission guard
  const hasViewAccess = await checkUserPermission(session.userId, role, "/console/masterdata/line-setting", "view");
  if (!hasViewAccess) {
    redirect("/console");
  }

  // Determine if the user is allowed to edit lines
  const canEdit = await checkUserPermission(session.userId, role, "/console/masterdata/line-setting", "edit");

  return (
    <div className="flex-1 space-y-6">
      <LineSettingClient isReadOnly={!canEdit} />
    </div>
  );
}
