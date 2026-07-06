"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  ClipboardList,
  Filter,
  X,
  Factory
} from "lucide-react";
import type { Item, Line } from "@/lib/db/schema";
import {
  getAssemblyRecordsAction,
  getPackingRecordsAction,
  deleteAssemblyRecordAction,
  deletePackingRecordAction,
  type AssemblyRecord,
  type PackingRecord
} from "./actions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RecordsClientProps {
  lines: Line[];
  items: Item[];
  canDelete: boolean;
}

export function RecordsClient({ lines, items, canDelete }: RecordsClientProps) {
  // Tabs State
  const [activeTab, setActiveTab] = useState<"assembly" | "packing">("assembly");

  // Assembly Records state
  const [assemblyRecords, setAssemblyRecords] = useState<AssemblyRecord[]>([]);
  const [assemblyLoading, setAssemblyLoading] = useState(true);
  const [assemblyPage, setAssemblyPage] = useState(1);
  const [assemblyTotalPages, setAssemblyTotalPages] = useState(1);
  const [assemblyTotalItems, setAssemblyTotalItems] = useState(0);

  // Assembly Filters state
  const [assemblyLineId, setAssemblyLineId] = useState("");
  const [assemblyItemId, setAssemblyItemId] = useState("");
  const [assemblyMo, setAssemblyMo] = useState("");
  const [assemblyStartDate, setAssemblyStartDate] = useState("");
  const [assemblyEndDate, setAssemblyEndDate] = useState("");

  // Packing Records state
  const [packingRecords, setPackingRecords] = useState<PackingRecord[]>([]);
  const [packingLoading, setPackingLoading] = useState(true);
  const [packingPage, setPackingPage] = useState(1);
  const [packingTotalPages, setPackingTotalPages] = useState(1);
  const [packingTotalItems, setPackingTotalItems] = useState(0);

  // Packing Filters state
  const [packingItemId, setPackingItemId] = useState("");
  const [packingMo, setPackingMo] = useState("");
  const [packingStartDate, setPackingStartDate] = useState("");
  const [packingEndDate, setPackingEndDate] = useState("");

  // Fetch Assembly Records
  const fetchAssemblyRecords = useCallback(async () => {
    try {
      setAssemblyLoading(true);
      const res = await getAssemblyRecordsAction({
        lineId: assemblyLineId || undefined,
        itemId: assemblyItemId || undefined,
        mo: assemblyMo || undefined,
        startDate: assemblyStartDate || undefined,
        endDate: assemblyEndDate || undefined,
        page: assemblyPage,
        limit: 10
      });

      if (res.success && res.data) {
        setAssemblyRecords(res.data.records);
        setAssemblyTotalPages(res.data.totalPages);
        setAssemblyTotalItems(res.data.totalItems);
      } else {
        toast.error(res.error || "Không thể tải báo cáo Assembly.");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải báo cáo Assembly.");
    } finally {
      setAssemblyLoading(false);
    }
  }, [assemblyLineId, assemblyItemId, assemblyMo, assemblyStartDate, assemblyEndDate, assemblyPage]);

  // Fetch Packing Records
  const fetchPackingRecords = useCallback(async () => {
    try {
      setPackingLoading(true);
      const res = await getPackingRecordsAction({
        itemId: packingItemId || undefined,
        mo: packingMo || undefined,
        startDate: packingStartDate || undefined,
        endDate: packingEndDate || undefined,
        page: packingPage,
        limit: 10
      });

      if (res.success && res.data) {
        setPackingRecords(res.data.records);
        setPackingTotalPages(res.data.totalPages);
        setPackingTotalItems(res.data.totalItems);
      } else {
        toast.error(res.error || "Không thể tải báo cáo Packing.");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải báo cáo Packing.");
    } finally {
      setPackingLoading(false);
    }
  }, [packingItemId, packingMo, packingStartDate, packingEndDate, packingPage]);

  // Trigger fetches when filters or page change
  useEffect(() => {
    if (activeTab === "assembly") {
      fetchAssemblyRecords();
    }
  }, [fetchAssemblyRecords, activeTab]);

  useEffect(() => {
    if (activeTab === "packing") {
      fetchPackingRecords();
    }
  }, [fetchPackingRecords, activeTab]);

  // Reset Assembly Filters
  const handleResetAssemblyFilters = () => {
    setAssemblyLineId("");
    setAssemblyItemId("");
    setAssemblyMo("");
    setAssemblyStartDate("");
    setAssemblyEndDate("");
    setAssemblyPage(1);
  };

  // Reset Packing Filters
  const handleResetPackingFilters = () => {
    setPackingItemId("");
    setPackingMo("");
    setPackingStartDate("");
    setPackingEndDate("");
    setPackingPage(1);
  };

  // Delete Assembly Record
  const handleDeleteAssembly = async (id: number) => {
    if (!canDelete) return;
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi lắp ráp này?")) return;

    try {
      const res = await deleteAssemblyRecordAction(id);
      if (res.success) {
        toast.success("Xóa thành công!");
        fetchAssemblyRecords();
      } else {
        toast.error(res.error || "Không thể xóa.");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa bản ghi.");
    }
  };

  // Delete Packing Record
  const handleDeletePacking = async (id: number) => {
    if (!canDelete) return;
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi đóng gói này?")) return;

    try {
      const res = await deletePackingRecordAction(id);
      if (res.success) {
        toast.success("Xóa thành công!");
        fetchPackingRecords();
      } else {
        toast.error(res.error || "Không thể xóa.");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa bản ghi.");
    }
  };

  // Format Helper
  const formatDate = (dateInput: Date | string) => {
    return new Date(dateInput).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Lịch sử Báo cáo sản xuất
          </h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Xem lại các bản ghi báo cáo lắp ráp và đóng gói hàng ngày
          </p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs
        defaultValue="assembly"
        onValueChange={(val) => {
          setActiveTab(val as "assembly" | "packing");
        }}
        className="w-full space-y-4"
      >
        <TabsList className="bg-zinc-100/80 dark:bg-zinc-900/60 p-1">
          <TabsTrigger value="assembly" className="px-4 py-1.5 flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Lịch sử Assembly (Lắp ráp)
          </TabsTrigger>
          <TabsTrigger value="packing" className="px-4 py-1.5 flex items-center gap-1.5">
            <Factory className="h-4 w-4" />
            Lịch sử Packing (Đóng gói)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Assembly History */}
        <TabsContent value="assembly" className="space-y-4 outline-none">
          {/* Filters Bar Card */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Bộ lọc tìm kiếm
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAssemblyFilters}
                className="h-7 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Xóa bộ lọc
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Từ ngày */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Từ ngày</label>
                <Input
                  type="date"
                  value={assemblyStartDate}
                  onChange={(e) => {
                    setAssemblyStartDate(e.target.value);
                    setAssemblyPage(1);
                  }}
                  className="h-9 text-xs"
                />
              </div>

              {/* Đến ngày */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Đến ngày</label>
                <Input
                  type="date"
                  value={assemblyEndDate}
                  onChange={(e) => {
                    setAssemblyEndDate(e.target.value);
                    setAssemblyPage(1);
                  }}
                  className="h-9 text-xs"
                />
              </div>

              {/* Line */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Line</label>
                <select
                  value={assemblyLineId}
                  onChange={(e) => {
                    setAssemblyLineId(e.target.value);
                    setAssemblyPage(1);
                  }}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="">Tất cả Line</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lineName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Sản phẩm (Item)</label>
                <select
                  value={assemblyItemId}
                  onChange={(e) => {
                    setAssemblyItemId(e.target.value);
                    setAssemblyPage(1);
                  }}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="">Tất cả sản phẩm</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemDescription}
                    </option>
                  ))}
                </select>
              </div>

              {/* MO */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Mã MO</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Tìm mã MO..."
                    value={assemblyMo}
                    onChange={(e) => {
                      setAssemblyMo(e.target.value);
                      setAssemblyPage(1);
                    }}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-900/20 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-28">Ngày</th>
                    <th className="py-3.5 px-4 w-20">Line</th>
                    <th className="py-3.5 px-4 w-28">Mã MO</th>
                    <th className="py-3.5 px-4">Sản phẩm (Item)</th>
                    <th className="py-3.5 px-4 w-20 text-right">SL/MO</th>
                    <th className="py-3.5 px-4 w-24 text-right">SL thực tế</th>
                    <th className="py-3.5 px-4 w-28 text-center">Thời gian</th>
                    <th className="py-3.5 px-4 w-20 text-right">Nhân sự</th>
                    <th className="py-3.5 px-4 w-24">Leader</th>
                    <th className="py-3.5 px-4 w-32">Note</th>
                    {canDelete && <th className="py-3.5 px-4 w-12 text-center">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40 text-sm">
                  {assemblyLoading ? (
                    <tr>
                      <td colSpan={canDelete ? 11 : 10} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-zinc-400">
                          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                          <span>Đang tải dữ liệu...</span>
                        </div>
                      </td>
                    </tr>
                  ) : assemblyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 11 : 10} className="py-12 text-center text-zinc-400">
                        Không tìm thấy báo cáo nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    assemblyRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                        <td className="py-3.5 px-4 font-medium">{formatDate(rec.date)}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                            {rec.lineName || "N/A"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-700 dark:text-zinc-300">{rec.mo}</td>
                        <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">{rec.itemDescription || "N/A"}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{rec.qtyMo.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-50">{rec.actualQty.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-500 text-xs">
                          {rec.startTime} - {rec.endTime}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">{rec.headCount} người</td>
                        <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">{rec.leader}</td>
                        <td className="py-3.5 px-4 text-zinc-400 truncate max-w-[120px]" title={rec.note || undefined}>{rec.note || "-"}</td>
                        {canDelete && (
                          <td className="py-3.5 px-4 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteAssembly(rec.id)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {assemblyTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 p-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Tổng số {assemblyTotalItems} dòng • Trang {assemblyPage}/{assemblyTotalPages}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={assemblyPage === 1}
                    onClick={() => setAssemblyPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={assemblyPage === assemblyTotalPages}
                    onClick={() => setAssemblyPage((p) => Math.min(assemblyTotalPages, p + 1))}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Packing History */}
        <TabsContent value="packing" className="space-y-4 outline-none">
          {/* Filters Bar Card */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Bộ lọc tìm kiếm (Packing)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetPackingFilters}
                className="h-7 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Xóa bộ lọc
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Từ ngày */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Từ ngày</label>
                <Input
                  type="date"
                  value={packingStartDate}
                  onChange={(e) => {
                    setPackingStartDate(e.target.value);
                    setPackingPage(1);
                  }}
                  className="h-9 text-xs"
                />
              </div>

              {/* Đến ngày */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Đến ngày</label>
                <Input
                  type="date"
                  value={packingEndDate}
                  onChange={(e) => {
                    setPackingEndDate(e.target.value);
                    setPackingPage(1);
                  }}
                  className="h-9 text-xs"
                />
              </div>

              {/* Item */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Sản phẩm (Item)</label>
                <select
                  value={packingItemId}
                  onChange={(e) => {
                    setPackingItemId(e.target.value);
                    setPackingPage(1);
                  }}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="">Tất cả sản phẩm</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemDescription}
                    </option>
                  ))}
                </select>
              </div>

              {/* MO */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-400">Mã MO</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Tìm mã MO..."
                    value={packingMo}
                    onChange={(e) => {
                      setPackingMo(e.target.value);
                      setPackingPage(1);
                    }}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-900/20 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-28">Ngày</th>
                    <th className="py-3.5 px-4 w-32">Mã MO</th>
                    <th className="py-3.5 px-4">Sản phẩm (Item)</th>
                    <th className="py-3.5 px-4 w-24 text-right">SL/MO</th>
                    <th className="py-3.5 px-4 w-28 text-right">SL nhập kho</th>
                    <th className="py-3.5 px-4 w-28">Leader</th>
                    <th className="py-3.5 px-4 w-40">Note</th>
                    {canDelete && <th className="py-3.5 px-4 w-12 text-center">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40 text-sm">
                  {packingLoading ? (
                    <tr>
                      <td colSpan={canDelete ? 8 : 7} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-zinc-400">
                          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                          <span>Đang tải dữ liệu...</span>
                        </div>
                      </td>
                    </tr>
                  ) : packingRecords.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 8 : 7} className="py-12 text-center text-zinc-400">
                        Không tìm thấy báo cáo Packing nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    packingRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                        <td className="py-3.5 px-4 font-medium">{formatDate(rec.date)}</td>
                        <td className="py-3.5 px-4 font-mono text-zinc-700 dark:text-zinc-300">{rec.mo}</td>
                        <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">{rec.itemDescription || "N/A"}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{rec.qtyMo.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-50">{rec.packedQty.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">{rec.leader}</td>
                        <td className="py-3.5 px-4 text-zinc-400 truncate max-w-[150px]" title={rec.note || undefined}>{rec.note || "-"}</td>
                        {canDelete && (
                          <td className="py-3.5 px-4 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeletePacking(rec.id)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {packingTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 p-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Tổng số {packingTotalItems} dòng • Trang {packingPage}/{packingTotalPages}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={packingPage === 1}
                    onClick={() => setPackingPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={packingPage === packingTotalPages}
                    onClick={() => setPackingPage((p) => Math.min(packingTotalPages, p + 1))}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
