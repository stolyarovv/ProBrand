import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { type Section, canAccessSection } from "@/lib/permissions";

function pathToSection(pathname: string): Section | null {
  const first = pathname.split("/").filter(Boolean)[0];
  if (
    first === "sales" ||
    first === "finance" ||
    first === "accounting" ||
    first === "projects" ||
    first === "documents"
  ) {
    return first;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("NEXTAUTH_SECRET is not set");
  }

  const token = await getToken({
    req: request,
    secret,
  });

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login")) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const section = pathToSection(pathname);
  if (section && token.role && !canAccessSection(token.role as Role, section)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/sales/:path*",
    "/finance/:path*",
    "/accounting/:path*",
    "/projects/:path*",
    "/documents/:path*",
    "/login",
  ],
};
