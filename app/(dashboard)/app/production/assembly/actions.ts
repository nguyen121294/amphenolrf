"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assemblyReports } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/jwt";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";

export interface ActionResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export async function saveAssemblyReportAction(data: {
  date: string; // ISO String
  lineId: number;
  mo: string;
  itemId: number;
  qtyMo: number;
  actualQty: number;
  dailyPlanQty: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  headCount: number;
  note?: string;
  trainingTime?: number;
  stoppageTime?: number;
  coTime?: number;
  materialsTime?: number;
  qualityTime?: number;
  sopTime?: number;
  faiTime?: number;
  fqcTime?: number;
  otherLossTime?: number;
}): Promise<ActionResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
    }

    const hasAccess = await checkUserPermission(session.userId, session.role, "/app/production/assembly", "create");
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền gửi báo cáo Assembly." };
    }

    const {
      date,
      lineId,
      mo,
      itemId,
      qtyMo,
      actualQty,
      dailyPlanQty,
      startTime,
      endTime,
      headCount,
      note,
      trainingTime,
      stoppageTime,
      coTime,
      materialsTime,
      qualityTime,
      sopTime,
      faiTime,
      fqcTime,
      otherLossTime,
    } = data;

    // Field validation
    if (!date) return { success: false, error: "Vui lòng chọn ngày." };
    if (!lineId) return { success: false, error: "Vui lòng chọn Line." };
    if (!mo.trim()) return { success: false, error: "Vui lòng điền mã MO." };
    if (!itemId) return { success: false, error: "Vui lòng chọn Item." };
    if (qtyMo <= 0) return { success: false, error: "Số lượng MO phải lớn hơn 0." };
    if (actualQty < 0) return { success: false, error: "Số lượng thực tế không được âm." };
    if (dailyPlanQty < 0) return { success: false, error: "Sản lượng kế hoạch không được âm." };
    if (!startTime) return { success: false, error: "Vui lòng chọn giờ bắt đầu." };
    if (!endTime) return { success: false, error: "Vui lòng chọn giờ kết thúc." };
    if (headCount <= 0) return { success: false, error: "Số người phải lớn hơn 0." };

    // Validate Start Time < End Time
    if (startTime >= endTime) {
      return { success: false, error: "Giờ kết thúc phải lớn hơn giờ bắt đầu." };
    }

    // Insert into DB
    const [inserted] = await db
      .insert(assemblyReports)
      .values({
        date: new Date(date),
        lineId,
        mo: mo.trim(),
        itemId,
        qtyMo,
        actualQty,
        dailyPlanQty,
        startTime,
        endTime,
        headCount,
        leader: session.username, // Auto set from logged-in username
        note: note ? note.trim() : null,
        trainingTime: trainingTime || 0,
        stoppageTime: stoppageTime || 0,
        coTime: coTime || 0,
        materialsTime: materialsTime || 0,
        qualityTime: qualityTime || 0,
        sopTime: sopTime || 0,
        faiTime: faiTime || 0,
        fqcTime: fqcTime || 0,
        otherLossTime: otherLossTime || 0,
      })
      .returning();

    revalidatePath("/app/production/records");
    return { success: true, message: "Lưu báo cáo Assembly thành công!", data: inserted };
  } catch (error) {
    console.error("Lỗi khi lưu báo cáo Assembly:", error);
    return { success: false, error: "Đã xảy ra lỗi khi lưu vào cơ sở dữ liệu." };
  }
}
