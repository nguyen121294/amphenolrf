"use server";

import { db } from "@/lib/db";
import {
  assemblyReports,
  packingReports,
  lines,
  items,
  dailyProductionSummaries,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/jwt";
import { checkUserPermission } from "@/lib/auth/dynamic-permissions";
import { write, utils } from "xlsx";

export interface ActionResponse<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface DailySummaryData {
  supervisor: string;
  totalHeadcount: number;
  absentees: number;
  overtime: number;
}

export interface AggregatedRow {
  lineId: number;
  lineName: string;
  leader: string;
  mo: string;
  itemDescription: string;
  qtyMo: number;
  uph: number;
  dailyPlanQty: number;
  actualQty: number;
  goodsReceiptQty: number;
  pending: number;
  note: string | null;
  xaTime: number;
  totalXa: number;
  trainingTime: number;
  stoppageTime: number;
  coTime: number;
  materialsTime: number;
  qualityTime: number;
  sopTime: number;
  faiTime: number;
  fqcTime: number;
  otherLossTime: number;
}

export interface KPIStats {
  totalHeadcount: number;
  absentees: number;
  attendance: number;
  totalNormalHours: number;
  totalOvertime: number;
  availableTime: number;
  producingTime: number;
  totalXa: number;
  efficiency: number;
  utilization: number;
  productivity: number;
}

// 1. Get Daily Summary Metadata (Supervisor, Absentees, OverTime)
export async function getDailySummaryAction(dateStr: string): Promise<ActionResponse<DailySummaryData | null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Chưa đăng nhập." };

    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const [summary] = await db
      .select({
        supervisor: dailyProductionSummaries.supervisor,
        totalHeadcount: dailyProductionSummaries.totalHeadcount,
        absentees: dailyProductionSummaries.absentees,
        overtime: dailyProductionSummaries.overtime,
      })
      .from(dailyProductionSummaries)
      .where(
        and(
          gte(dailyProductionSummaries.date, startOfDay),
          lte(dailyProductionSummaries.date, endOfDay)
        )
      )
      .limit(1);

    return {
      success: true,
      data: summary || null,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin giám sát ca:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };
  }
}

// 2. Save/Update Daily Summary Metadata (Supervisor, Absentees, OverTime)
export async function saveDailySummaryAction(data: {
  date: string;
  supervisor: string;
  totalHeadcount: number;
  absentees: number;
  overtime: number;
}): Promise<ActionResponse<void>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Phiên làm việc hết hạn." };

    const hasAccess = await checkUserPermission(
      session.userId,
      session.role,
      "/console/production/dashboard",
      "edit"
    );
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền cập nhật thông tin giám sát." };
    }

    const { date, supervisor, totalHeadcount, absentees, overtime } = data;
    if (!supervisor.trim()) {
      return { success: false, error: "Vui lòng nhập tên Supervisor." };
    }
    if (totalHeadcount < 0) return { success: false, error: "Tổng số người không được âm." };
    if (absentees < 0) return { success: false, error: "Số người vắng không được âm." };
    if (overtime < 0) return { success: false, error: "Số giờ tăng ca không được âm." };

    if (absentees > totalHeadcount) {
      return { success: false, error: "Số người nghỉ không được lớn hơn tổng số người." };
    }

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Check if record exists
    const [existing] = await db
      .select({ id: dailyProductionSummaries.id })
      .from(dailyProductionSummaries)
      .where(
        and(
          gte(dailyProductionSummaries.date, startOfDay),
          lte(dailyProductionSummaries.date, endOfDay)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(dailyProductionSummaries)
        .set({
          supervisor: supervisor.trim(),
          totalHeadcount,
          absentees,
          overtime,
          updatedAt: new Date(),
        })
        .where(eq(dailyProductionSummaries.id, existing.id));
    } else {
      await db.insert(dailyProductionSummaries).values({
        date: new Date(date),
        supervisor: supervisor.trim(),
        totalHeadcount,
        absentees,
        overtime,
      });
    }

    return { success: true, message: "Cập nhật giám sát ca thành công!" };
  } catch (error) {
    console.error("Lỗi khi lưu thông tin giám sát ca:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };
  }
}

