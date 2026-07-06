import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";
import { getSession } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { userPermissions, type UserPermission } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Load user permissions dynamically from the database
  let dbPermissions: UserPermission[] = [];
  try {
    if (session.role !== "super_admin") {
      dbPermissions = await db
        .select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, Number(session.userId)));
    }
  } catch (error) {
    console.error("Error loading layout permissions:", error);
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar role={session.role} permissions={dbPermissions} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Topbar username={session.username} role={session.role} />
        <main className="p-8 max-w-[calc(100vw-18rem)] mx-auto">
          <div className="min-h-[calc(100vh-8rem)]">{children}</div>
        </main>
      </div>
    </div>
  );
}
