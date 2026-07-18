import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const requestedNext = request.nextUrl.searchParams.get("next") ?? "/dashboard";

    const safeNext = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";

    if (!code) {
        const errorUrl = new URL(safeNext, request.url);
        errorUrl.searchParams.set("error", "authentication_failed");
        return NextResponse.redirect(errorUrl);
    }
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        const errorUrl = new URL(safeNext, request.url);
        errorUrl.searchParams.set("error", "authentication_failed");
        return NextResponse.redirect(errorUrl);
    }

    return NextResponse.redirect(new URL(safeNext, request.url));
}
