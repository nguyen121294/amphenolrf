import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";
import { getSession } from "@/lib/auth/jwt";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar role={session.role} />

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
