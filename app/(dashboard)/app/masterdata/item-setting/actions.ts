"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { items, type Item } from "@/lib/db/schema";
import { eq, like, sql, count, desc } from "drizzle-orm";
import { read, write, utils } from "xlsx";
import { getSession } from "@/lib/auth/jwt";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";

export interface ActionResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

/**
 * Fetch items with pagination and search query
 */
export async function getItemsAction(
  searchQuery: string = "",
  page: number = 1,
  limit: number = 25
): Promise<ActionResponse<{ items: Item[]; totalPages: number; totalItems: number }>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Chưa đăng nhập." };
    }

    const hasAccess = await checkUserPermission(session.userId, session.role, "/app/masterdata/item-setting", "view");
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền xem dữ liệu danh sách sản phẩm." };
    }

    const offset = (page - 1) * limit;

    // Search condition
    const searchFilter = searchQuery
      ? like(items.itemDescription, `%${searchQuery}%`)
      : undefined;

    // Fetch items query
    const results = await db
      .select()
      .from(items)
      .where(searchFilter)
      .orderBy(desc(items.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ val: count() })
      .from(items)
      .where(searchFilter);

    const totalItems = countResult?.val || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      success: true,
      data: {
        items: results,
        totalPages,
        totalItems,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách item:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu khi lấy dữ liệu." };
  }
}

/**
 * Save (create or update) a single item
 */
export async function saveItemAction(data: {
  id?: number;
  itemDescription: string;
  uph: number;
  xaTime: number;
}): Promise<ActionResponse<Item>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const actionType = data.id ? "edit" : "create";
  const hasAccess = await checkUserPermission(session.userId, session.role, "/app/masterdata/item-setting", actionType);
  if (!hasAccess) {
    return { success: false, error: `Bạn không có quyền thực hiện thao tác ${actionType === "edit" ? "chỉnh sửa" : "thêm mới"} sản phẩm.` };
  }

  const { id, itemDescription, uph, xaTime } = data;

  if (!itemDescription.trim()) {
    return { success: false, error: "Item description không được để trống." };
  }
  if (uph < 0) {
    return { success: false, error: "UPH không được là số âm." };
  }
  if (xaTime < 0) {
    return { success: false, error: "Thời gian XA không được là số âm." };
  }

  try {
    if (id) {
      // Check if duplicate description exists for a different ID
      const [existing] = await db
        .select()
        .from(items)
        .where(eq(items.itemDescription, itemDescription.trim()))
        .limit(1);

      if (existing && existing.id !== id) {
        return { success: false, error: "Item description đã tồn tại." };
      }

      // Update
      const [updated] = await db
        .update(items)
        .set({
          itemDescription: itemDescription.trim(),
          uph,
          xaTime,
          updatedAt: new Date(),
        })
        .where(eq(items.id, id))
        .returning();

      revalidatePath("/app/masterdata/item-setting");
      return { success: true, message: "Cập nhật item thành công!", data: updated };
    } else {
      // Check if description already exists
      const [existing] = await db
        .select()
        .from(items)
        .where(eq(items.itemDescription, itemDescription.trim()))
        .limit(1);

      if (existing) {
        return { success: false, error: "Item description đã tồn tại." };
      }

      // Create
      const [inserted] = await db
        .insert(items)
        .values({
          itemDescription: itemDescription.trim(),
          uph,
          xaTime,
        })
        .returning();

      revalidatePath("/app/masterdata/item-setting");
      return { success: true, message: "Thêm item mới thành công!", data: inserted };
    }
  } catch (error) {
    console.error("Lỗi khi lưu item:", error);
    return { success: false, error: "Đã xảy ra lỗi khi lưu vào cơ sở dữ liệu." };
  }
}

/**
 * Delete a single item
 */
export async function deleteItemAction(id: number): Promise<ActionResponse<void>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const hasAccess = await checkUserPermission(session.userId, session.role, "/app/masterdata/item-setting", "delete");
  if (!hasAccess) {
    return { success: false, error: "Bạn không có quyền xóa sản phẩm." };
  }

  try {
    await db.delete(items).where(eq(items.id, id));
    revalidatePath("/app/masterdata/item-setting");
    return { success: true, message: "Xóa item thành công!" };
  } catch (error) {
    console.error("Lỗi khi xóa item:", error);
    return { success: false, error: "Lỗi cơ sở dữ liệu khi xóa item." };
  }
}

/**
 * Import items from an uploaded Excel file
 */
