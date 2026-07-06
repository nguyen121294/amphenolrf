"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Shield,
  CheckSquare,
  Square,
  Save,
  Loader2,
  Lock,
  ShieldCheck,
  Users
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserPermissionsAction, saveUserPermissionsAction, type PermissionUpdate } from "./actions";

interface UserItem {
  id: number;
  username: string;
  role: string;
}

interface PermissionsClientProps {
  users: UserItem[];
}

export function PermissionsClient({ users }: PermissionsClientProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [targetUser, setTargetUser] = useState<{ username: string; role: string } | null>(null);
  const [permissions, setPermissions] = useState<PermissionUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load user permissions when selected user changes
  useEffect(() => {
    if (!selectedUserId) {
      setTargetUser(null);
      setPermissions([]);
      return;
    }

    async function loadPermissions() {
      setLoading(true);
      try {
        const res = await getUserPermissionsAction(Number(selectedUserId));
        if (res.success && res.data) {
          setTargetUser({ username: res.data.username, role: res.data.role });
          setPermissions(res.data.permissions);
        } else {
          toast.error(res.error || "Không thể tải phân quyền của người dùng.");
          setSelectedUserId("");
        }
      } catch {
        toast.error("Đã xảy ra lỗi kết nối mạng.");
        setSelectedUserId("");
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, [selectedUserId]);

  const handleCheckboxChange = (pagePath: string, field: keyof Omit<PermissionUpdate, "pagePath">) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.pagePath === pagePath) {
          const updatedValue = !p[field];
          // Special logic: If any action is checked, 'canView' must be checked.
          // If 'canView' is unchecked, all other actions must be unchecked.
          if (field !== "canView" && updatedValue) {
            return { ...p, [field]: updatedValue, canView: true };
          }
          if (field === "canView" && !updatedValue) {
            return {
              ...p,
              canView: false,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canImport: false,
              canExport: false,
            };
          }
          return { ...p, [field]: updatedValue };
        }
        return p;
      })
    );
  };

  const handleToggleRowAll = (pagePath: string, forceState?: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.pagePath === pagePath) {
          // If any of the flags are false, toggle all to true, otherwise toggle all to false.
          const isAllChecked = forceState !== undefined
            ? forceState
            : !(p.canView && p.canCreate && p.canEdit && p.canDelete && p.canImport && p.canExport);
          
          return {
            pagePath: p.pagePath,
            canView: isAllChecked,
            canCreate: isAllChecked,
            canEdit: isAllChecked,
            canDelete: isAllChecked,
            canImport: isAllChecked,
            canExport: isAllChecked,
          };
        }
        return p;
      })
    );
  };

  const handleToggleColumnAll = (field: keyof Omit<PermissionUpdate, "pagePath">) => {
    const isAnyUnchecked = permissions.some((p) => !p[field]);
    const newState = isAnyUnchecked;

    setPermissions((prev) =>
      prev.map((p) => {
        if (field !== "canView" && newState) {
          // If enabling an action column, view must also be enabled
          return { ...p, [field]: newState, canView: true };
        }
        if (field === "canView" && !newState) {
          // If disabling view column, all actions must be disabled
          return {
            pagePath: p.pagePath,
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canImport: false,
            canExport: false,
          };
        }
        return { ...p, [field]: newState };
      })
    );
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const res = await saveUserPermissionsAction(Number(selectedUserId), permissions);
      if (res.success) {
        toast.success(res.message || "Đã lưu phân quyền người dùng!");
      } else {
        toast.error(res.error || "Đã có lỗi xảy ra.");
      }
    } catch {
      toast.error("Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  // Human-readable page names
  const getPageName = (path: string) => {
    switch (path) {
      case "/console/production/assembly":
        return "Báo cáo Assembly";
      case "/console/production/packing":
        return "Báo cáo Packing";
      case "/console/production/records":
        return "Lịch sử báo cáo";
      case "/console/masterdata/item-setting":
        return "Thiết lập Item (Master Data)";
      case "/console/masterdata/line-setting":
        return "Thiết lập Line (Master Data)";
      default:
        return path;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          Quản lý Phân Quyền
        </h2>
        <p className="text-muted-foreground">
          Cấu hình quyền xem trang và các thao tác (Thêm, Sửa, Xóa, Nhập/Xuất Excel) cho từng tài khoản nhân viên.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* User Selection Card */}
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-500" />
              Chọn tài khoản cấu hình
            </CardTitle>
            <CardDescription>
              Chọn một tài khoản nhân viên từ danh sách dưới đây để tải cấu hình quyền.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full md:w-80 h-10 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Chọn nhân viên --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.role === "admin" ? "Admin" : "Nhân viên"})
                  </option>
                ))}
              </select>

              {targetUser && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span>Vai trò hệ thống mặc định:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase">
                    {targetUser.role === "admin" ? "Admin" : "User (Nhân viên)"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Table Card */}
        {!selectedUserId ? (
          <Card className="border-dashed border-2 border-zinc-200 dark:border-zinc-800 py-16 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Chưa chọn nhân viên</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs">
              Vui lòng lựa chọn một tài khoản ở hộp chọn phía trên để bắt đầu cấu hình phân quyền chi tiết.
            </p>
          </Card>
        ) : loading ? (
          <Card className="py-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-zinc-500 text-sm">Đang tải thông tin phân quyền...</p>
          </Card>
        ) : (
          <Card className="shadow-md border-zinc-200 dark:border-zinc-800/80 overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-zinc-100 dark:border-zinc-800/60 pb-4">
              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Ma trận quyền cho tài khoản: <span className="text-primary font-mono">{targetUser?.username}</span>
              </CardTitle>
              <CardDescription>
                Bỏ chọn Xem sẽ tự động tắt tất cả các thao tác khác của trang đó.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/30 hover:bg-zinc-50/30 dark:bg-zinc-900/5 dark:hover:bg-zinc-900/5">
                      <TableHead className="font-semibold py-4 pl-6 text-zinc-900 dark:text-zinc-100 min-w-[200px]">Trang chức năng</TableHead>
                      <TableHead className="font-semibold text-center py-4 min-w-[80px]">
                        <button
                          type="button"
                          onClick={() => handleToggleColumnAll("canView")}
                          className="hover:underline text-primary text-xs"
                        >
                          Xem
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-center py-4 min-w-[80px]">
                        <button
                          type="button"
                          onClick={() => handleToggleColumnAll("canCreate")}
                          className="hover:underline text-primary text-xs"
                        >
                          Thêm mới
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-center py-4 min-w-[80px]">
                        <button
                          type="button"
                          onClick={() => handleToggleColumnAll("canEdit")}
                          className="hover:underline text-primary text-xs"
                        >
                          Sửa
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-center py-4 min-w-[80px]">
                        <button
                          type="button"
                          onClick={() => handleToggleColumnAll("canDelete")}
                          className="hover:underline text-primary text-xs"
                        >
                          Xóa
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-center py-4 min-w-[80px]">
                        <button
                          type="button"
                          onClick={() => handleToggleColumnAll("canImport")}
                          className="hover:underline text-primary text-xs"
                        >
                          Nhập Excel
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-center py-4 min-w-[80px]">
                        <button
                          type="button"
                          onClick={() => handleToggleColumnAll("canExport")}
                          className="hover:underline text-primary text-xs"
                        >
                          Xuất Excel
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-center py-4 pr-6 min-w-[80px]">Chọn tất cả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                    {permissions.map((p) => {
                      const isAllRowChecked =
                        p.canView &&
                        p.canCreate &&
                        p.canEdit &&
                        p.canDelete &&
                        p.canImport &&
                        p.canExport;

                      return (
                        <TableRow
                          key={p.pagePath}
                          className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors"
                        >
                          <TableCell className="py-4 pl-6 font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{getPageName(p.pagePath)}</span>
                              <span className="text-xs text-zinc-400 font-mono mt-0.5">{p.pagePath}</span>
                            </div>
                          </TableCell>

                          {/* Checkbox VIEW */}
                          <TableCell className="text-center py-4">
                            <input
                              type="checkbox"
                              checked={p.canView}
                              onChange={() => handleCheckboxChange(p.pagePath, "canView")}
                              className="h-5 w-5 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer transition-all"
                            />
                          </TableCell>

                          {/* Checkbox CREATE */}
                          <TableCell className="text-center py-4">
                            <input
                              type="checkbox"
                              checked={p.canCreate}
                              onChange={() => handleCheckboxChange(p.pagePath, "canCreate")}
                              className="h-5 w-5 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </TableCell>

                          {/* Checkbox EDIT */}
                          <TableCell className="text-center py-4">
                            <input
                              type="checkbox"
                              checked={p.canEdit}
                              onChange={() => handleCheckboxChange(p.pagePath, "canEdit")}
                              className="h-5 w-5 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </TableCell>

                          {/* Checkbox DELETE */}
                          <TableCell className="text-center py-4">
                            <input
                              type="checkbox"
                              checked={p.canDelete}
                              onChange={() => handleCheckboxChange(p.pagePath, "canDelete")}
                              className="h-5 w-5 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </TableCell>

                          {/* Checkbox IMPORT */}
                          <TableCell className="text-center py-4">
                            <input
                              type="checkbox"
                              checked={p.canImport}
                              onChange={() => handleCheckboxChange(p.pagePath, "canImport")}
                              className="h-5 w-5 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </TableCell>

                          {/* Checkbox EXPORT */}
                          <TableCell className="text-center py-4">
                            <input
                              type="checkbox"
                              checked={p.canExport}
                              onChange={() => handleCheckboxChange(p.pagePath, "canExport")}
                              className="h-5 w-5 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </TableCell>

                          {/* Toggle Row All */}
                          <TableCell className="text-center py-4 pr-6">
                            <button
                              type="button"
                              onClick={() => handleToggleRowAll(p.pagePath)}
                              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-primary transition-colors"
                              title="Chọn / Bỏ chọn tất cả dòng"
                            >
                              {isAllRowChecked ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                              ) : (
                                <Square className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Submit panel */}
              <div className="bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-zinc-100 dark:border-zinc-800/60 py-4 px-6 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full md:w-auto h-11 flex items-center justify-center gap-2 font-semibold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang lưu cấu hình...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Lưu phân quyền
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
