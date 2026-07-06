import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { canAccessPage, canPerformOperation, type UserRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { lines, items } from "@/lib/db/schema";
import { RecordsClient } from "./records-client";

export const metadata = {
  title: "Production Records - History",
  description: "Lịch sử báo cáo sản xuất Assembly và Packing.",
};

export default async function RecordsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;

  if (!canAccessPage(role, "/app/production/records")) {
    redirect("/app");
  }

  // Determine if the user is allowed to delete records (Admins/Super Admins only)
  const canDelete = canPerformOperation(role, "manage_items");

  // Fetch items and lines to populate search filter drop-downs
  const itemsList = await db.select().from(items).orderBy(items.itemDescription);
  const linesList = await db.select().from(lines).orderBy(lines.lineName);

  return (
    <div className="flex-1 space-y-6">
      <RecordsClient
        lines={linesList}
        items={itemsList}
        canDelete={canDelete}
      />
    </div>
  );
}
