"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assemblyReports, packingReports, lines, items } from "@/lib/db/schema";
import { eq, and, gte, lte, like, desc, count } from "drizzle-orm";
import { getSession } from "@/lib/auth/jwt";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";

export interface ActionResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface AssemblyRecord {
  id: number;
  date: Date;
  mo: string;
  qtyMo: number;
  actualQty: number;
  startTime: string;
  endTime: string;
  headCount: number;
  leader: string;
  note: string | null;
  createdAt: Date;
  lineName: string | null;
  itemDescription: string | null;
}

export interface PackingRecord {
  id: number;
  date: Date;
  mo: string;
  qtyMo: number;
  packedQty: number;
  leader: string;
  note: string | null;
  createdAt: Date;
  itemDescription: string | null;
}

export async function getAssemblyRecordsAction(filters: {
  lineId?: string;
  itemId?: string;
  mo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<ActionResponse<{ records: AssemblyRecord[]; totalPages: number; totalItems: number }>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Chưa đăng nhập." };

    const hasAccess = await checkUserPermission(session.userId, session.role, "/console/production/records", "view");
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền xem lịch sử báo cáo." };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.lineId) {
      conditions.push(eq(assemblyReports.lineId, parseInt(filters.lineId, 10)));
    }
    if (filters.itemId) {
      conditions.push(eq(assemblyReports.itemId, parseInt(filters.itemId, 10)));
    }
    if (filters.mo && filters.mo.trim()) {
      conditions.push(like(assemblyReports.mo, `%${filters.mo.trim()}%`));
    }
    if (filters.startDate) {
      conditions.push(gte(assemblyReports.date, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(assemblyReports.date, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query records with Joins
    const records = await db
      .select({
        id: assemblyReports.id,
        date: assemblyReports.date,
        mo: assemblyReports.mo,
        qtyMo: assemblyReports.qtyMo,
        actualQty: assemblyReports.actualQty,
        startTime: assemblyReports.startTime,
        endTime: assemblyReports.endTime,
        headCount: assemblyReports.headCount,
        leader: assemblyReports.leader,
        note: assemblyReports.note,
        createdAt: assemblyReports.createdAt,
        lineName: lines.lineName,
        itemDescription: items.itemDescription,
      })
      .from(assemblyReports)
      .leftJoin(lines, eq(assemblyReports.lineId, lines.id))
      .leftJoin(items, eq(assemblyReports.itemId, items.id))
      .where(whereClause)
      .orderBy(desc(assemblyReports.date), desc(assemblyReports.id))
      .limit(limit)
      .offset(offset);

    // Get count
    const [countResult] = await db
      .select({ val: count() })
      .from(assemblyReports)
      .where(whereClause);

    const totalItems = countResult?.val || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      success: true,
      data: {
        records,
        totalPages,
        totalItems,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo Assembly:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };
  }
}

export async function getPackingRecordsAction(filters: {
  itemId?: string;
  mo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<ActionResponse<{ records: PackingRecord[]; totalPages: number; totalItems: number }>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Chưa đăng nhập." };

    const hasAccess = await checkUserPermission(session.userId, session.role, "/console/production/records", "view");
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền xem lịch sử báo cáo." };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 15;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.itemId) {
      conditions.push(eq(packingReports.itemId, parseInt(filters.itemId, 10)));
    }
    if (filters.mo && filters.mo.trim()) {
      conditions.push(like(packingReports.mo, `%${filters.mo.trim()}%`));
    }
    if (filters.startDate) {
      conditions.push(gte(packingReports.date, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(packingReports.date, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query records with Joins
    const records = await db
      .select({
        id: packingReports.id,
        date: packingReports.date,
        mo: packingReports.mo,
        qtyMo: packingReports.qtyMo,
        packedQty: packingReports.packedQty,
        leader: packingReports.leader,
        note: packingReports.note,
        createdAt: packingReports.createdAt,
        itemDescription: items.itemDescription,
      })
      .from(packingReports)
      .leftJoin(items, eq(packingReports.itemId, items.id))
      .where(whereClause)
      .orderBy(desc(packingReports.date), desc(packingReports.id))
      .limit(limit)
      .offset(offset);

    // Get count
    const [countResult] = await db
      .select({ val: count() })
      .from(packingReports)
      .where(whereClause);

    const totalItems = countResult?.val || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      success: true,
      data: {
        records,
        totalPages,
        totalItems,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo Packing:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };
  }
}

export async function deleteAssemblyRecordAction(id: number): Promise<ActionResponse<void>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const hasAccess = await checkUserPermission(session.userId, session.role, "/console/production/records", "delete");
  if (!hasAccess) {
    return { success: false, error: "Bạn không có quyền xóa bản ghi lịch sử." };
  }

  try {
    await db.delete(assemblyReports).where(eq(assemblyReports.id, id));
    revalidatePath("/console/production/records");
    return { success: true, message: "Xóa báo cáo Assembly thành công!" };
  } catch (error) {
    console.error("Lỗi khi xóa báo cáo Assembly:", error);
    return { success: false, error: "Lỗi cơ sở dữ liệu khi xóa bản ghi." };
  }
}

export async function deletePackingRecordAction(id: number): Promise<ActionResponse<void>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const hasAccess = await checkUserPermission(session.userId, session.role, "/console/production/records", "delete");
  if (!hasAccess) {
    return { success: false, error: "Bạn không có quyền xóa bản ghi lịch sử." };
  }

  try {
    await db.delete(packingReports).where(eq(packingReports.id, id));
    revalidatePath("/console/production/records");
    return { success: true, message: "Xóa báo cáo Packing thành công!" };
  } catch (error) {
    console.error("Lỗi khi xóa báo cáo Packing:", error);
    return { success: false, error: "Lỗi cơ sở dữ liệu khi xóa bản ghi." };
  }
}
