import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import twilio from 'twilio';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vendor, amount } = body;

    // 1. Generate the random Anti-AI Phrase for liveness checking
    const phrases = ["PURPLE ELEPHANT BATTERY", "RED SUNSET OCEAN", "BLUE MOUNTAIN CABIN", "YELLOW TIGER STRIPE", "SILVER COFFEE MUG"];
    const antiAiPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    // 2. Save the pending request to Supabase PostgreSQL Database
    const { data: requestData, error: dbError } = await supabase
      .from('wire_requests')
      .insert([
        { 
          vendor_name: vendor, 
          amount: parseFloat(amount), 
          anti_ai_phrase: antiAiPhrase, 
          status: 'pending' 
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Database Error:", dbError);
      return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
    }

    // 3. Send out-of-band SMS via Twilio to the CFO
    try {
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      
      // We use the CFO_PHONE_NUMBER from env for testing, so you receive it on your actual phone.
      const toPhone = process.env.CFO_PHONE_NUMBER; 
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;
      
      // In production, the URL would be https://clearwire.security/approve/...
      // For local testing, we'll just send the ID.
      const approvalUrl = `https://clearwire-mvp.vercel.app/approve/${requestData.id}`;

      await client.messages.create({
        body: `CLEARWIRE URGENT: Wire request for $${amount} to ${vendor}. Tap link to cryptographically approve: ${approvalUrl}`,
        from: fromPhone,
        to: toPhone!
      });
    } catch (twilioError) {
      console.error("Twilio Error:", twilioError);
      // We still return success for the DB insert, but warn about SMS
      return NextResponse.json({ success: true, data: requestData, warning: 'DB saved, but SMS failed. Check Twilio credentials.' });
    }

    return NextResponse.json({ success: true, data: requestData });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
