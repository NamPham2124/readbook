import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    const prof = currentProfile as any;
    if (!prof || prof.role !== 'admin' || !prof.is_active) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { role, is_active, display_name } = body;

    // Safety check: Admin cannot disable themselves
    if (params.id === user.id && is_active === false) {
      return NextResponse.json({ error: 'You cannot disable your own admin account.' }, { status: 400 });
    }

    // Safety check: Admin cannot demote themselves if they are the only admin
    if (params.id === user.id && role === 'user') {
      return NextResponse.json({ error: 'You cannot remove your own admin role.' }, { status: 400 });
    }

    const updates: any = {};
    if (role && (role === 'admin' || role === 'user')) updates.role = role;
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (display_name !== undefined) updates.display_name = display_name;

    const adminSupabase = createAdminClient();
    const { data: updatedProfile, error: updateError } = await adminSupabase
      .from('profiles')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ user: updatedProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    const prof = currentProfile as any;
    if (!prof || prof.role !== 'admin' || !prof.is_active) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Safety check: Admin cannot delete themselves
    if (params.id === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // 1. Delete from auth.users (cascades to profile and annotations)
    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(params.id);
    if (deleteAuthError) {
      // Fallback: delete profile directly
      await adminSupabase.from('profiles').delete().eq('id', params.id);
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
