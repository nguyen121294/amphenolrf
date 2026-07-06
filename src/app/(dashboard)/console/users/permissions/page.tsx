import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { canAccessPage, type UserRole } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, ne } from "drizzle-orm";
import { PermissionsClient } from "./permissions-client";

export const metadata = {
  title: "User Permissions - Administration",
  description: "Cấu hình phân quyền động chi tiết cho từng người dùng.",
};

export default async function UserPermissionsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;
  const currentUserId = session.userId;

  // Static permission guard: Standard users are blocked
  if (!canAccessPage(role, "/console/users/permissions") || role === "user") {
    redirect("/console");
  }

  let usersList: { id: number; username: string; role: string }[] = [];

  // Query users based on security hierarchy rules
  if (role === "super_admin") {
    // Super admin can manage all admins and users, excluding themselves
    usersList = await db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .where(ne(users.id, Number(currentUserId)))
      .orderBy(users.username);
  } else if (role === "admin") {
    // Admin can ONLY manage users with 'user' role
    usersList = await db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .where(eq(users.role, "user"))
      .orderBy(users.username);
  }

  return (
    <div className="flex-1 space-y-6">
      <PermissionsClient users={usersList} />
    </div>
  );
}
