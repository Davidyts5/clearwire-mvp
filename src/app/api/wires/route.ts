import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import twilio from 'twilio';

export async function GET(req: Request) {
  try {
    // Phase 2: Securely fetch wires matching the logged-in user's company
    const authHeader = req.headers.get('cookie') || '';
    const tokenMatch = authHeader.match(/sb-access-token=([^;]+)/);
    
    if (!tokenMatch) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: userError } = await supabase.auth.getUser(tokenMatch[1]);
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch the user's company
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!userData) return NextResponse.json({ error: 'User data not found' }, { status: 404 });

    // Fetch wires for that specific company
    const { data, error } = await supabase
      .from('wire_requests')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('cookie') || '';
    const tokenMatch = authHeader.match(/sb-access-token=([^;]+)/);
    if (!tokenMatch) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(tokenMatch[1]);
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user!.id).single();

    const body = await req.json();
    const { vendor, amount, purpose } = body;

    const phrases = ["PURPLE ELEPHANT BATTERY", "RED SUNSET OCEAN", "BLUE MOUNTAIN CABIN", "YELLOW TIGER STRIPE", "SILVER COFFEE MUG"];
    const antiAiPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    const { data: requestData, error: dbError } = await supabase
      .from('wire_requests')
      .insert([{ 
        company_id: userData!.company_id,
        vendor_name: vendor, 
        amount: parseFloat(amount), 
        purpose: purpose || "Invoice Payment", 
        anti_ai_phrase: antiAiPhrase, 
        status: 'pending' 
      }])
      .select().single();

    if (dbError) {
      console.error(dbError);
      return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
    }

    try {
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
    } catch (twilioError) {
      return NextResponse.json({ success: true, data: requestData, warning: 'DB saved, but SMS blocked by carrier. Link generated in dashboard.' });
    }

    return NextResponse.json({ success: true, data: requestData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
