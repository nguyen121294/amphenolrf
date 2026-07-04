import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  CreditCard,
  DollarSign,
  Users,
  Settings,
} from "lucide-react";
import { getSession } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    icon: DollarSign,
    description: "+20.1% from last month",
    trend: "up",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Subscriptions",
    value: "+2,350",
    icon: Users,
    description: "+180.1% from last month",
    trend: "up",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Sales",
    value: "+12,234",
    icon: CreditCard,
    description: "+19% from last month",
    trend: "up",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Active Now",
    value: "+573",
    icon: Activity,
    description: "+201 since last hour",
    trend: "up",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const getRoleDisplayName = (r: string) => {
    switch (r) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin Quản Đốc";
      case "user":
        return "User Nhân Viên";
      default:
        return r;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Tổng Quan Hệ Thống</h1>
        <p className="text-muted-foreground text-lg">
          Chào mừng quay trở lại, <span className="font-semibold text-foreground">{session.username}</span> ({getRoleDisplayName(session.role)})! Dưới đây là tổng quan dữ liệu của bạn.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.title}
              className="group hover:shadow-lg transition-all duration-200"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Content Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Hoạt Động Gần Đây
            </CardTitle>
            <p className="text-muted-foreground">
              Cập nhật mới nhất từ hệ thống của bạn
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="flex-1">
                <p className="font-medium">Hệ thống hoạt động bình thường</p>
                <p className="text-sm text-muted-foreground">Vừa xong</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="flex-1">
                <p className="font-medium">Cơ sở dữ liệu Supabase đã kết nối qua Drizzle</p>
                <p className="text-sm text-muted-foreground">5 phút trước</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <div className="flex-1">
                <p className="font-medium">Phiên làm việc JWT được khởi tạo bảo mật</p>
                <p className="text-sm text-muted-foreground">1 giờ trước</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Thao Tác Nhanh
            </CardTitle>
            <p className="text-muted-foreground">Các tính năng phổ biến</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {session.role !== "user" ? (
                <a
                  href="/dashboard/users"
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border hover:bg-muted transition-colors text-center"
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm font-medium">Quản Lý Users</span>
                </a>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border bg-muted/30 opacity-60 text-center"
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm font-medium">Quản Lý Users (Khóa)</span>
                </div>
              )}
              <a
                href="/dashboard/settings/change-password"
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border hover:bg-muted transition-colors text-center"
              >
                <Settings className="h-6 w-6" />
                <span className="text-sm font-medium">Đổi Mật Khẩu</span>
              </a>
              <div
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border bg-muted/20 opacity-50 text-center"
              >
                <Activity className="h-6 w-6" />
                <span className="text-sm font-medium">Báo Cáo</span>
              </div>
              <div
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border bg-muted/20 opacity-50 text-center"
              >
                <DollarSign className="h-6 w-6" />
                <span className="text-sm font-medium">Doanh Thu</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
