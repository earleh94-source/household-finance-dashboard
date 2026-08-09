import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "household_auth";
const AUTH_COOKIE_VALUE = "authenticated";

function isAuthenticated(request: NextRequest) {
  return request.cookies.get(AUTH_COOKIE)?.value === AUTH_COOKIE_VALUE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (!isAuthenticated(request)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
