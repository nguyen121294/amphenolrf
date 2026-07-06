"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  MoreHorizontal,
  KeyRound,
  ShieldAlert,
  Loader2,
  CalendarDays,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { createUser, resetUserPassword } from "@/lib/auth/actions";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DbUser {
  id: number;
  username: string;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
}

interface UsersTableClientProps {
  initialUsers: DbUser[];
  currentRole: "super_admin" | "admin" | "user";
}

export function UsersTableClient({ initialUsers, currentRole }: UsersTableClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [resetPassOpen, setResetPassOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);

  // Form states for Add User
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [createLoading, setCreateLoading] = useState(false);

  // Form states for Reset Pass
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Filter users based on search
  const filteredUsers = initialUsers.filter((user) =>
    user.username.toLowerCase().includes(search.toLowerCase())
  );

  // Handle Add User Submit
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newRole) {
      toast.error("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    setCreateLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", newUsername);
      formData.append("password", newPassword);
      formData.append("role", newRole);

      const res = await createUser(null, formData);
      if (res && res.success) {
        toast.success(res.message || "Tạo tài khoản thành công!");
        setAddUserOpen(false);
        setNewUsername("");
        setNewPassword("");
        setNewRole("user");
        router.refresh(); // Refresh data from server
      } else {
        toast.error(res?.error || "Lỗi tạo tài khoản.");
      }
    } catch {
      toast.error("Đã xảy ra lỗi kết nối.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPassword) {
      toast.error("Vui lòng nhập mật khẩu mới.");
      return;
    }

    setResetLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", selectedUser.id.toString());
      formData.append("newPassword", resetPassword);

      const res = await resetUserPassword(null, formData);
      if (res && res.success) {
        toast.success(res.message || "Đã reset mật khẩu.");
        setResetPassOpen(false);
        setResetPassword("");
        setSelectedUser(null);
        router.refresh();
      } else {
        toast.error(res?.error || "Lỗi reset mật khẩu.");
      }
    } catch {
      toast.error("Đã xảy ra lỗi kết nối.");
    } finally {
      setResetLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "user":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getRoleDisplayName = (r: string) => {
    return r === "admin" ? "Admin Quản Đốc" : "User Nhân Viên";
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm tài khoản..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => setAddUserOpen(true)}
          className="w-full sm:w-auto flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Tạo tài khoản
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên tài khoản</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-[100px] text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy tài khoản nào.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary uppercase font-bold text-xs">
                            {user.username.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Check permission for reset pass: Admin can only reset User, Super Admin can reset anyone */}
                      {(currentRole === "super_admin" || (currentRole === "admin" && user.role === "user")) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setResetPassOpen(true);
                              }}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <KeyRound className="h-4 w-4 text-blue-500" />
                              Reset mật khẩu
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div className="text-xs text-muted-foreground italic px-2">Khóa</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddUser}>
            <DialogHeader>
              <DialogTitle>Tạo tài khoản mới</DialogTitle>
              <DialogDescription>
                Thêm tài khoản truy cập hệ thống.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  placeholder="Nhập tên đăng nhập"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu ban đầu</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Vai trò</Label>
                <Select
                  value={newRole}
                  onValueChange={(val) => setNewRole(val as "admin" | "user")}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User Nhân Viên</SelectItem>
                    {currentRole === "super_admin" && (
                      <SelectItem value="admin">Admin Quản Đốc</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {currentRole === "admin" && (
                  <p className="text-xs text-muted-foreground">
                    * Là Admin tiêu chuẩn, bạn chỉ có thể tạo tài khoản có vai trò User Nhân Viên.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddUserOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  "Tạo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPassOpen} onOpenChange={setResetPassOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-blue-500" />
                Reset mật khẩu
              </DialogTitle>
              <DialogDescription>
                Cấp lại mật khẩu mới cho tài khoản{" "}
                <span className="font-semibold text-foreground">
                  &quot;{selectedUser?.username}&quot;
                </span>
                .
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetPassOpen(false);
                  setSelectedUser(null);
                }}
              >
                Hủy
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={resetLoading}>
                {resetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
