import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-10rem)] w-full flex-col items-center justify-center gap-3">
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="absolute h-14 w-14 rounded-full border border-primary/20 border-t-primary animate-pulse" />
      </div>
      <p className="text-sm font-medium text-zinc-500 animate-pulse">
        Đang tải dữ liệu, vui lòng đợi...
      </p>
    </div>
  );
}
