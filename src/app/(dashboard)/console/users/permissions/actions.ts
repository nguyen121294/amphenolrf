"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { userPermissions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/jwt";
import { type UserRole } from "@/lib/auth/permissions";

export interface ActionResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface PermissionUpdate {
  pagePath: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canImport: boolean;
  canExport: boolean;
}

// Configurable pages in the system
const CONFIGURABLE_PAGES = [
  { path: "/console/production/dashboard", name: "Dashboard Production" },
  { path: "/console/production/assembly", name: "Báo cáo Assembly" },
  { path: "/console/production/packing", name: "Báo cáo Packing" },
  { path: "/console/production/records", name: "Lịch sử báo cáo" },
  { path: "/console/production/shipping-plan", name: "Kế hoạch giao hàng (Shipping Plan)" },
  { path: "/console/production/scheduling", name: "Kế hoạch sản xuất (Scheduling)" },
  { path: "/console/masterdata/item-setting", name: "Thiết lập Item (Master Data)" },
  { path: "/console/masterdata/line-setting", name: "Thiết lập Line (Master Data)" },
];

// Helper to check static default permissions (used when no DB record is found)
function getStaticDefaultPermission(role: string, pagePath: string) {
  const isUser = role === "user";
  const isAdmin = role === "admin" || role === "super_admin";

  if (isUser) {
    if (pagePath.startsWith("/console/masterdata")) {
      return {
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canImport: false,
        canExport: false,
      };
    }
    if (pagePath.startsWith("/console/production")) {
      if (
        pagePath === "/console/production/shipping-plan" ||
        pagePath === "/console/production/scheduling"
      ) {
        return {
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canImport: false,
          canExport: false,
        };
      }
      return {
        canView: true,
        canCreate: true, // Standard user can write reports
        canEdit: false,
        canDelete: false,
        canImport: false,
        canExport: false,
      };
    }
  }

  if (isAdmin) {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canImport: true,
      canExport: true,
    };
  }

  return {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canImport: false,
    canExport: false,
  };
}

/**
 * Fetch dynamic permissions for a target user.
 * Prefills with static default permissions if no DB records exist yet.
 */
export async function getUserPermissionsAction(
  targetUserId: number
): Promise<ActionResponse<{ username: string; role: string; permissions: PermissionUpdate[] }>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Chưa đăng nhập." };

    // Fetch target user role & username
    const [targetUser] = await db
      .select({ username: users.username, role: users.role })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      return { success: false, error: "Không tìm thấy người dùng." };
    }

    // Fetch existing dynamic permissions from DB
    const dbPermissions = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, targetUserId));

    // Map each configurable page, falling back to static defaults if not defined in DB
    const permissions: PermissionUpdate[] = CONFIGURABLE_PAGES.map((page) => {
      const dbRecord = dbPermissions.find((p) => p.pagePath === page.path);
      if (dbRecord) {
        return {
          pagePath: dbRecord.pagePath,
          canView: dbRecord.canView,
          canCreate: dbRecord.canCreate,
          canEdit: dbRecord.canEdit,
          canDelete: dbRecord.canDelete,
          canImport: dbRecord.canImport,
          canExport: dbRecord.canExport,
        };
      }
      // Fallback
      return {
        pagePath: page.path,
        ...getStaticDefaultPermission(targetUser.role, page.path),
      };
    });

    return {
      success: true,
      data: {
        username: targetUser.username,
        role: targetUser.role,
        permissions,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy phân quyền người dùng:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };
  }
}

/**
 * Save dynamic permissions for a user.
 * Implements strict security restrictions.
 */
export async function saveUserPermissionsAction(
  targetUserId: number,
  permissionsList: PermissionUpdate[]
): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Phiên làm việc đã hết hạn." };

    const currentUserId = session.userId;
    const currentRole = session.role as UserRole;

    // 1. Security Check: Cannot edit own permissions
    if (currentUserId === targetUserId) {
      return { success: false, error: "Bạn không thể tự chỉnh sửa phân quyền của chính mình." };
    }

    // Fetch target user info
    const [targetUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      return { success: false, error: "Không tìm thấy người dùng đích." };
    }

    // 2. Security Check: Admin role restrictions
    // Standard 'admin' can ONLY manage 'user' permissions.
    // Only 'super_admin' can manage 'admin' permissions.
    if (currentRole === "admin" && (targetUser.role as string) !== "user") {
      return { success: false, error: "Tài quản quản lý (Admin) chỉ có quyền thay đổi phân quyền của Nhân viên (User)." };
    }

    if ((targetUser.role as string) === "super_admin") {
      return { success: false, error: "Không thể chỉnh sửa quyền của quản trị tối cao (Super Admin)." };
    }

    // 3. Perform Upsert for each permission configuration in transaction
    await db.transaction(async (tx) => {
      for (const p of permissionsList) {
        await tx
          .insert(userPermissions)
          .values({
            userId: targetUserId,
            pagePath: p.pagePath,
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canImport: p.canImport,
            canExport: p.canExport,
          })
          .onConflictDoUpdate({
            target: [userPermissions.userId, userPermissions.pagePath],
            set: {
              canView: p.canView,
              canCreate: p.canCreate,
              canEdit: p.canEdit,
              canDelete: p.canDelete,
              canImport: p.canImport,
              canExport: p.canExport,
              updatedAt: new Date(),
            },
          });
      }
    });

    revalidatePath("/console/users/permissions");
    return { success: true, message: "Lưu phân quyền người dùng thành công!" };
  } catch (error) {
    console.error("Lỗi khi lưu phân quyền người dùng:", error);
    return { success: false, error: "Đã xảy ra lỗi khi lưu vào cơ sở dữ liệu." };
  }
}
