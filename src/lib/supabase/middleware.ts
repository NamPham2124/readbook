import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not yet configured, allow request to continue (or to setup screen)
    return supabaseResponse;
  }

  const supabase = createServerClient<any>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  const isProtectedRoute =
    pathname.startsWith('/library') ||
    pathname.startsWith('/reader') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/books') ||
    pathname.startsWith('/api/annotations') ||
    pathname.startsWith('/api/progress') ||
    pathname.startsWith('/api/admin');

  // If user is not authenticated and trying to access a protected route
  if (!user && isProtectedRoute) {
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access auth pages (login/register)
  if (user && isAuthRoute) {
    url.pathname = '/library';
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  // Admin route check
  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    const prof = profile as any;
    if (!prof || prof.role !== 'admin' || !prof.is_active) {
      url.pathname = '/library';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
