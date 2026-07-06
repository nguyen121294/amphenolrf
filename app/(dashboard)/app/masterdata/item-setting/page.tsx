import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { canAccessPage, canPerformOperation, type UserRole } from "@/lib/auth/permissions";
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

  // Extra safety check in page layer
  if (!canAccessPage(role, "/app/masterdata/item-setting")) {
    redirect("/app");
  }

  // Determine if the user is allowed to write/edit items
  const canEdit = canPerformOperation(role, "manage_items");

  return (
    <div className="flex-1 space-y-6">
      <ItemSettingClient isReadOnly={!canEdit} />
    </div>
  );
}
