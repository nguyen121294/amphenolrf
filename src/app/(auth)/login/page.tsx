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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn, User, Lock, Loader2 } from "lucide-react";
import { login } from "@/lib/auth/actions";

const formSchema = z.object({
  username: z.string().min(1, {
    message: "Tên đăng nhập không được để trống.",
  }),
  password: z.string().min(6, {
    message: "Mật khẩu phải chứa ít nhất 6 ký tự.",
  }),
});

export default function LoginPage() {
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

      const res = await login(null, formData);
      if (res && !res.success) {
        toast.error(res.error || "Đăng nhập thất bại.");
      }
    } catch (err) {
      // Next.js redirect throws an internal error, which is caught here.
      // If it is a redirect, we shouldn't show an error toast.
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        throw err;
      }
      toast.error("Đã xảy ra lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <LogIn className="mx-auto h-12 w-12 text-gray-400" />
        <CardTitle className="mt-4 text-2xl">Đăng nhập hệ thống</CardTitle>
        <CardDescription>
          Nhập tài khoản được cấp để truy cập vào hệ thống
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
                  <FormLabel>Tên đăng nhập</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nhập tên đăng nhập"
                        className="pl-10"
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
                  <FormLabel>Mật khẩu</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="Nhập mật khẩu"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
