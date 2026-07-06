import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { UsersTableClient } from "./users-table-client";
import { eq } from "drizzle-orm";

export default async function UsersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Super Admin should be routed to /dashboard-admin
  if (session.role === "super_admin") {
    redirect("/dashboard-admin");
  }

  // Standard user is blocked
  if (session.role === "user") {
    redirect("/console");
  }

  // Admin manager (quản đốc) can ONLY query and see users with 'user' role
  const dbUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, "user"))
    .orderBy(users.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quản lý nhân viên</h2>
        <p className="text-muted-foreground">
          Quản lý tài khoản và reset mật khẩu cho vai trò nhân viên (User).
        </p>
      </div>

      <UsersTableClient initialUsers={dbUsers} currentRole="admin" />
    </div>
  );
}
