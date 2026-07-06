"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings,
  Check,
  X,
  Edit2
} from "lucide-react";
import {
  getLinesAction,
  saveLineAction,
  deleteLineAction
} from "./actions";
import type { Line } from "@/lib/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LineSettingClientProps {
  isReadOnly: boolean;
}

export function LineSettingClient({ isReadOnly }: LineSettingClientProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Inline Edit states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  
  // Temp new row state
  const [showNewRow, setShowNewRow] = useState(false);
  const [newLineName, setNewLineName] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchLines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getLinesAction(search, page, 10);
      if (res.success && res.data) {
        setLines(res.data.lines);
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
      fetchLines();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, fetchLines]);

  // Fetch lines when page changes
  useEffect(() => {
    fetchLines();
  }, [page, fetchLines]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (line: Line) => {
    if (isReadOnly) return;
    setEditingId(line.id);
    setEditValue(line.lineName);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveEdit = async (id: number) => {
    if (isReadOnly) return;
    if (!editValue.trim()) {
      toast.error("Tên Line không được để trống.");
      return;
    }

    try {
      const res = await saveLineAction({
        id,
        lineName: editValue.trim()
      });

      if (res.success) {
        toast.success("Cập nhật Line thành công!");
        setEditingId(null);
        fetchLines();
      } else {
        toast.error(res.error || "Không thể lưu thay đổi.");
      }
    } catch {
      toast.error("Lỗi kết nối khi lưu thay đổi.");
    }
  };

  const handleAddNewRow = async () => {
    if (isReadOnly) return;
    if (!newLineName.trim()) {
      toast.error("Vui lòng điền tên Line.");
      return;
    }

    try {
      const res = await saveLineAction({
        lineName: newLineName.trim()
      });

      if (res.success) {
        toast.success("Thêm Line mới thành công!");
        setShowNewRow(false);
        setNewLineName("");
        setPage(1);
        fetchLines();
      } else {
        toast.error(res.error || "Không thể thêm Line.");
      }
    } catch {
      toast.error("Lỗi kết nối khi thêm Line.");
    }
  };

  const handleDelete = async (id: number) => {
    if (isReadOnly) return;
    if (!confirm("Bạn có chắc chắn muốn xóa Line này không?")) return;

    try {
      const res = await deleteLineAction(id);
      if (res.success) {
        toast.success("Xóa Line thành công!");
        fetchLines();
      } else {
        toast.error(res.error || "Không thể xóa Line.");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa Line.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Line Setting
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Thiết lập danh sách Line (dây chuyền) sản xuất
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => setShowNewRow(true)}
              disabled={showNewRow}
              className="h-9 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/95 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Thêm Line
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Tìm kiếm Line..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-900/20 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-20">ID</th>
                <th className="py-3.5 px-4">Tên Line (Dây chuyền)</th>
                <th className="py-3.5 px-4 w-48">Ngày tạo</th>
                {!isReadOnly && <th className="py-3.5 px-4 w-24 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40 text-sm">
              {/* Temp New Row */}
              {showNewRow && (
                <tr className="bg-primary/5 dark:bg-primary/10">
                  <td className="py-3 px-4 font-medium text-zinc-400">new</td>
                  <td className="py-3 px-4">
                    <Input
                      placeholder="Nhập tên Line..."
                      value={newLineName}
                      onChange={(e) => setNewLineName(e.target.value)}
                      className="h-8 max-w-md"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddNewRow();
                        if (e.key === "Escape") setShowNewRow(false);
                      }}
                      autoFocus
                    />
                  </td>
                  <td className="py-3 px-4 text-zinc-400 italic">Vừa tạo xong</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleAddNewRow}
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                      >
                        <Check className="h-4.5 w-4.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setShowNewRow(false);
                          setNewLineName("");
                        }}
                        className="h-7 w-7 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        <X className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Loader */}
              {loading ? (
                <tr>
                  <td colSpan={isReadOnly ? 3 : 4} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 3 : 4} className="py-10 text-center text-zinc-400">
                    Không tìm thấy Line nào.
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const isEditing = editingId === line.id;
                  const dateStr = new Date(line.createdAt).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <tr
                      key={line.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 group transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-zinc-400">{line.id}</td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 max-w-md"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(line.id);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => handleStartEdit(line)}
                            className="font-medium text-zinc-950 dark:text-zinc-50 cursor-pointer border-b border-dashed border-transparent group-hover:border-zinc-300 dark:group-hover:border-zinc-700"
                          >
                            {line.lineName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">{dateStr}</td>
                      {!isReadOnly && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleSaveEdit(line.id)}
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                                >
                                  <Check className="h-4.5 w-4.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  className="h-7 w-7 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                >
                                  <X className="h-4.5 w-4.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleStartEdit(line)}
                                  className="h-7 w-7 text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-opacity"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDelete(line.id)}
                                  className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/20 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 p-4 bg-zinc-50/20 dark:bg-zinc-900/10">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Tổng số {totalItems} dòng • Trang {page}/{totalPages}
            </span>
            <div className="flex gap-1.5">
              <Button
                size="icon"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
