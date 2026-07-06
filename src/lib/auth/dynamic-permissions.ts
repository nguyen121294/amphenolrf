import { db } from "@/lib/db";
import { userPermissions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "import" | "export";

/**
 * Check if a user has dynamic permission on a page for a specific action.
 * Bypasses checks for 'super_admin' role (always true).
 * Falls back to static rules defined in permissions.ts if no DB record is found.
 */
export async function checkUserPermission(
  userId: number | string,
  role: string,
  pagePath: string,
  action: PermissionAction
): Promise<boolean> {
  // 1. Super Admin has absolute power
  if (role === "super_admin") {
    return true;
  }

  const uId = Number(userId);

  try {
    // 2. Query database for user's explicit permissions on this page path
    // Match exact path or group prefix (e.g. /app/production/assembly)
    const [record] = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, uId),
          eq(userPermissions.pagePath, pagePath)
        )
      )
      .limit(1);

    if (record) {
      switch (action) {
        case "view":
          return record.canView;
        case "create":
          return record.canCreate;
        case "edit":
          return record.canEdit;
        case "delete":
          return record.canDelete;
        case "import":
          return record.canImport;
        case "export":
          return record.canExport;
        default:
          return false;
      }
    }

    // 3. Fallback to static role-based defaults if no record exists in DB
    return getStaticDefaultPermission(role, pagePath, action);
  } catch (error) {
    console.error("Lỗi khi kiểm tra phân quyền động:", error);
    // Safe fallback to static permissions in case of DB failure
    return getStaticDefaultPermission(role, pagePath, action);
  }
}

/**
 * Fallback rules matching original static roles
 */
function getStaticDefaultPermission(
  role: string,
  pagePath: string,
  action: PermissionAction
): boolean {
  // Super admin fallback (redundant but safe)
  if (role === "super_admin") return true;

  // Admin fallback
  if (role === "admin") {
    // Admins can perform all actions on all standard routes
    return true;
  }

  // Regular User fallback
  if (role === "user") {
    // Users are blocked from User Management
    if (pagePath.startsWith("/console/users")) {
      return false;
    }

    // Users are allowed to view masterdata, but not modify it
    if (pagePath.startsWith("/console/masterdata")) {
      return action === "view";
    }

    // Users are allowed to view production pages and create (submit) reports
    if (pagePath.startsWith("/console/production")) {
      if (action === "view" || action === "create") {
        return true;
      }
      return false;
    }
  }

  return false;
}
