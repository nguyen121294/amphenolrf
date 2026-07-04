"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, User, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { loginAdmin } from "@/lib/auth/actions";

const formSchema = z.object({
  username: z.string().min(1, {
    message: "Tên đăng nhập Super Admin không được để trống.",
  }),
  password: z.string().min(6, {
    message: "Mật khẩu phải chứa ít nhất 6 ký tự.",
  }),
});

export default function LoginAdminPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", values.username);
      formData.append("password", values.password);

      const res = await loginAdmin(null, formData);
      if (res && !res.success) {
        toast.error(res.error || "Đăng nhập Super Admin thất bại.");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        throw err;
      }
      toast.error("Đã xảy ra lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-red-500/20 shadow-xl shadow-red-500/5">
      <CardHeader className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldCheck className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="mt-4 text-2xl text-red-600 dark:text-red-500">Đăng nhập Super Admin</CardTitle>
        <CardDescription>
          Khu vực quản trị tối cao. Vui lòng nhập thông tin bảo mật.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên đăng nhập tối cao</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nhập username Super Admin"
                        className="pl-10 border-red-500/20 focus-visible:ring-red-500"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khóa</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="Nhập password Super Admin"
                        className="pl-10 border-red-500/20 focus-visible:ring-red-500"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                "Xác thực tối cao"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <div className="text-center text-sm">
          <Link
            href="/login"
            className="text-gray-500 hover:text-gray-800 underline text-xs"
          >
            Quay lại cổng đăng nhập tiêu chuẩn
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
