import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { canAccessPage, type UserRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { PackingClient } from "./packing-client";

export const metadata = {
  title: "Packing Report - Production",
  description: "Nhập báo cáo sản xuất công đoạn Packing.",
};

export default async function PackingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;

  if (!canAccessPage(role, "/app/production/packing")) {
    redirect("/app");
  }

  // Fetch items from database to populate options
  const itemsList = await db.select().from(items).orderBy(items.itemDescription);

  return (
    <div className="flex-1 space-y-6">
      <PackingClient
        items={itemsList}
        username={session.username}
      />
    </div>
  );
}
