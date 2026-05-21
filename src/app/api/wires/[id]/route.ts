import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase
      .from('wire_requests')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) return NextResponse.json({ error: 'Wire not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { action, credentialId } = await req.json();

    if (action === 'decline') {
      const { data, error } = await supabase
        .from('wire_requests')
        .update({ status: 'denied', approved_at: new Date().toISOString() })
        .eq('id', params.id)
        .select().single();
      if (error) return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
      return NextResponse.json({ success: true, data });
    }

    const hash = crypto.createHash('sha256').update(params.id + credentialId + Date.now()).digest('hex');
    const cryptoHash = `0x${hash}`;

    const { data, error } = await supabase
      .from('wire_requests')
      .update({ 
        status: 'approved', 
        cryptographic_hash: cryptoHash,
        approved_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select().single();

    if (error) return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
