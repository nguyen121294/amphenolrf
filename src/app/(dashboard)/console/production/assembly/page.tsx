import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { type UserRole } from "@/lib/auth/permissions";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";
import { db } from "@/lib/db";
import { lines, items } from "@/lib/db/schema";
import { AssemblyClient } from "./assembly-client";

export const metadata = {
  title: "Assembly Report - Production",
  description: "Nhập báo cáo sản xuất công đoạn Assembly.",
};

export default async function AssemblyPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;

  // Dynamic permission guard
  const hasViewAccess = await checkUserPermission(session.userId, role, "/console/production/assembly", "view");
  if (!hasViewAccess) {
    redirect("/console");
  }

  // Fetch items and lines from database to populate options
  const itemsList = await db.select().from(items).orderBy(items.itemDescription);
  const linesList = await db.select().from(lines).orderBy(lines.lineName);

  return (
    <div className="flex-1 space-y-6">
      <AssemblyClient
        lines={linesList}
        items={itemsList}
        username={session.username}
      />
    </div>
  );
}