export async function importExcelAction(formData: FormData): Promise<ActionResponse<{ imported: number }>> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const hasAccess = await checkUserPermission(session.userId, session.role, "/app/masterdata/item-setting", "import");
  if (!hasAccess) {
    return { success: false, error: "Bạn không có quyền nhập dữ liệu từ Excel." };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "Vui lòng chọn file Excel để import." };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (rawData.length === 0) {
      return { success: false, error: "File Excel rỗng hoặc không có dữ liệu hợp lệ." };
    }

    const valuesToInsert: { itemDescription: string; uph: number; xaTime: number }[] = [];
    const errors: string[] = [];

    // Parse and validate rows
    rawData.forEach((row, index) => {
      let itemDescription = "";
      let uph = 0;
      let xaTime = 0;
      let hasDesc = false;

      // Resilient case-insensitive header mapping
      for (const [key, val] of Object.entries(row)) {
        const cleanKey = key.toString().trim().toLowerCase();
        if (cleanKey === "item description" || cleanKey === "description" || cleanKey === "mô tả") {
          itemDescription = val?.toString().trim() || "";
          if (itemDescription) hasDesc = true;
        } else if (cleanKey === "uph" || cleanKey === "units per hour") {
          uph = Math.max(0, parseInt(val?.toString() || "0", 10));
        } else if (cleanKey === "thời gian xa" || cleanKey === "xa" || cleanKey === "thời gian xa (h)" || cleanKey === "xa time") {
          xaTime = Math.max(0, parseFloat(val?.toString() || "0"));
        }
      }

      if (hasDesc) {
        // Validation check
        if (isNaN(uph)) {
          errors.push(`Dòng ${index + 2}: Giá trị UPH "${uph}" không hợp lệ. Mặc định là 0.`);
          uph = 0;
        }
        if (isNaN(xaTime)) {
          errors.push(`Dòng ${index + 2}: Giá trị Thời gian XA "${xaTime}" không hợp lệ. Mặc định là 0.`);
          xaTime = 0;
        }
        valuesToInsert.push({ itemDescription, uph, xaTime });
      }
    });

    // Deduplicate items by itemDescription (case-insensitive, last one wins) to avoid Postgres ON CONFLICT error
    const uniqueValuesMap = new Map<string, { itemDescription: string; uph: number; xaTime: number }>();
    valuesToInsert.forEach(item => {
      uniqueValuesMap.set(item.itemDescription.toLowerCase(), item);
    });
    const deduplicatedValues = Array.from(uniqueValuesMap.values());

    if (deduplicatedValues.length === 0) {
      return { success: false, error: "Không tìm thấy dữ liệu cột 'Item description' hợp lệ trong file." };
    }

    // Insert items in batches to optimize DB query
    const BATCH_SIZE = 1000;
    let importedCount = 0;

    for (let i = 0; i < deduplicatedValues.length; i += BATCH_SIZE) {
      const batch = deduplicatedValues.slice(i, i + BATCH_SIZE);
      
      // Bulk insert with onConflictDoUpdate
      await db.insert(items)
        .values(batch)
        .onConflictDoUpdate({
          target: items.itemDescription,
          set: {
            uph: sql`EXCLUDED.uph`,
            xaTime: sql`EXCLUDED.xa_time`,
            updatedAt: new Date(),
          }
        });
      
      importedCount += batch.length;
    }

    revalidatePath("/app/masterdata/item-setting");

    let message = `Đã xử lý thành công ${importedCount} items.`;
    if (errors.length > 0) {
      message += ` (Có một số cảnh báo: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""})`;
    }

    return {
      success: true,
      message,
      data: { imported: importedCount }
    };
  } catch (error) {
    console.error("Lỗi khi import file Excel:", error);
    const errMsg = error instanceof Error ? error.message : "Định dạng file không hỗ trợ.";
    return { success: false, error: `Lỗi đọc file: ${errMsg}` };
  }
}

/**
 * Export all items to Excel
 * Returns base64 encoded string of workbook
 */
export async function exportExcelAction(): Promise<ActionResponse<string>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Phiên làm việc đã hết hạn." };
    }

    const hasAccess = await checkUserPermission(session.userId, session.role, "/app/masterdata/item-setting", "export");
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền xuất dữ liệu ra Excel." };
    }

    // Fetch all items from DB
    const allItems = await db.select().from(items).orderBy(items.itemDescription);

    // Map DB items to displayable columns with Vietnamese headers
    const exportData = allItems.map((item) => ({
      "Item description": item.itemDescription,
      "UPH": item.uph,
      "Thời gian XA (h)": item.xaTime,
    }));

    // Create workbook and worksheet
    const worksheet = utils.json_to_sheet(exportData);
    
    // Set column widths for better Excel format
    worksheet["!cols"] = [
      { wch: 35 }, // Item description width
      { wch: 12 }, // UPH width
      { wch: 18 }, // XA Time width
    ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Item Settings");

    // Write to binary buffer and encode as Base64
    const excelBuffer = write(workbook, { bookType: "xlsx", type: "base64" });

    return {
      success: true,
      data: excelBuffer
    };
  } catch (error) {
    console.error("Lỗi khi xuất file Excel:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu khi xuất Excel." };
  }
}