// 3. Get Daily Production Aggregated Report
export async function getDailyProductionReportAction(dateStr: string): Promise<ActionResponse<{
  rows: AggregatedRow[];
  summary: DailySummaryData;
  stats: KPIStats;
}>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Chưa đăng nhập." };

    const hasAccess = await checkUserPermission(
      session.userId,
      session.role,
      "/console/production/dashboard",
      "view"
    );
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền xem trang này." };
    }

    const targetDate = new Date(dateStr);
    const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));

    // A. Fetch assembly reports of the day
    const assemblyList = await db
      .select({
        id: assemblyReports.id,
        date: assemblyReports.date,
        lineId: assemblyReports.lineId,
        lineName: lines.lineName,
        leader: assemblyReports.leader,
        mo: assemblyReports.mo,
        itemId: assemblyReports.itemId,
        itemDescription: items.itemDescription,
        uph: items.uph,
        xaTime: items.xaTime,
        qtyMo: assemblyReports.qtyMo,
        actualQty: assemblyReports.actualQty,
        dailyPlanQty: assemblyReports.dailyPlanQty,
        headCount: assemblyReports.headCount,
        note: assemblyReports.note,
        trainingTime: assemblyReports.trainingTime,
        stoppageTime: assemblyReports.stoppageTime,
        coTime: assemblyReports.coTime,
        materialsTime: assemblyReports.materialsTime,
        qualityTime: assemblyReports.qualityTime,
        sopTime: assemblyReports.sopTime,
        faiTime: assemblyReports.faiTime,
        fqcTime: assemblyReports.fqcTime,
        otherLossTime: assemblyReports.otherLossTime,
      })
      .from(assemblyReports)
      .leftJoin(lines, eq(assemblyReports.lineId, lines.id))
      .leftJoin(items, eq(assemblyReports.itemId, items.id))
      .where(and(gte(assemblyReports.date, startOfDay), lte(assemblyReports.date, endOfDay)))
      .orderBy(lines.lineName, assemblyReports.id);

    // B. Fetch packing reports of the day to compute Goods Receipt Quantity
    const packingList = await db
      .select({
        mo: packingReports.mo,
        itemId: packingReports.itemId,
        packedQty: packingReports.packedQty,
      })
      .from(packingReports)
      .where(and(gte(packingReports.date, startOfDay), lte(packingReports.date, endOfDay)));

    // Group packing reports by mo + itemId to sum packedQty
    const packingMap: Record<string, number> = {};
    for (const p of packingList) {
      const key = `${p.mo}_${p.itemId}`;
      packingMap[key] = (packingMap[key] || 0) + p.packedQty;
    }

    // C. Combine data
    const rows: AggregatedRow[] = assemblyList.map((a) => {
      const key = `${a.mo}_${a.itemId}`;
      const goodsReceiptQty = packingMap[key] || 0;
      const pending = Math.max(0, a.dailyPlanQty - goodsReceiptQty);
      const totalXa = a.actualQty * (a.xaTime || 0); // Option B: actualQty * XA/pc

      return {
        lineId: a.lineId,
        lineName: a.lineName || `Line ${a.lineId}`,
        leader: a.leader,
        mo: a.mo,
        itemDescription: a.itemDescription || "N/A",
        qtyMo: a.qtyMo,
        uph: a.uph || 0,
        dailyPlanQty: a.dailyPlanQty,
        actualQty: a.actualQty,
        goodsReceiptQty,
        pending,
        note: a.note,
        xaTime: a.xaTime || 0,
        totalXa,
        trainingTime: a.trainingTime,
        stoppageTime: a.stoppageTime,
        coTime: a.coTime,
        materialsTime: a.materialsTime,
        qualityTime: a.qualityTime,
        sopTime: a.sopTime,
        faiTime: a.faiTime,
        fqcTime: a.fqcTime,
        otherLossTime: a.otherLossTime,
      };
    });

    // D. Fetch daily metadata
    const [summaryRec] = await db
      .select()
      .from(dailyProductionSummaries)
      .where(
        and(
          gte(dailyProductionSummaries.date, startOfDay),
          lte(dailyProductionSummaries.date, endOfDay)
        )
      )
      .limit(1);

    const summary: DailySummaryData = {
      supervisor: summaryRec?.supervisor || "",
      totalHeadcount: summaryRec?.totalHeadcount || 0,
      absentees: summaryRec?.absentees || 0,
      overtime: summaryRec?.overtime || 0,
    };

    // E. Calculate stats
    // Sum unique headcounts from lines
    const lineHeadcounts: Record<number, number> = {};
    let totalLossTime = 0;
    let totalXa = 0;

    for (const a of assemblyList) {
      lineHeadcounts[a.lineId] = Math.max(lineHeadcounts[a.lineId] || 0, a.headCount);
      totalLossTime +=
        a.trainingTime +
        a.stoppageTime +
        a.coTime +
        a.materialsTime +
        a.qualityTime +
        a.sopTime +
        a.faiTime +
        a.fqcTime +
        a.otherLossTime;
    }

    const calculatedHeadcount = Object.values(lineHeadcounts).reduce((sum, val) => sum + val, 0);
    const totalHeadcount = summary.totalHeadcount > 0 ? summary.totalHeadcount : calculatedHeadcount;
    const attendance = Math.max(0, totalHeadcount - summary.absentees);
    const totalNormalHours = attendance * 8;
    const availableTime = totalNormalHours + summary.overtime;
    const producingTime = Math.max(0, availableTime - totalLossTime);

    for (const r of rows) {
      totalXa += r.totalXa;
    }

    const efficiency = producingTime > 0 ? totalXa / producingTime : 0;
    const utilization = availableTime > 0 ? producingTime / availableTime : 0;
    const productivity = availableTime > 0 ? totalXa / availableTime : 0;

    const stats: KPIStats = {
      totalHeadcount,
      absentees: summary.absentees,
      attendance,
      totalNormalHours,
      totalOvertime: summary.overtime,
      availableTime,
      producingTime,
      totalXa,
      efficiency,
      utilization,
      productivity,
    };

    return {
      success: true,
      data: {
        rows,
        summary,
        stats,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo ngày tổng hợp:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu." };
  }
}

