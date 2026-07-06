"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  FileUp,
  FileDown,
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Database,
  Check,
} from "lucide-react";
import {
  getItemsAction,
  saveItemAction,
  deleteItemAction,
  importExcelAction,
  exportExcelAction,
} from "./actions";
import type { Item } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ItemSettingClientProps {
  isReadOnly: boolean;
}

export function ItemSettingClient({ isReadOnly }: ItemSettingClientProps) {
  // State variables
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Excel Actions states
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Inline Edit states
  const [editingCell, setEditingCell] = useState<{
    id: number | "new";
    field: "itemDescription" | "uph" | "xaTime";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  
  // Temp new row state
  const [showNewRow, setShowNewRow] = useState(false);
  const [newRowData, setNewRowData] = useState({
    itemDescription: "",
    uph: "",
    xaTime: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getItemsAction(search, page, 15);
      if (res.success && res.data) {
        setItems(res.data.items);
        setTotalPages(res.data.totalPages);
        setTotalItems(res.data.totalItems);
      } else {
        toast.error(res.error || "Không thể tải dữ liệu.");
      }
    } catch {
      toast.error("Lỗi hệ thống khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchItems();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, fetchItems]);

  // Fetch items when page changes
  useEffect(() => {
    fetchItems();
  }, [page, fetchItems]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Trigger Excel file upload
  const handleImportClick = () => {
    if (isReadOnly) return;
    fileInputRef.current?.click();
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    toast.success(`Đã chọn file: ${file.name}. Nhấp "Start Upload" để nạp dữ liệu.`);
  };

  // Handle start upload
  const handleStartUpload = async () => {
    if (!selectedFile || isReadOnly) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await importExcelAction(formData);
      if (res.success) {
        toast.success(res.message || "Import dữ liệu thành công!");
        setSelectedFile(null);
        setPage(1);
        fetchItems();
      } else {
        toast.error(res.error || "Import thất bại.");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error("Lỗi khi tải file: " + errMsg);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Export to Excel
  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await exportExcelAction();
      if (res.success && res.data) {
        const base64 = res.data;
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `item_settings_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Xuất file Excel thành công!");
      } else {
        toast.error(res.error || "Không thể xuất file Excel.");
      }
    } catch {
      toast.error("Lỗi hệ thống khi xuất Excel.");
    } finally {
      setExporting(false);
    }
  };

  // Start cell editing
  const startEditing = (id: number, field: "itemDescription" | "uph" | "xaTime", value: string | number) => {
    if (isReadOnly) return;
    setEditingCell({ id, field });
    setEditValue(value.toString());
  };

  // Save inline cell changes
  const saveCell = async (id: number, field: "itemDescription" | "uph" | "xaTime") => {
    if (isReadOnly) return;
    setEditingCell(null);

    const originalItem = items.find((item) => item.id === id);
    if (!originalItem) return;

    // Check if value actually changed
    const currentStr = originalItem[field].toString();
    if (currentStr === editValue.trim()) return;

    let updatedVal: string | number = editValue.trim();
    if (field === "uph") {
      const parsed = parseInt(updatedVal, 10);
      if (isNaN(parsed) || parsed < 0) {
        toast.error("UPH phải là số nguyên không âm.");
        return;
      }
      updatedVal = parsed;
    } else if (field === "xaTime") {
      const parsed = parseFloat(updatedVal);
      if (isNaN(parsed) || parsed < 0) {
        toast.error("Thời gian XA phải là số thập phân không âm.");
        return;
      }
      updatedVal = parsed;
    }

    if (field === "itemDescription" && !updatedVal) {
      toast.error("Item description không được để trống.");
      return;
    }

    // Optimistically update UI
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: updatedVal } : item))
    );

    try {
      const payload = {
        id,
        itemDescription: field === "itemDescription" ? (updatedVal as string) : originalItem.itemDescription,
        uph: field === "uph" ? (updatedVal as number) : originalItem.uph,
        xaTime: field === "xaTime" ? (updatedVal as number) : originalItem.xaTime,
      };

      const res = await saveItemAction(payload);
      if (!res.success) {
        toast.error(res.error || "Không thể lưu thay đổi.");
        // Rollback
        fetchItems();
      }
    } catch {
      toast.error("Lỗi kết nối khi lưu thay đổi.");
      fetchItems();
    }
  };

  // Add new row logic
  const handleAddNewRow = async () => {
    if (isReadOnly) return;
    const { itemDescription, uph, xaTime } = newRowData;

    if (!itemDescription.trim()) {
      toast.error("Vui lòng điền Item description.");
      return;
    }

    const parsedUph = parseInt(uph || "0", 10);
    const parsedXaTime = parseFloat(xaTime || "0");

    if (isNaN(parsedUph) || parsedUph < 0) {
      toast.error("UPH phải là số nguyên dương.");
      return;
    }
    if (isNaN(parsedXaTime) || parsedXaTime < 0) {
      toast.error("Thời gian XA phải là số thập phân dương.");
      return;
    }

    try {
      const res = await saveItemAction({
        itemDescription: itemDescription.trim(),
        uph: parsedUph,
        xaTime: parsedXaTime,
      });

      if (res.success) {
        toast.success("Thêm item thành công!");
        setShowNewRow(false);
        setNewRowData({ itemDescription: "", uph: "", xaTime: "" });
        setPage(1);
        fetchItems();
      } else {
        toast.error(res.error || "Không thể thêm item.");
      }
    } catch {
      toast.error("Lỗi kết nối khi thêm item.");
    }
  };

  // Delete item logic
  const handleDelete = async (id: number) => {
    if (isReadOnly) return;
    if (!confirm("Bạn có chắc chắn muốn xóa item này không?")) return;

    try {
      const res = await deleteItemAction(id);
      if (res.success) {
        toast.success("Xóa item thành công!");
        fetchItems();
      } else {
        toast.error(res.error || "Không thể xóa item.");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa item.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Item Setting
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Thiết lập thông số cơ bản phục vụ quản lý sản xuất
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* File Input hidden */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
            disabled={isReadOnly || importing}
          />

          {!isReadOnly && (
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80">
              {!selectedFile ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleImportClick}
                  disabled={importing}
                  className="h-7 text-xs font-normal text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <FileUp className="mr-1.5 h-3.5 w-3.5 text-zinc-400" />
                  Select Excel File
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-2 py-0.5">
                  <span className="text-xs max-w-[150px] truncate text-zinc-600 dark:text-zinc-400 font-medium">
                    📄 {selectedFile.name}
                  </span>
                  <Button
                    size="sm"
                    onClick={handleStartUpload}
                    disabled={importing}
                    className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-2.5 rounded"
                  >
                    {importing ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : null}
                    {importing ? "Uploading..." : "Start Upload"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={importing}
                    className="h-7 text-xs text-zinc-400 hover:text-zinc-600 px-1.5 hover:bg-zinc-200/50"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="h-8 border-zinc-200 bg-white text-xs font-normal text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 hover:dark:bg-zinc-900"
          >
            {exporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="mr-1.5 h-3.5 w-3.5 text-zinc-400" />
            )}
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>

          {!isReadOnly && !showNewRow && (
            <Button
              size="sm"
              onClick={() => setShowNewRow(true)}
              className="h-8 bg-zinc-900 text-xs font-medium text-white shadow hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> New Row
            </Button>
          )}
        </div>
      </div>

      {/* Notion-style Data View Wrapper */}
      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
        
        {/* Search header bar */}
        <div className="flex items-center border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-900">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2.5 w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Minimalist Notion Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-xs font-normal uppercase tracking-wider text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/20">
                <th className="py-2.5 px-4 font-medium border-r border-zinc-100/50 dark:border-zinc-900">Item description</th>
                <th className="py-2.5 px-4 font-medium border-r border-zinc-100/50 dark:border-zinc-900 w-36">UPH (pcs/h)</th>
                <th className="py-2.5 px-4 font-medium border-r border-zinc-100/50 dark:border-zinc-900 w-36">Thời gian XA (h)</th>
                {!isReadOnly && <th className="py-2.5 px-4 font-medium w-16 text-center"></th>}
              </tr>
            </thead>
            <tbody>
              {/* Show loading overlay */}
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isReadOnly ? 3 : 4}
                    className="py-12 text-center text-zinc-400"
                  >
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-zinc-300" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : items.length === 0 && !showNewRow ? (
                <tr>
                  <td
                    colSpan={isReadOnly ? 3 : 4}
                    className="py-12 text-center text-zinc-400"
                  >
                    Không tìm thấy dữ liệu nào.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="group border-b border-zinc-100 hover:bg-zinc-50/40 dark:border-zinc-900 dark:hover:bg-zinc-900/10"
                  >
                    {/* Item Description Cell */}
                    <td
                      onClick={() => startEditing(item.id, "itemDescription", item.itemDescription)}
                      className="cursor-pointer border-r border-zinc-100/50 py-2.5 px-4 font-normal text-zinc-800 dark:border-zinc-900 dark:text-zinc-200"
                    >
                      {editingCell?.id === item.id && editingCell?.field === "itemDescription" ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveCell(item.id, "itemDescription")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveCell(item.id, "itemDescription");
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          className="w-full bg-transparent p-0 text-sm font-normal text-zinc-800 outline-none dark:text-zinc-200"
                        />
                      ) : (
                        item.itemDescription
                      )}
                    </td>

                    {/* UPH Cell */}
                    <td
                      onClick={() => startEditing(item.id, "uph", item.uph)}
                      className="cursor-pointer border-r border-zinc-100/50 py-2.5 px-4 text-zinc-700 dark:border-zinc-900 dark:text-zinc-300"
                    >
                      {editingCell?.id === item.id && editingCell?.field === "uph" ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveCell(item.id, "uph")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveCell(item.id, "uph");
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          type="number"
                          className="w-full bg-transparent p-0 text-sm text-zinc-700 outline-none dark:text-zinc-300"
                        />
                      ) : (
                        item.uph.toLocaleString("vi-VN")
                      )}
                    </td>

                    {/* XA Time Cell */}
                    <td
                      onClick={() => startEditing(item.id, "xaTime", item.xaTime)}
                      className="cursor-pointer border-r border-zinc-100/50 py-2.5 px-4 text-zinc-700 dark:border-zinc-900 dark:text-zinc-300"
                    >
                      {editingCell?.id === item.id && editingCell?.field === "xaTime" ? (
                        <input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveCell(item.id, "xaTime")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveCell(item.id, "xaTime");
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          type="number"
                          step="0.001"
                          className="w-full bg-transparent p-0 text-sm text-zinc-700 outline-none dark:text-zinc-300"
                        />
                      ) : (
                        `${item.xaTime} h`
                      )}
                    </td>

                    {/* Actions Cell */}
                    {!isReadOnly && (
                      <td className="py-2 px-3 text-center align-middle">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          title="Xóa item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}

              {/* In-place New Row Input */}
              {showNewRow && !isReadOnly && (
                <tr className="bg-zinc-50/20 dark:bg-zinc-900/5">
                  <td className="border-r border-zinc-100/50 py-2 px-3 dark:border-zinc-900">
                    <Input
                      placeholder="Nhập description mới..."
                      value={newRowData.itemDescription}
                      onChange={(e) =>
                        setNewRowData({ ...newRowData, itemDescription: e.target.value })
                      }
                      className="h-8 border-none bg-transparent text-sm focus-visible:ring-0 p-1"
                      autoFocus
                    />
                  </td>
                  <td className="border-r border-zinc-100/50 py-2 px-3 dark:border-zinc-900">
                    <Input
                      placeholder="UPH..."
                      type="number"
                      value={newRowData.uph}
                      onChange={(e) => setNewRowData({ ...newRowData, uph: e.target.value })}
                      className="h-8 border-none bg-transparent text-sm focus-visible:ring-0 p-1"
                    />
                  </td>
                  <td className="border-r border-zinc-100/50 py-2 px-3 dark:border-zinc-900">
                    <Input
                      placeholder="Thời gian XA (h)..."
                      type="number"
                      step="0.001"
                      value={newRowData.xaTime}
                      onChange={(e) =>
                        setNewRowData({ ...newRowData, xaTime: e.target.value })
                      }
                      className="h-8 border-none bg-transparent text-sm focus-visible:ring-0 p-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddNewRow();
                      }}
                    />
                  </td>
                  <td className="py-2 px-3 flex items-center justify-center gap-1">
                    <button
                      onClick={handleAddNewRow}
                      className="text-zinc-500 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 p-1.5 rounded transition-all"
                      title="Lưu dòng mới"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowNewRow(false);
                        setNewRowData({ itemDescription: "", uph: "", xaTime: "" });
                      }}
                      className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 p-1.5 rounded transition-all"
                      title="Hủy bỏ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Notion "+ Add a row" click link at the bottom of the table list */}
        {!isReadOnly && !showNewRow && (
          <button
            onClick={() => setShowNewRow(true)}
            className="flex w-full items-center gap-2 border-t border-zinc-100 px-4 py-3 text-left text-sm text-zinc-400 hover:bg-zinc-50/50 hover:text-zinc-600 dark:border-zinc-900 dark:hover:bg-zinc-900/10"
          >
            <Plus className="h-4 w-4" />
            Add a row
          </button>
        )}

        {/* Minimalist Notion Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5 dark:border-zinc-900 text-xs text-zinc-400">
            <div>
              Tổng cộng <b>{totalItems}</b> items
            </div>
            <div className="flex items-center gap-3">
              <span>
                Page <b>{page}</b> of <b>{totalPages}</b>
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded p-1 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded p-1 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-zinc-900"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Access info alert */}
      <div className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-900 dark:bg-zinc-900/10 text-xs text-zinc-400">
        <AlertCircle className="h-4 w-4 mt-0.5 text-zinc-400" />
        <div className="space-y-1">
          <p className="font-medium text-zinc-700 dark:text-zinc-300">
            Hướng dẫn thao tác (Notion Style)
          </p>
          <ul className="list-disc pl-3.5 space-y-0.5 text-zinc-500">
            <li>
              <b>Inline Edit:</b> Click trực tiếp vào một ô (Cell) bất kỳ trên bảng để chỉnh sửa giá trị nhanh. Nhấn <b>Enter</b> hoặc click ra ngoài ô để tự động lưu thay đổi.
            </li>
            <li>
              <b>Import Excel:</b> Chấp nhận các file mẫu Excel có các cột (Mô tả, UPH, Thời gian XA). Quá trình import sẽ tự động gộp (upsert) nếu trùng description.
            </li>
            <li>
              <b>Quyền hạn:</b> {isReadOnly ? "Tài khoản của bạn ở chế độ xem (Read-Only)." : "Bạn có toàn quyền chỉnh sửa Master Data."}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
