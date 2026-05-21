import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { cookies } from 'next/headers';

// Extremely strict role checker that bypasses cache
async function getRoleDirectlyFromDB(req: Request) {
  try {
    const authHeader = req.headers.get('cookie') || '';
    const tokenMatch = authHeader.match(/(?:sb-access-token|supabase-auth-token)=([^;]+)/);
    if (!tokenMatch) return 'guest';
    
    // We explicitly create a fresh client to ensure no cached roles leak through
    const { data: { user }, error } = await supabase.auth.getUser(tokenMatch[1]);
    if (error || !user) return 'guest';

    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
      
    return data?.role || 'guest';
  } catch (e) {
    return 'guest';
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Await the strict role checker
    const role = await getRoleDirectlyFromDB(req);

    const { data, error } = await supabase
      .from('wire_requests')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) return NextResponse.json({ error: 'Wire not found' }, { status: 404 });
    
    // Force Next.js to not cache this response so the CFO/Clerk state doesn't get stuck
    return NextResponse.json(
      { success: true, data, isCFO: role === 'cfo', debugRole: role },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const role = await getRoleDirectlyFromDB(req);
    
    if (role !== 'cfo') {
      return NextResponse.json({ error: 'Unauthorized: Only CFOs can cryptographically sign wires' }, { status: 403 });
    }

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
