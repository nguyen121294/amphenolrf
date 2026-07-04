import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { UsersTableClient } from "./users-table-client";

export default async function UsersPage() {
  const session = await getSession();

  // If user is not logged in or role is standard 'user', redirect to /dashboard
  if (!session || session.role === "user") {
    redirect("/dashboard");
  }

  // Fetch users from database order by id
  const dbUsers = await db.select().from(users).orderBy(users.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h2>
        <p className="text-muted-foreground">
          Quản lý tài khoản đăng nhập và phân quyền hệ thống.
        </p>
      </div>

      <UsersTableClient initialUsers={dbUsers} currentRole={session.role} />
    </div>
  );
}
