import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { UsersTableClient } from "@/app/(dashboard)/console/users/users-table-client";

export default async function DashboardAdminPage() {
  const session = await getSession();

  if (!session || session.role !== "super_admin") {
    redirect("/login");
  }

  // Fetch all users in the database
  const dbUsers = await db.select().from(users).orderBy(users.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-500">
          Quản trị hệ thống tối cao
        </h2>
        <p className="text-muted-foreground">
          Quản lý toàn bộ danh sách tài khoản, phân quyền quản đốc (Admin) và nhân viên (User).
        </p>
      </div>

      <UsersTableClient initialUsers={dbUsers} currentRole="super_admin" />
    </div>
  );
}
