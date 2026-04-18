/**
 * Gates protected API surfaces (Next.js 16 proxy, formerly middleware).
 *
 * The cookie is opaque to this layer — iron-session decryption requires
 * the SESSION_SECRET, which we avoid loading into the edge runtime. We just
 * check for cookie presence here; route handlers do full decryption + Redis
 * lookup via `requireSession()`.
 *
 * Protected paths:
 *   - /api/github/*   (except /api/github/connect)
 *   - /api/resume/*
 *   - /api/jd/*
 */
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "internshippy_session";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/api/github/connect") return NextResponse.next();
  if (!req.cookies.get(COOKIE_NAME)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "AUTH_MISSING",
          message: "Not connected to GitHub",
          hint: "POST /api/github/connect with your PAT first",
        },
      },
      { status: 401 },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/github/:path*", "/api/resume/:path*", "/api/jd/:path*"],
};
