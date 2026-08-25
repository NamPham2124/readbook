import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    if (!params.id) {
      return NextResponse.json({ error: 'Vocabulary ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { word, ipa, translation, page_number } = body;

    const updates: Record<string, any> = {};

    if (word !== undefined) {
      if (typeof word !== 'string' || word.trim() === '') {
        return NextResponse.json({ error: 'word cannot be empty' }, { status: 400 });
      }
      updates.word = word.trim();
    }

    if (translation !== undefined) {
      if (typeof translation !== 'string' || translation.trim() === '') {
        return NextResponse.json({ error: 'translation cannot be empty' }, { status: 400 });
      }
      updates.translation = translation.trim();
    }

    if (ipa !== undefined) {
      updates.ipa = typeof ipa === 'string' && ipa.trim() !== '' ? ipa.trim() : null;
    }

    if (page_number !== undefined) {
      if (typeof page_number !== 'number' || page_number < 1) {
        return NextResponse.json({ error: 'Invalid page_number' }, { status: 400 });
      }
      updates.page_number = Math.floor(page_number);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updatedVocab, error: updateError } = await supabase
      .from('vocabularies')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedVocab) {
      return NextResponse.json({ error: 'Vocabulary not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ vocabulary: updatedVocab });
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

    if (!params.id) {
      return NextResponse.json({ error: 'Vocabulary ID is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('vocabularies')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Vocabulary deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
