import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { canAccessPage, canPerformOperation, type UserRole } from "@/lib/auth/permissions";
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

  // Extra safety check in page layer
  if (!canAccessPage(role, "/app/masterdata/line-setting")) {
    redirect("/app");
  }

  // Determine if the user is allowed to write/edit lines
  const canEdit = canPerformOperation(role, "manage_lines");

  return (
    <div className="flex-1 space-y-6">
      <LineSettingClient isReadOnly={!canEdit} />
    </div>
  );
}
