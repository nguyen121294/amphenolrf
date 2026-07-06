"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { packingReports } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/jwt";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";

export interface ActionResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export async function savePackingReportAction(data: {
  date: string; // ISO String
  itemId: number;
  mo: string;
  qtyMo: number;
  packedQty: number;
  note?: string;
}): Promise<ActionResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
    }

    const hasAccess = await checkUserPermission(session.userId, session.role, "/console/production/packing", "create");
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền gửi báo cáo Packing." };
    }

    const { date, itemId, mo, qtyMo, packedQty, note } = data;

    // Field validation
    if (!date) return { success: false, error: "Vui lòng chọn ngày." };
    if (!itemId) return { success: false, error: "Vui lòng chọn Item." };
    if (!mo.trim()) return { success: false, error: "Vui lòng điền mã MO." };
    if (qtyMo <= 0) return { success: false, error: "Số lượng MO phải lớn hơn 0." };
    if (packedQty < 0) return { success: false, error: "Số lượng đóng gói/nhập kho không được âm." };

    // Insert into DB
    const [inserted] = await db
      .insert(packingReports)
      .values({
        date: new Date(date),
        itemId,
        mo: mo.trim(),
        qtyMo,
        packedQty,
        leader: session.username, // Auto set from logged-in username
        note: note ? note.trim() : null,
      })
      .returning();

    revalidatePath("/console/production/records");
    return { success: true, message: "Lưu báo cáo Packing thành công!", data: inserted };
  } catch (error) {
    console.error("Lỗi khi lưu báo cáo Packing:", error);
    return { success: false, error: "Đã xảy ra lỗi khi lưu vào cơ sở dữ liệu." };
  }
}
