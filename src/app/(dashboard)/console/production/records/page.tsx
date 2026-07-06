import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { type UserRole } from "@/lib/auth/permissions";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";
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

  // Dynamic permission guard
  const hasViewAccess = await checkUserPermission(session.userId, role, "/console/production/records", "view");
  if (!hasViewAccess) {
    redirect("/console");
  }

  // Determine if the user is allowed to delete records
  const canDelete = await checkUserPermission(session.userId, role, "/console/production/records", "delete");

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
