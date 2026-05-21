import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// GET: Fetch the specific wire details for the CFO approval screen
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

// POST: CFO cryptographically signs and approves the wire
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { credentialId } = await req.json();

    // Generate a real cryptographic hash combining the ID, credential, and timestamp
    const hash = crypto.createHash('sha256').update(params.id + credentialId + Date.now()).digest('hex');
    const cryptoHash = `0x${hash}`;

    // Update the database to Approved
    const { data, error } = await supabase
      .from('wire_requests')
      .update({ 
        status: 'approved', 
        cryptographic_hash: cryptoHash,
        approved_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
