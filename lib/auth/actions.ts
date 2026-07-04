"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { signJWT, setJWTCookie, deleteJWTCookie, getSession } from "./jwt";

export interface ActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

// LOGIN FOR USER & STANDARD ADMIN
export async function login(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!username || !password) {
    return { success: false, error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." };
  }

  try {
    // Query user from database
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return { success: false, error: "Tên đăng nhập hoặc mật khẩu không chính xác." };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: "Tên đăng nhập hoặc mật khẩu không chính xác." };
    }

    // Sign JWT and set cookie
    const token = await signJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    await setJWTCookie(token);
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return { success: false, error: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." };
  }

  // Redirect after setting cookie (must be outside try-catch block for Next.js redirect behavior)
  redirect("/dashboard");
}

// LOGIN FOR SUPER ADMIN
export async function loginAdmin(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();

  const expectedUsername = process.env.SUPER_ADMIN_USERNAME;
  const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return { success: false, error: "Tài khoản Super Admin chưa được cấu hình trong hệ thống." };
  }

  if (!username || !password) {
    return { success: false, error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." };
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return { success: false, error: "Tên đăng nhập hoặc mật khẩu Super Admin không đúng." };
  }

  try {
    const token = await signJWT({
      userId: "super_admin_id",
      username: username,
      role: "super_admin",
    });

    await setJWTCookie(token);
  } catch {
    console.error("Lỗi đăng nhập Super Admin:");
    return { success: false, error: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau." };
  }

  redirect("/dashboard-admin");
}

// LOGOUT
export async function logout() {
  await deleteJWTCookie();
  redirect("/login");
}

// CHANGE PASSWORD (FOR CURRENT USER)
export async function changePassword(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const currentPassword = formData.get("currentPassword")?.toString();
  const newPassword = formData.get("newPassword")?.toString();

  if (!currentPassword || !newPassword) {
    return { success: false, error: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới." };
  }

  const session = await getSession();
  if (!session) {
    return { success: false, error: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." };
  }

  if (session.role === "super_admin") {
    return { success: false, error: "Mật khẩu Super Admin chỉ có thể thay đổi trong tệp cấu hình hệ thống (.env)." };
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, session.userId as number)).limit(1);
    if (!user) {
      return { success: false, error: "Không tìm thấy người dùng." };
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: "Mật khẩu hiện tại không chính xác." };
    }

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: newPasswordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    return { success: true, message: "Đổi mật khẩu thành công!" };
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error);
    return { success: false, error: "Đã xảy ra lỗi hệ thống khi đổi mật khẩu." };
  }
}

// CREATE USER
export async function createUser(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return { success: false, error: "Bạn không có quyền thực hiện chức năng này." };
  }

  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString();

  if (!username || !password || !role) {
    return { success: false, error: "Vui lòng điền đầy đủ các thông tin yêu cầu." };
  }

  if (role !== "admin" && role !== "user") {
    return { success: false, error: "Vai trò không hợp lệ." };
  }

  // Admin manager can only create standard User
  if (session.role === "admin" && role === "admin") {
    return { success: false, error: "Admin tiêu chuẩn chỉ được tạo tài khoản vai trò User." };
  }

  try {
    // Check if username exists
    const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing) {
      return { success: false, error: "Tên đăng nhập đã tồn tại trong hệ thống." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(users).values({
      username,
      passwordHash,
      role: role as "admin" | "user",
    });

    return { success: true, message: "Tạo tài khoản thành công!" };
  } catch (error) {
    console.error("Lỗi tạo người dùng:", error);
    return { success: false, error: "Lỗi kết nối cơ sở dữ liệu khi tạo tài khoản." };
  }
}

// RESET PASSWORD
export async function resetUserPassword(prevState: unknown, formData: FormData): Promise<ActionResponse> {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "admin")) {
    return { success: false, error: "Bạn không có quyền thực hiện chức năng này." };
  }

  const targetUserIdStr = formData.get("userId")?.toString();
  const newPassword = formData.get("newPassword")?.toString();

  if (!targetUserIdStr || !newPassword) {
    return { success: false, error: "Vui lòng nhập đầy đủ thông tin reset." };
  }

  const targetUserId = parseInt(targetUserIdStr, 10);

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) {
      return { success: false, error: "Không tìm thấy người dùng cần reset mật khẩu." };
    }

    // Admin manager can only reset standard User passwords
    if (session.role === "admin" && targetUser.role === "admin") {
      return { success: false, error: "Admin tiêu chuẩn chỉ được reset mật khẩu cho User thường." };
    }

    // Super Admin cannot reset itself through here
    if (session.role === "super_admin" && targetUser.id === session.userId) {
      return { success: false, error: "Không thể reset mật khẩu của chính mình tại đây." };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: newPasswordHash, updatedAt: new Date() }).where(eq(users.id, targetUserId));

    return { success: true, message: `Reset mật khẩu của tài khoản "${targetUser.username}" thành công!` };
  } catch (error) {
    console.error("Lỗi reset mật khẩu:", error);
    return { success: false, error: "Đã xảy ra lỗi khi reset mật khẩu người dùng." };
  }
}
