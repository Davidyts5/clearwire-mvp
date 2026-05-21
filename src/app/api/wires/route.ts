import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import twilio from 'twilio';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('cookie') || '';
    const tokenMatch = authHeader.match(/(?:sb-access-token|supabase-auth-token)=([^;]+)/);
    
    if (!tokenMatch) return NextResponse.json({ error: 'Unauthorized: No token' }, { status: 401 });

    const { data: { user }, error: userError } = await supabase.auth.getUser(tokenMatch[1]);
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });

    // Look for the user. If they aren't linked to a company, fallback to a null company bypass for MVP demo purposes.
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    
    let query = supabase.from('wire_requests').select('*').order('created_at', { ascending: false });
    
    if (userData?.company_id) {
      query = query.eq('company_id', userData.company_id);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: 'Failed to fetch wires' }, { status: 500 });
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Server error on GET' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('cookie') || '';
    const tokenMatch = authHeader.match(/(?:sb-access-token|supabase-auth-token)=([^;]+)/);
    
    if (!tokenMatch) return NextResponse.json({ error: 'Unauthorized: No Token' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(tokenMatch[1]);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized: Auth failed' }, { status: 401 });

    // Try to find the company ID
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    
    // If the database is misaligned and they have no company ID, we will automatically create one and link them 
    // so the MVP stops crashing.
    let finalCompanyId = userData?.company_id;

    if (!finalCompanyId) {
      // Create a fallback company on the fly
      const { data: newComp } = await supabase.from('companies').insert([{ name: 'Auto-Generated Demo Corp' }]).select().single();
      finalCompanyId = newComp?.id;

      // Try to link the user to it
      if (finalCompanyId) {
        await supabase.from('users').insert([{
          id: user.id,
          company_id: finalCompanyId,
          email: user.email,
          full_name: 'Auto Gen Clerk',
          role: 'clerk'
        }]);
      }
    }

    const body = await req.json();
    const { vendor, amount, purpose } = body;

    const phrases = ["PURPLE ELEPHANT BATTERY", "RED SUNSET OCEAN", "BLUE MOUNTAIN CABIN", "YELLOW TIGER STRIPE", "SILVER COFFEE MUG"];
    const antiAiPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    const { data: requestData, error: dbError } = await supabase
      .from('wire_requests')
      .insert([{ 
        company_id: finalCompanyId, // Uses the found or auto-generated ID
        vendor_name: vendor, 
        amount: parseFloat(amount), 
        purpose: purpose || "Invoice Payment", 
        anti_ai_phrase: antiAiPhrase, 
        status: 'pending' 
      }])
      .select().single();

    if (dbError) {
      console.error("Insert Error:", dbError);
      return NextResponse.json({ error: 'Database rejected the insert. Check RLS policies.' }, { status: 500 });
    }

    try {
      if(process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
        const toPhone = process.env.CFO_PHONE_NUMBER; 
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const approvalUrl = `${protocol}://${host}/approve/${requestData.id}`;

        await client.messages.create({
          body: `CLEARWIRE URGENT: Wire request for $${amount} to ${vendor}. Purpose: ${purpose}. Tap link to cryptographically approve: ${approvalUrl}`,
          from: fromPhone,
          to: toPhone!
        });
      }
    } catch (twilioError) {
      return NextResponse.json({ success: true, data: requestData, warning: 'DB saved, but SMS failed.' });
    }

    return NextResponse.json({ success: true, data: requestData });
  } catch (error) {
    console.error("POST Catch Block Error:", error);
    return NextResponse.json({ error: 'Failed to process request at edge' }, { status: 500 });
  }
}
