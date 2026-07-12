"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  Calendar as CalendarIcon,
  Clock,
  Users,
  FileText,
  User,
  Loader2,
  CheckCircle2,
  Undo2
} from "lucide-react";
import type { Item, Line } from "@/lib/db/schema";
import { saveAssemblyReportAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/ui/autocomplete";

interface AssemblyClientProps {
  lines: Line[];
  items: Item[];
  username: string;
}

export function AssemblyClient({ lines, items, username }: AssemblyClientProps) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [lineId, setLineId] = useState("");
  const [mo, setMo] = useState("");
  const [itemId, setItemId] = useState("");
  const [qtyMo, setQtyMo] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [dailyPlanQty, setDailyPlanQty] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [headCount, setHeadCount] = useState("");
  const [note, setNote] = useState("");

  // Loss Time fields
  const [trainingTime, setTrainingTime] = useState("");
  const [stoppageTime, setStoppageTime] = useState("");
  const [coTime, setCoTime] = useState("");
  const [materialsTime, setMaterialsTime] = useState("");
  const [qualityTime, setQualityTime] = useState("");
  const [sopTime, setSopTime] = useState("");
  const [faiTime, setFaiTime] = useState("");
  const [fqcTime, setFqcTime] = useState("");
  const [otherLossTime, setOtherLossTime] = useState("");

  const handleMoChange = (val: string) => {
    let cleaned = val.toUpperCase();
    if (cleaned.startsWith("M0")) {
      cleaned = cleaned.substring(2);
    }
    setMo(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!date) return toast.error("Vui lòng chọn ngày báo cáo.");
    if (!lineId) return toast.error("Vui lòng chọn Line sản xuất.");
    if (!mo.trim()) return toast.error("Vui lòng nhập mã MO.");
    if (!itemId) return toast.error("Vui lòng chọn Item.");
    
    const parsedQtyMo = parseInt(qtyMo, 10);
    const parsedActualQty = parseInt(actualQty, 10);
    const parsedDailyPlanQty = parseInt(dailyPlanQty, 10) || 0;
    const parsedHeadCount = parseInt(headCount, 10);

    if (isNaN(parsedQtyMo) || parsedQtyMo <= 0) {
      return toast.error("Số lượng MO phải là số nguyên lớn hơn 0.");
    }
    if (isNaN(parsedActualQty) || parsedActualQty < 0) {
      return toast.error("Số lượng thực tế không được phép âm.");
    }
    if (parsedDailyPlanQty < 0) {
      return toast.error("Sản lượng kế hoạch ngày không được phép âm.");
    }
    if (!startTime) return toast.error("Vui lòng nhập Giờ bắt đầu.");
    if (!endTime) return toast.error("Vui lòng nhập Giờ kết thúc.");
    if (startTime >= endTime) {
      return toast.error("Giờ kết thúc phải sau Giờ bắt đầu.");
    }
    if (isNaN(parsedHeadCount) || parsedHeadCount <= 0) {
      return toast.error("Số người phải là số nguyên lớn hơn 0.");
    }

    const parsedTraining = parseFloat(trainingTime) || 0;
    const parsedStoppage = parseFloat(stoppageTime) || 0;
    const parsedCo = parseFloat(coTime) || 0;
    const parsedMaterials = parseFloat(materialsTime) || 0;
    const parsedQuality = parseFloat(qualityTime) || 0;
    const parsedSop = parseFloat(sopTime) || 0;
    const parsedFai = parseFloat(faiTime) || 0;
    const parsedFqc = parseFloat(fqcTime) || 0;
    const parsedOther = parseFloat(otherLossTime) || 0;

    if (
      parsedTraining < 0 ||
      parsedStoppage < 0 ||
      parsedCo < 0 ||
      parsedMaterials < 0 ||
      parsedQuality < 0 ||
      parsedSop < 0 ||
      parsedFai < 0 ||
      parsedFqc < 0 ||
      parsedOther < 0
    ) {
      return toast.error("Thời gian hao hụt không được phép âm.");
    }

    try {
      setLoading(true);
      const res = await saveAssemblyReportAction({
        date: new Date(date).toISOString(),
        lineId: parseInt(lineId, 10),
        mo: "M0" + mo.trim(),
        itemId: parseInt(itemId, 10),
        qtyMo: parsedQtyMo,
        actualQty: parsedActualQty,
        dailyPlanQty: parsedDailyPlanQty,
        startTime,
        endTime,
        headCount: parsedHeadCount,
        note: note.trim() || undefined,
        trainingTime: parsedTraining,
        stoppageTime: parsedStoppage,
        coTime: parsedCo,
        materialsTime: parsedMaterials,
        qualityTime: parsedQuality,
        sopTime: parsedSop,
        faiTime: parsedFai,
        fqcTime: parsedFqc,
        otherLossTime: parsedOther,
      });

      if (res.success) {
        toast.success(res.message || "Đã lưu báo cáo thành công!");
        // Reset form except Date, Line and Leader
        setMo("");
        setItemId("");
        setQtyMo("");
        setActualQty("");
        setDailyPlanQty("");
        setStartTime("");
        setEndTime("");
        setHeadCount("");
        setNote("");
        setTrainingTime("");
        setStoppageTime("");
        setCoTime("");
        setMaterialsTime("");
        setQualityTime("");
        setSopTime("");
        setFaiTime("");
        setFqcTime("");
        setOtherLossTime("");
      } else {
        toast.error(res.error || "Có lỗi xảy ra.");
      }
    } catch {
      toast.error("Lỗi kết nối hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm("Bạn có muốn xoá trắng các ô nhập liệu?")) {
      setMo("");
      setItemId("");
      setQtyMo("");
      setActualQty("");
      setDailyPlanQty("");
      setStartTime("");
      setEndTime("");
      setHeadCount("");
      setNote("");
      setTrainingTime("");
      setStoppageTime("");
      setCoTime("");
      setMaterialsTime("");
      setQualityTime("");
      setSopTime("");
      setFaiTime("");
      setFqcTime("");
      setOtherLossTime("");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Báo cáo sản xuất Assembly
          </h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Nhập kết quả sản xuất lắp ráp hàng ngày
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Thông tin chung */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              1. Thông tin chung
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Ngày */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Ngày báo cáo <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>

              {/* Line */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Line sản xuất <span className="text-red-500">*</span>
                </label>
                <select
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="">-- Chọn Line --</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.lineName}
                    </option>
                  ))}
                </select>
              </div>

              {/* MO */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Mã MO <span className="text-red-500">*</span>
                </label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-sm font-semibold select-none">
                    M0
                  </span>
                  <Input
                    placeholder="Nhập mã MO..."
                    value={mo}
                    onChange={(e) => handleMoChange(e.target.value)}
                    className="h-10 text-sm rounded-l-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Chi tiết sản phẩm */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              2. Chi tiết sản phẩm & Sản lượng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Item */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Sản phẩm (Item) <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  options={items.map((i) => ({ id: i.id, label: i.itemDescription }))}
                  value={itemId}
                  onChange={(id) => setItemId(id ? String(id) : "")}
                  placeholder="Tìm mã sản phẩm (Item)..."
                />
              </div>

              {/* SL/M0 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Số lượng MO (SL/M0) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={qtyMo}
                  onChange={(e) => setQtyMo(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>

              {/* KH Ngày */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Kế hoạch ngày <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={dailyPlanQty}
                  onChange={(e) => setDailyPlanQty(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>

              {/* SL thực tế */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Số lượng thực tế <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Thời gian & Nhân sự */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              3. Thời gian & Nhân sự
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Giờ bắt đầu */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Giờ bắt đầu <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>

              {/* Giờ kết thúc */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Giờ kết thúc <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>

              {/* Số người */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Số người <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={headCount}
                  onChange={(e) => setHeadCount(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 4: Ghi chú & Người nhập */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              4. Xác nhận & Ghi chú
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Leader */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Người báo cáo (Leader)
                </label>
                <Input
                  value={username}
                  disabled
                  className="h-10 text-sm bg-zinc-50 dark:bg-zinc-900 cursor-not-allowed"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Ghi chú (Note)
                </label>
                <Textarea
                  placeholder="Nhập ghi chú hoặc vấn đề xảy ra trong ca..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-10 h-10 resize-y text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Hao hụt thời gian (Loss Time - Giờ) */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              5. Hao hụt thời gian (Loss Time - Giờ)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Training Time
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={trainingTime}
                  onChange={(e) => setTrainingTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Line Stoppage Hours
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={stoppageTime}
                  onChange={(e) => setStoppageTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  C.O Time
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={coTime}
                  onChange={(e) => setCoTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Materials fulfillment
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={materialsTime}
                  onChange={(e) => setMaterialsTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Quality issue
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={qualityTime}
                  onChange={(e) => setQualityTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  SOP Time
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={sopTime}
                  onChange={(e) => setSopTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  FAI Time
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={faiTime}
                  onChange={(e) => setFaiTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  FQC Time
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={fqcTime}
                  onChange={(e) => setFqcTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Other loss time
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  value={otherLossTime}
                  onChange={(e) => setOtherLossTime(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800/60">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading}
              className="flex items-center gap-1.5 h-10"
            >
              <Undo2 className="h-4 w-4" />
              Làm mới
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5 h-10 px-5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Lưu báo cáo
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
