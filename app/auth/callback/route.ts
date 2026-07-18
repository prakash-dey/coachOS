import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const requestedNext = request.nextUrl.searchParams.get("next") ?? "/dashboard";

    const safeNext = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";

    if (!code) {
        return NextResponse.redirect(new URL("/login?error=missing_auth_code", request.url));
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return NextResponse.redirect(
            new URL("/login?error=authentication_failed", request.url),
        );
    }

    return NextResponse.redirect(new URL(safeNext, request.url));
}