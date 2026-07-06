"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { lines, type Line } from "@/lib/db/schema";
import { eq, like, count, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/jwt";
import { canPerformOperation, type UserRole } from "@/lib/auth/permissions";

export interface ActionResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

// Helpers for checking role-based permission
async function checkWritePermission(): Promise<ActionResponse<never> | null> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
  }
  const role = session.role as UserRole;
  if (!canPerformOperation(role, "manage_lines")) {
    return { success: false, error: "Bạn không có quyền thực hiện chức năng này." };
  }
  return null;
}

/**
 * Fetch lines with pagination and search query
 */
export async function getLinesAction(
  searchQuery: string = "",
  page: number = 1,
  limit: number = 25
): Promise<ActionResponse<{ lines: Line[]; totalPages: number; totalItems: number }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Chưa đăng nhập." };
    }

    const offset = (page - 1) * limit;

    // Search condition
    const searchFilter = searchQuery
      ? like(lines.lineName, `%${searchQuery}%`)
      : undefined;

    // Fetch lines query
    const results = await db
      .select()
      .from(lines)
      .where(searchFilter)
      .orderBy(desc(lines.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ val: count() })
      .from(lines)
      .where(searchFilter);

    const totalItems = countResult?.val || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      success: true,
      data: {
        lines: results,
        totalPages,
        totalItems,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách line:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu khi lấy dữ liệu." };
  }
}

/**
 * Save (create or update) a single line
 */
export async function saveLineAction(data: {
  id?: number;
  lineName: string;
}): Promise<ActionResponse<Line>> {
  const permissionError = await checkWritePermission();
  if (permissionError) return permissionError;

  const { id, lineName } = data;

  if (!lineName.trim()) {
    return { success: false, error: "Tên Line không được để trống." };
  }

  try {
    if (id) {
      // Check if duplicate name exists for a different ID
      const [existing] = await db
        .select()
        .from(lines)
        .where(eq(lines.lineName, lineName.trim()))
        .limit(1);

      if (existing && existing.id !== id) {
        return { success: false, error: "Tên Line đã tồn tại." };
      }

      // Update
      const [updated] = await db
        .update(lines)
        .set({
          lineName: lineName.trim(),
          updatedAt: new Date(),
        })
        .where(eq(lines.id, id))
        .returning();

      revalidatePath("/app/masterdata/line-setting");
      return { success: true, message: "Cập nhật Line thành công!", data: updated };
    } else {
      // Check if name already exists
      const [existing] = await db
        .select()
        .from(lines)
        .where(eq(lines.lineName, lineName.trim()))
        .limit(1);

      if (existing) {
        return { success: false, error: "Tên Line đã tồn tại." };
      }

      // Create
      const [inserted] = await db
        .insert(lines)
        .values({
          lineName: lineName.trim(),
        })
        .returning();

      revalidatePath("/app/masterdata/line-setting");
      return { success: true, message: "Thêm Line mới thành công!", data: inserted };
    }
  } catch (error) {
    console.error("Lỗi khi lưu line:", error);
    return { success: false, error: "Đã xảy ra lỗi khi lưu vào cơ sở dữ liệu." };
  }
}

/**
 * Delete a single line
 */
export async function deleteLineAction(id: number): Promise<ActionResponse<void>> {
  const permissionError = await checkWritePermission();
  if (permissionError) return permissionError;

  try {
    await db.delete(lines).where(eq(lines.id, id));
    revalidatePath("/app/masterdata/line-setting");
    return { success: true, message: "Xóa Line thành công!" };
  } catch (error) {
    console.error("Lỗi khi xóa line:", error);
    return { success: false, error: "Lỗi cơ sở dữ liệu khi xóa Line. Line này có thể đang được tham chiếu trong các báo cáo khác." };
  }
}
