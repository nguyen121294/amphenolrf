"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  LayoutDashboard,
  User,
  Users,
  Clock,
  Download,
  Edit3,
  Check,
  TrendingUp,
  Percent,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  getDailyProductionReportAction,
  saveDailySummaryAction,
  exportDailyExcelAction,
  type AggregatedRow,
  type DailySummaryData,
  type KPIStats,
} from "./actions";

interface DashboardClientProps {
  canEdit: boolean;
}

export function DashboardClient({ canEdit }: DashboardClientProps) {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<{
    rows: AggregatedRow[];
    summary: DailySummaryData;
    stats: KPIStats;
  } | null>(null);

  // Dialog edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editSupervisor, setEditSupervisor] = useState("");
  const [editTotalHeadcount, setEditTotalHeadcount] = useState("");
  const [editAbsentees, setEditAbsentees] = useState("");
  const [editOvertime, setEditOvertime] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Fetch report data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDailyProductionReportAction(date);
      if (res.success && res.data) {
        setReportData(res.data);
        // Pre-fill edit fields
        setEditSupervisor(res.data.summary.supervisor);
        const summaryHeadcount = res.data.summary.totalHeadcount;
        const calculatedHeadcount = res.data.stats.totalHeadcount;
        setEditTotalHeadcount(String(summaryHeadcount > 0 ? summaryHeadcount : calculatedHeadcount));
        setEditAbsentees(String(res.data.summary.absentees));
        setEditOvertime(String(res.data.summary.overtime));
      } else {
        toast.error(res.error || "Không thể tải báo cáo ngày.");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Edit Dialog
  const handleOpenEdit = () => {
    if (!canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa thông tin giám sát.");
      return;
    }
    setEditOpen(true);
  };

  // Submit Daily Summary (Supervisor, Absentees, OverTime)
  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSupervisor.trim()) {
      return toast.error("Vui lòng nhập tên Supervisor.");
    }

    const totalHeadcountVal = parseInt(editTotalHeadcount, 10);
    const absenteesVal = parseInt(editAbsentees, 10);
    const overtimeVal = parseFloat(editOvertime);

    if (isNaN(totalHeadcountVal) || totalHeadcountVal < 0) {
      return toast.error("Tổng số người không được nhỏ hơn 0.");
    }
    if (isNaN(absenteesVal) || absenteesVal < 0) {
      return toast.error("Số người vắng không được nhỏ hơn 0.");
    }
    if (isNaN(overtimeVal) || overtimeVal < 0) {
      return toast.error("Số giờ tăng ca không được nhỏ hơn 0.");
    }

    if (absenteesVal > totalHeadcountVal) {
      return toast.error("Số người nghỉ không được lớn hơn tổng số người.");
    }

    try {
      setSaveLoading(true);
      const res = await saveDailySummaryAction({
        date,
        supervisor: editSupervisor.trim(),
        totalHeadcount: totalHeadcountVal,
        absentees: absenteesVal,
        overtime: overtimeVal,
      });

      if (res.success) {
        toast.success(res.message || "Cập nhật thành công!");
        setEditOpen(false);
        loadData();
      } else {
        toast.error(res.error || "Có lỗi xảy ra.");
      }
    } catch {
      toast.error("Lỗi kết nối khi lưu dữ liệu.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Export Excel action
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await exportDailyExcelAction(date);
      if (res.success && res.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.data}`;
        link.download = `Bao_cao_tong_hop_${date}.xlsx`;
        link.click();
        toast.success("Đã xuất và tải xuống file Excel!");
      } else {
        toast.error(res.error || "Không thể xuất file Excel.");
      }
    } catch {
      toast.error("Lỗi kết nối khi xuất Excel.");
    } finally {
      setExporting(false);
    }
  };

  // Helper to style OEE status
  const getOeeBadge = (val: number, target: number) => {
    const pct = val * 100;
    const diff = pct - target * 100;
    if (diff >= 0) return <Badge className="bg-emerald-500 hover:bg-emerald-600">Đạt (Gap: +{diff.toFixed(1)}%)</Badge>;
    if (diff >= -10) return <Badge className="bg-amber-500 hover:bg-amber-600">Cảnh báo (Gap: {diff.toFixed(1)}%)</Badge>;
    return <Badge className="bg-rose-500 hover:bg-rose-600">Yếu (Gap: {diff.toFixed(1)}%)</Badge>;
  };

  const getProgressColor = (val: number, target: number) => {
    const diff = val - target;
    if (diff >= 0) return "bg-emerald-500";
    if (diff >= -0.1) return "bg-amber-500";
    return "bg-rose-500";
  };

  const totals = reportData?.rows.reduce(
    (acc, cur) => ({
      dailyPlanQty: acc.dailyPlanQty + cur.dailyPlanQty,
      actualQty: acc.actualQty + cur.actualQty,
      goodsReceiptQty: acc.goodsReceiptQty + cur.goodsReceiptQty,
      pending: acc.pending + cur.pending,
      totalXa: acc.totalXa + cur.totalXa,
      trainingTime: acc.trainingTime + cur.trainingTime,
      stoppageTime: acc.stoppageTime + cur.stoppageTime,
      coTime: acc.coTime + cur.coTime,
      materialsTime: acc.materialsTime + cur.materialsTime,
      qualityTime: acc.qualityTime + cur.qualityTime,
      sopTime: acc.sopTime + cur.sopTime,
      faiTime: acc.faiTime + cur.faiTime,
      fqcTime: acc.fqcTime + cur.fqcTime,
      otherLossTime: acc.otherLossTime + cur.otherLossTime,
    }),
    {
      dailyPlanQty: 0,
      actualQty: 0,
      goodsReceiptQty: 0,
      pending: 0,
      totalXa: 0,
      trainingTime: 0,
      stoppageTime: 0,
      coTime: 0,
      materialsTime: 0,
      qualityTime: 0,
      sopTime: 0,
      faiTime: 0,
      fqcTime: 0,
      otherLossTime: 0,
    }
  ) || null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans">
      {/* Header and top filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard Sản xuất (Daily Production)
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Tổng hợp và kiểm soát hiệu suất sản xuất hàng ngày
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 shadow-sm">
            <CalendarIcon className="h-4 w-4 text-zinc-400" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-7 border-0 p-0 focus-visible:ring-0 text-sm w-[130px]"
            />
          </div>

          {/* Supervisor action */}
          {canEdit && (
            <Button
              onClick={handleOpenEdit}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-9"
              disabled={loading}
            >
              <Edit3 className="h-4 w-4" />
              Thiết lập giám sát ca
            </Button>
          )}

          {/* Export Excel */}
          <Button
            onClick={handleExportExcel}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5 h-9"
            disabled={loading || exporting || !reportData || reportData.rows.length === 0}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Xuất Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-400">Đang tổng hợp dữ liệu sản xuất...</p>
        </div>
      ) : !reportData || reportData.rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertTriangle className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Không có dữ liệu báo cáo</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Không tìm thấy bản ghi sản xuất Assembly nào cho ngày {date}.
              </p>
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="mt-2 flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Thiết lập Giám sát để tạo ngày
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metadata & KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Labor Card */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Nhân sự & Công</CardTitle>
                <Users className="h-4 w-4 text-zinc-400" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">{reportData.stats.attendance}</span>
                  <span className="text-xs text-zinc-400">đang có mặt</span>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Tổng Headcount:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{reportData.stats.totalHeadcount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vắng mặt (Absentees):</span>
                    <span className="font-semibold text-rose-500">{reportData.stats.absentees} ({((reportData.stats.absentees / (reportData.stats.totalHeadcount || 1)) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Card */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Thời gian làm việc</CardTitle>
                <Clock className="h-4 w-4 text-zinc-400" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">{reportData.stats.availableTime}</span>
                  <span className="text-xs text-zinc-400">giờ khả dụng (Available)</span>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Giờ hành chính:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{reportData.stats.totalNormalHours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Giờ tăng ca (OT):</span>
                    <span className="font-semibold text-amber-500">{reportData.stats.totalOvertime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Production Time & XA */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Sản xuất thực tế</CardTitle>
                <TrendingUp className="h-4 w-4 text-zinc-400" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold text-primary">{reportData.stats.producingTime}</span>
                  <span className="text-xs text-zinc-400">giờ sản xuất (Producing)</span>
                </div>
                <div className="text-xs text-zinc-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Tổng XA chuẩn (Total XA):</span>
                    <span className="font-semibold text-emerald-500">{reportData.stats.totalXa.toFixed(2)} giờ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Giám sát ca (Supervisor):</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{reportData.summary.supervisor}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OEE Core KPIs */}
            <Card className="shadow-sm border-primary/20 bg-zinc-50/50 dark:bg-zinc-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold text-primary uppercase flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5" /> Hiệu suất Bộ phận
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Hiệu suất (Efficiency):</span>
                    <span className="font-bold">{(reportData.stats.efficiency * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={reportData.stats.efficiency * 100}
                      className="h-1.5 flex-1"
                      indicatorClassName={getProgressColor(reportData.stats.efficiency, 0.78)}
                    />
                    {getOeeBadge(reportData.stats.efficiency, 0.78)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Sử dụng (Utilization):</span>
                    <span className="font-bold">{(reportData.stats.utilization * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={reportData.stats.utilization * 100}
                      className="h-1.5 flex-1"
                      indicatorClassName={getProgressColor(reportData.stats.utilization, 0.9)}
                    />
                    {getOeeBadge(reportData.stats.utilization, 0.9)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Năng suất (Productivity):</span>
                    <span className="font-bold">{(reportData.stats.productivity * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={reportData.stats.productivity * 100}
                      className="h-1.5 flex-1"
                      indicatorClassName={getProgressColor(reportData.stats.productivity, 0.702)}
                    />
                    {getOeeBadge(reportData.stats.productivity, 0.702)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Báo cáo tổng hợp chi tiết theo Line</CardTitle>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Dữ liệu được tích hợp từ các báo cáo Assembly của Line Leaders và sản lượng đóng gói thực tế.
                </p>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table className="min-w-[1600px] border-collapse text-xs">
                <TableHeader className="bg-zinc-50/50 dark:bg-zinc-950/50">
                  <TableRow>
                    <TableHead className="w-12 text-center border-r font-semibold">Line</TableHead>
                    <TableHead className="w-24 border-r font-semibold">Leader</TableHead>
                    <TableHead className="w-24 border-r font-semibold">MO#</TableHead>
                    <TableHead className="w-40 border-r font-semibold">Item</TableHead>
                    <TableHead className="w-20 text-right border-r font-semibold">SL MO</TableHead>
                    <TableHead className="w-16 text-right border-r font-semibold">UPH</TableHead>
                    <TableHead className="w-20 text-right border-r font-semibold bg-blue-50/30 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400">KH Ngày</TableHead>
                    <TableHead className="w-20 text-right border-r font-semibold bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400">SL Lắp Ráp</TableHead>
                    <TableHead className="w-20 text-right border-r font-semibold bg-cyan-50/30 dark:bg-cyan-950/10 text-cyan-700 dark:text-cyan-400">Goods Receipt</TableHead>
                    <TableHead className="w-20 text-right border-r font-semibold bg-amber-50/30 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400">Chờ Nhập</TableHead>
                    <TableHead className="w-24 border-r font-semibold">XA/pc</TableHead>
                    <TableHead className="w-24 text-right border-r font-semibold font-mono text-emerald-600 dark:text-emerald-400">Total XA</TableHead>
                    <TableHead className="text-center font-semibold bg-rose-50/20 dark:bg-rose-950/5" colSpan={9}>
                      Thời Gian Hao Hụt (Loss Time - Giờ)
                    </TableHead>
                    <TableHead className="w-32 font-semibold">Note</TableHead>
                  </TableRow>
                  <TableRow className="bg-zinc-100/50 dark:bg-zinc-900/50">
                    <TableHead colSpan={12} className="border-r"></TableHead>
                    {/* Loss columns breakdown */}
                    <TableHead className="text-center border-r">Training</TableHead>
                    <TableHead className="text-center border-r">Stoppage</TableHead>
                    <TableHead className="text-center border-r">C.O</TableHead>
                    <TableHead className="text-center border-r">Materials</TableHead>
                    <TableHead className="text-center border-r">Quality</TableHead>
                    <TableHead className="text-center border-r">SOP</TableHead>
                    <TableHead className="text-center border-r">FAI</TableHead>
                    <TableHead className="text-center border-r">FQC</TableHead>
                    <TableHead className="text-center border-r">Other</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.rows.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <TableCell className="text-center font-semibold border-r">{row.lineName}</TableCell>
                      <TableCell className="border-r">{row.leader}</TableCell>
                      <TableCell className="font-mono border-r">{row.mo}</TableCell>
                      <TableCell className="border-r font-medium max-w-[200px] truncate" title={row.itemDescription}>
                        {row.itemDescription}
                      </TableCell>
                      <TableCell className="text-right border-r font-mono">{row.qtyMo.toLocaleString()}</TableCell>
                      <TableCell className="text-right border-r font-mono">{row.uph}</TableCell>
                      <TableCell className="text-right border-r font-mono bg-blue-50/10 dark:bg-blue-950/5 text-blue-600 dark:text-blue-300 font-semibold">{row.dailyPlanQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right border-r font-mono bg-emerald-50/10 dark:bg-emerald-950/5 text-emerald-600 dark:text-emerald-300 font-semibold">{row.actualQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right border-r font-mono bg-cyan-50/10 dark:bg-cyan-950/5 text-cyan-600 dark:text-cyan-300 font-semibold">{row.goodsReceiptQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right border-r font-mono bg-amber-50/10 dark:bg-amber-950/5 text-amber-600 dark:text-amber-300 font-semibold">
                        {row.pending > 0 ? row.pending.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell className="border-r font-mono">{row.xaTime.toFixed(5)}</TableCell>
                      <TableCell className="text-right border-r font-mono font-semibold text-emerald-600 dark:text-emerald-400">{row.totalXa.toFixed(2)}</TableCell>
                      
                      {/* Loss Times */}
                      <TableCell className="text-center border-r font-mono">{row.trainingTime > 0 ? row.trainingTime : ""}</TableCell>
                      <TableCell className="text-center border-r font-mono text-rose-500">{row.stoppageTime > 0 ? row.stoppageTime : ""}</TableCell>
                      <TableCell className="text-center border-r font-mono">{row.coTime > 0 ? row.coTime : ""}</TableCell>
                      <TableCell className="text-center border-r font-mono text-rose-500">{row.materialsTime > 0 ? row.materialsTime : ""}</TableCell>
                      <TableCell className="text-center border-r font-mono text-rose-500">{row.qualityTime > 0 ? row.qualityTime : ""}</TableCell>
                      <TableCell className="text-center border-r font-mono">{row.sopTime > 0 ? row.sopTime : ""}</TableCell>
                      <TableCell className="text-center border-r font-mono">{row.faiTime > 0 ? row.faiTime : ""}</TableCell>
                      <TableCell className="text-center border-r font-mono">{row.fqcTime > 0 ? row.fqcTime : ""}</TableCell>
                      <TableCell className="text-center border-r font-mono">{row.otherLossTime > 0 ? row.otherLossTime : ""}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-zinc-500" title={row.note || ""}>{row.note || "-"}</TableCell>
                    </TableRow>
                  ))}

                  {/* Summary/Totals row */}
                  {totals && (
                    <TableRow className="bg-zinc-100 dark:bg-zinc-900 font-bold border-t-2 border-zinc-200 dark:border-zinc-700">
                      <TableCell className="text-center border-r">Total</TableCell>
                      <TableCell className="border-r"></TableCell>
                      <TableCell className="border-r"></TableCell>
                      <TableCell className="border-r"></TableCell>
                      <TableCell className="text-right border-r"></TableCell>
                      <TableCell className="text-right border-r"></TableCell>
                      <TableCell className="text-right border-r font-mono bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">{totals.dailyPlanQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right border-r font-mono bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">{totals.actualQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right border-r font-mono bg-cyan-100/50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400">{totals.goodsReceiptQty.toLocaleString()}</TableCell>
                      <TableCell className="text-right border-r font-mono bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">{totals.pending.toLocaleString()}</TableCell>
                      <TableCell className="border-r"></TableCell>
                      <TableCell className="text-right border-r font-mono text-emerald-700 dark:text-emerald-400">{totals.totalXa.toFixed(2)}</TableCell>
                      
                      {/* Loss totals */}
                      <TableCell className="text-center border-r font-mono">{totals.trainingTime > 0 ? totals.trainingTime : "-"}</TableCell>
                      <TableCell className="text-center border-r font-mono text-rose-500">{totals.stoppageTime > 0 ? totals.stoppageTime : "-"}</TableCell>
                      <TableCell className="text-center border-r font-mono">{totals.coTime > 0 ? totals.coTime : "-"}</TableCell>
                      <TableCell className="text-center border-r font-mono text-rose-500">{totals.materialsTime > 0 ? totals.materialsTime : "-"}</TableCell>
                      <TableCell className="text-center border-r font-mono text-rose-500">{totals.qualityTime > 0 ? totals.qualityTime : "-"}</TableCell>
                      <TableCell className="text-center border-r font-mono">{totals.sopTime > 0 ? totals.sopTime : "-"}</TableCell>
                      <TableCell className="text-center border-r font-mono">{totals.faiTime > 0 ? totals.faiTime : "-"}</TableCell>
                      <TableCell className="text-center border-r font-mono">{totals.fqcTime > 0 ? totals.fqcTime : "-"}</TableCell>
                      <TableCell className="text-center border-r font-mono">{totals.otherLossTime > 0 ? totals.otherLossTime : "-"}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* Edit Supervisor Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Thiết lập giám sát ca - Ngày {date}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSummary} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editSupervisor" className="text-xs font-semibold">
                Supervisor (Giám sát ca) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  id="editSupervisor"
                  placeholder="Nhập tên người giám sát..."
                  value={editSupervisor}
                  onChange={(e) => setEditSupervisor(e.target.value)}
                  className="pl-9 h-10 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editTotalHeadcount" className="text-xs font-semibold">
                  Tổng số người (Headcount)
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input
                    id="editTotalHeadcount"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editTotalHeadcount}
                    onChange={(e) => setEditTotalHeadcount(e.target.value)}
                    className="pl-9 h-10 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editAbsentees" className="text-xs font-semibold">
                  Số người nghỉ (Absentees)
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input
                    id="editAbsentees"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editAbsentees}
                    onChange={(e) => setEditAbsentees(e.target.value)}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editOvertime" className="text-xs font-semibold">
                  Giờ tăng ca (Overtime)
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <Input
                    id="editOvertime"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={editOvertime}
                    onChange={(e) => setEditOvertime(e.target.value)}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saveLoading}
                className="h-10 text-sm"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saveLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5 h-10 px-5 text-sm"
              >
                {saveLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Lưu cài đặt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
