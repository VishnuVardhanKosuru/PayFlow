import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/auth/callback
// Supabase redirects here after email confirmation / magic-link / OAuth.
// Exchanges the one-time `code` for a persistent session and redirects to app.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // `next` lets us send the user back to wherever they were trying to go
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore if called from a Server Component context
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful login — send to dashboard (or wherever they were going)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send back to login with a clear error message
  return NextResponse.redirect(
    `${origin}/login?error=Could+not+confirm+your+account.+The+link+may+have+expired.+Please+try+signing+in+with+your+password.`
  );
}
