import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import twilio from 'twilio';

// GET: Fetch all wires to display on the dashboard
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('wire_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Create a new wire request
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vendor, amount } = body;

    const phrases = ["PURPLE ELEPHANT BATTERY", "RED SUNSET OCEAN", "BLUE MOUNTAIN CABIN", "YELLOW TIGER STRIPE", "SILVER COFFEE MUG"];
    const antiAiPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    const { data: requestData, error: dbError } = await supabase
      .from('wire_requests')
      .insert([
        { vendor_name: vendor, amount: parseFloat(amount), anti_ai_phrase: antiAiPhrase, status: 'pending' }
      ])
      .select().single();

    if (dbError) return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });

    try {
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      const toPhone = process.env.CFO_PHONE_NUMBER; 
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;
      
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const approvalUrl = `${protocol}://${host}/approve/${requestData.id}`;

      await client.messages.create({
        body: `CLEARWIRE URGENT: Wire request for $${amount} to ${vendor}. Tap link to cryptographically approve: ${approvalUrl}`,
        from: fromPhone,
        to: toPhone!
      });
    } catch (twilioError) {
      console.error("Twilio Error:", twilioError);
      return NextResponse.json({ success: true, data: requestData, warning: 'DB saved, but SMS blocked by carrier. Link generated in dashboard.' });
    }

    return NextResponse.json({ success: true, data: requestData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