// Helper to construct cells with formulas/types for xlsx
function makeCell(val: any, formula?: string, type: string = "s") {
  if (formula) {
    return { t: "n", f: formula };
  }
  if (typeof val === "number") {
    return { t: "n", v: val };
  }
  if (val === null || val === undefined) {
    return { t: "z" };
  }
  return { t: type, v: String(val) };
}

// 4. Export Daily Report to Base64 Excel matching spreadsheet template
export async function exportDailyExcelAction(dateStr: string): Promise<ActionResponse<string>> {
  try {
    const reportRes = await getDailyProductionReportAction(dateStr);
    if (!reportRes.success || !reportRes.data) {
      return { success: false, error: reportRes.error || "Không thể lấy dữ liệu để xuất file." };
    }

    const { rows, summary, stats } = reportRes.data;
    const numRows = rows.length;
    const totalRowIdx = 10 + numRows;

    // Excel worksheet grid representation (A1 is index 0,0)
    // We will build a matrix of cells and then use sheet_to_json or manually map
    const ws: any = {};
    ws["!ref"] = `A1:V${totalRowIdx}`;

    // Fill metadata and KPI block
    // Row 1
    ws["A1"] = makeCell("Date:");
    ws["B1"] = makeCell(dateStr);
    ws["I1"] = makeCell("Producing Time:");
    ws["J1"] = makeCell(null, `G7-SUM(N${totalRowIdx}:V${totalRowIdx})`);
    
    // Row 2
    ws["A2"] = makeCell("Department:");
    ws["B2"] = makeCell("Assembly");
    ws["I2"] = makeCell("Total XA:");
    ws["J2"] = makeCell(null, `M${totalRowIdx}`);

    // Row 3
    ws["A3"] = makeCell("Supervisor:");
    ws["B3"] = makeCell(summary.supervisor);

    // Row 4
    ws["C4"] = makeCell("Ratio");
    ws["J4"] = makeCell("Target");
    ws["K4"] = makeCell("Actual");
    ws["L4"] = makeCell("Gap");

    // Row 5
    ws["A5"] = makeCell("Total Headcount:");
    ws["B5"] = makeCell(stats.totalHeadcount);
    ws["F5"] = makeCell("Total Normal Hours:");
    ws["G5"] = makeCell(null, "B7*8");
    ws["I5"] = makeCell("Efficiency: (J2/J1)");
    ws["J5"] = makeCell(0.78);
    ws["K5"] = makeCell(null, "J2/J1");
    ws["L5"] = makeCell(null, "K5-J5");

    // Row 6
    ws["A6"] = makeCell("Absentees:");
    ws["B6"] = makeCell(summary.absentees);
    ws["C6"] = makeCell(null, "B6/B5");
    ws["F6"] = makeCell("Total OverTime:");
    ws["G6"] = makeCell(summary.overtime);
    ws["I6"] = makeCell("Utilization: (J1/G7)");
    ws["J6"] = makeCell(0.9);
    ws["K6"] = makeCell(null, "J1/G7");
    ws["L6"] = makeCell(null, "K6-J6");

    // Row 7
    ws["A7"] = makeCell("Attendance:");
    ws["B7"] = makeCell(null, "B5-B6");
    ws["F7"] = makeCell("Available Time:");
    ws["G7"] = makeCell(null, "G6+G5");
    ws["I7"] = makeCell("Productivity:");
    ws["J7"] = makeCell(0.702);
    ws["K7"] = makeCell(null, "K6*K5");
    ws["L7"] = makeCell(null, "K7-J7");

    // Row 9: Headers
    const headers = [
      "Line", "Leader", "M0#", "Item", "Quantity/M0#", "UPH", "Daily Plan Quantity",
      "Assembly Actual Quantity", "Goods Receipt Quantity", "Pending (chỉ lấy giá trị dương)",
      "Note", "XA/pc", "Total XA", "Training Time", "Line Stoppage Hours", "C.O time",
      "Materials fulfillment", "Quality issue (loss time)", "SOP (loss time)",
      "FAI (loss time)", "FQC (loss time)", "Other loss time"
    ];

    const getColLetter = (idx: number) => String.fromCharCode(65 + idx); // 0 -> A, 1 -> B... (works up to V, index 21)

    headers.forEach((h, idx) => {
      ws[`${getColLetter(idx)}9`] = makeCell(h);
    });

    // Rows 10 to (10 + numRows - 1)
    rows.forEach((r, idx) => {
      const rowNum = 10 + idx;
      ws[`A${rowNum}`] = makeCell(r.lineName);
      ws[`B${rowNum}`] = makeCell(r.leader);
      ws[`C${rowNum}`] = makeCell(r.mo);
      ws[`D${rowNum}`] = makeCell(r.itemDescription);
      ws[`E${rowNum}`] = makeCell(r.qtyMo);
      ws[`F${rowNum}`] = makeCell(r.uph);
      ws[`G${rowNum}`] = makeCell(r.dailyPlanQty);
      ws[`H${rowNum}`] = makeCell(r.actualQty);
      ws[`I${rowNum}`] = makeCell(r.goodsReceiptQty);
      // Pending = max(0, DailyPlan - GoodsReceipt)
      ws[`J${rowNum}`] = makeCell(null, `IF(G${rowNum}-I${rowNum}>0,G${rowNum}-I${rowNum},0)`);
      ws[`K${rowNum}`] = makeCell(r.note);
      ws[`L${rowNum}`] = makeCell(r.xaTime);
      // Total XA = ActualQty * XA/pc (Option B)
      ws[`M${rowNum}`] = makeCell(null, `H${rowNum}*L${rowNum}`);
      ws[`N${rowNum}`] = makeCell(r.trainingTime || null);
      ws[`O${rowNum}`] = makeCell(r.stoppageTime || null);
      ws[`P${rowNum}`] = makeCell(r.coTime || null);
      ws[`Q${rowNum}`] = makeCell(r.materialsTime || null);
      ws[`R${rowNum}`] = makeCell(r.qualityTime || null);
      ws[`S${rowNum}`] = makeCell(r.sopTime || null);
      ws[`T${rowNum}`] = makeCell(r.faiTime || null);
      ws[`U${rowNum}`] = makeCell(r.fqcTime || null);
      ws[`V${rowNum}`] = makeCell(r.otherLossTime || null);
    });

    // Total Row
    ws[`A${totalRowIdx}`] = makeCell("Total");
    ws[`G${totalRowIdx}`] = makeCell(null, `SUM(G10:G${totalRowIdx-1})`);
    ws[`H${totalRowIdx}`] = makeCell(null, `SUM(H10:H${totalRowIdx-1})`);
    ws[`I${totalRowIdx}`] = makeCell(null, `SUM(I10:I${totalRowIdx-1})`);
    ws[`J${totalRowIdx}`] = makeCell(null, `SUM(J10:J${totalRowIdx-1})`);
    ws[`M${totalRowIdx}`] = makeCell(null, `SUM(M10:M${totalRowIdx-1})`);
    ws[`N${totalRowIdx}`] = makeCell(null, `SUM(N10:N${totalRowIdx-1})`);
    ws[`O${totalRowIdx}`] = makeCell(null, `SUM(O10:O${totalRowIdx-1})`);
    ws[`P${totalRowIdx}`] = makeCell(null, `SUM(P10:P${totalRowIdx-1})`);
    ws[`Q${totalRowIdx}`] = makeCell(null, `SUM(Q10:Q${totalRowIdx-1})`);
    ws[`R${totalRowIdx}`] = makeCell(null, `SUM(R10:R${totalRowIdx-1})`);
    ws[`S${totalRowIdx}`] = makeCell(null, `SUM(S10:S${totalRowIdx-1})`);
    ws[`T${totalRowIdx}`] = makeCell(null, `SUM(T10:T${totalRowIdx-1})`);
    ws[`U${totalRowIdx}`] = makeCell(null, `SUM(U10:U${totalRowIdx-1})`);
    ws[`V${totalRowIdx}`] = makeCell(null, `SUM(V10:V${totalRowIdx-1})`);

    // Column widths
    ws["!cols"] = [
      { wch: 8 },  // Line
      { wch: 10 }, // Leader
      { wch: 10 }, // MO#
      { wch: 25 }, // Item
      { wch: 14 }, // Qty/MO
      { wch: 8 },  // UPH
      { wch: 15 }, // Plan Qty
      { wch: 18 }, // Assembly Qty
      { wch: 18 }, // GR Qty
      { wch: 12 }, // Pending
      { wch: 15 }, // Note
      { wch: 10 }, // XA/pc
      { wch: 12 }, // Total XA
      { wch: 12 }, // Training
      { wch: 15 }, // Stoppage
      { wch: 10 }, // C.O
      { wch: 18 }, // Materials
      { wch: 15 }, // Quality
      { wch: 10 }, // SOP
      { wch: 10 }, // FAI
      { wch: 10 }, // FQC
      { wch: 12 }  // Other
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(workbook_custom(wb, ws), ws, "Daily Report");

    const excelBuffer = write(wb, { bookType: "xlsx", type: "base64" });

    return {
      success: true,
      data: excelBuffer,
    };
  } catch (error) {
    console.error("Lỗi khi xuất báo cáo Excel:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu khi xuất Excel." };
  }
}

// Workaround for workbook typing in ts
function workbook_custom(wb: any, ws: any) {
  return wb;
}
