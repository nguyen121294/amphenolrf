import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";
import { type UserRole } from "@/lib/auth/permissions";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";
import { ShippingPlanClient } from "./shipping-plan-client";

export const metadata = {
  title: "Shipping Plan - Production",
  description: "Công cụ lập kế hoạch giao hàng (Shipping Plan Output Tool) tích hợp.",
};

export default async function ShippingPlanPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.role as UserRole;

  // Dynamic permission guard
  const hasViewAccess = await checkUserPermission(session.userId, role, "/console/production/shipping-plan", "view");
  if (!hasViewAccess) {
    redirect("/console");
  }

  return (
    <div className="flex-1 space-y-6">
      <ShippingPlanClient username={session.username} />
    </div>
  );
}
