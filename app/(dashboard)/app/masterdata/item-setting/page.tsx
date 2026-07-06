import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { type UserRole } from "@/lib/auth/permissions";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";
import { ItemSettingClient } from "./item-setting-client";

export const metadata = {
  title: "Item Settings - Master Data",
  description: "Quản lý danh sách items, chỉ số UPH và thời gian XA.",
};

export default async function ItemSettingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;

  // Dynamic permission guard
  const hasViewAccess = await checkUserPermission(session.userId, role, "/app/masterdata/item-setting", "view");
  if (!hasViewAccess) {
    redirect("/app");
  }

  // Determine if the user is allowed to edit items (or create/delete, we pass edit as represents write permission)
  const canEdit = await checkUserPermission(session.userId, role, "/app/masterdata/item-setting", "edit");

  return (
    <div className="flex-1 space-y-6">
      <ItemSettingClient isReadOnly={!canEdit} />
    </div>
  );
}
