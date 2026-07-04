import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("auth_token")?.value;
  const session = token ? await verifyJWT(token) : null;

  // 1. Redirect root URL '/' based on session
  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 2. Auth routes protection (if logged in, don't allow /login or /login-admin)
  if (pathname === "/login" || pathname === "/login-admin") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 3. Protected routes protection (/dashboard/*)
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Role-based access: standard 'user' cannot access '/dashboard/users' (User Management)
    if (pathname.startsWith("/dashboard/users")) {
      if (session.role === "user") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
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
    "/dashboard/:path*",
  ],
};
