"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Package,
  Calendar as CalendarIcon,
  FileText,
  User,
  Loader2,
  CheckCircle2,
  Undo2
} from "lucide-react";
import type { Item } from "@/lib/db/schema";
import { savePackingReportAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/ui/autocomplete";

interface PackingClientProps {
  items: Item[];
  username: string;
}

export function PackingClient({ items, username }: PackingClientProps) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [mo, setMo] = useState("");
  const [itemId, setItemId] = useState("");
  const [qtyMo, setQtyMo] = useState("");
  const [packedQty, setPackedQty] = useState("");
  const [note, setNote] = useState("");

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
    if (!itemId) return toast.error("Vui lòng chọn Item.");
    if (!mo.trim()) return toast.error("Vui lòng nhập mã MO.");
    
    const parsedQtyMo = parseInt(qtyMo, 10);
    const parsedPackedQty = parseInt(packedQty, 10);

    if (isNaN(parsedQtyMo) || parsedQtyMo <= 0) {
      return toast.error("Số lượng MO phải là số nguyên lớn hơn 0.");
    }
    if (isNaN(parsedPackedQty) || parsedPackedQty < 0) {
      return toast.error("Số lượng nhập kho không được phép âm.");
    }

    try {
      setLoading(true);
      const res = await savePackingReportAction({
        date: new Date(date).toISOString(),
        itemId: parseInt(itemId, 10),
        mo: "M0" + mo.trim(),
        qtyMo: parsedQtyMo,
        packedQty: parsedPackedQty,
        note: note.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || "Đã lưu báo cáo Packing thành công!");
        // Reset form except Date and Leader
        setMo("");
        setItemId("");
        setQtyMo("");
        setPackedQty("");
        setNote("");
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
      setPackedQty("");
      setNote("");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Báo cáo đóng gói Packing
          </h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Nhập kết quả đóng gói và nhập kho hàng ngày
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
            </div>
          </div>

          {/* Section 2: Chi tiết sản phẩm & Sản lượng */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              2. Sản phẩm & Sản lượng đóng gói
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* SL nhập kho */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Số lượng nhập kho <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={packedQty}
                  onChange={(e) => setPackedQty(e.target.value)}
                  className="h-10 text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Ghi chú */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              3. Ghi chú thêm
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Ghi chú (Note)
              </label>
              <Textarea
                placeholder="Nhập ghi chú hoặc vấn đề phát sinh khi đóng gói, nhập kho..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-16 resize-y text-sm"
              />
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
