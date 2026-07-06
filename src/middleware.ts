import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./lib/auth/jwt";
import { canAccessPage, type UserRole } from "./lib/auth/permissions";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("auth_token")?.value;
  const session = token ? await verifyJWT(token) : null;

  // 1. Redirect root URL '/' based on session and role
  if (pathname === "/") {
    if (session) {
      if (session.role === "super_admin") {
        return NextResponse.redirect(new URL("/dashboard-admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/console", request.url));
      }
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 2. Auth routes protection (prevent authenticated users from accessing /login or /login-admin)
  if (pathname === "/login" || pathname === "/login-admin") {
    if (session) {
      if (session.role === "super_admin") {
        return NextResponse.redirect(new URL("/dashboard-admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/console", request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Super Admin Protected Routes (/dashboard-admin/*)
  if (pathname.startsWith("/dashboard-admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role !== "super_admin") {
      return NextResponse.redirect(new URL("/console", request.url));
    }
    return NextResponse.next();
  }

  // 4. Staff / Admin Protected Routes (/app/*)
  if (pathname.startsWith("/console")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role === "super_admin") {
      return NextResponse.redirect(new URL("/dashboard-admin", request.url));
    }

    // Dynamic role-based page permission checks
    if (!canAccessPage(session.role as UserRole, pathname)) {
      return NextResponse.redirect(new URL("/console", request.url));
    }
  }

  return NextResponse.next();
}

// Configure which paths middleware runs on
export const config = {
  matcher: [
    "/",
    "/login",
    "/login-admin",
    "/console/:path*",
    "/dashboard-admin/:path*",
  ],
};
