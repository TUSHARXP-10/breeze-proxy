import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const API_KEY       = Deno.env.get("BREEZE_APPKEY")!;
const SECRET_KEY    = Deno.env.get("BREEZE_SECRET")!;
const SESSION_TOKEN = Deno.env.get("BREEZE_SESSION_TOKEN")!;

serve(async (req) => {
  try {
    const { stock_code, exchange_code, product_type, expiry_date, right, strike_price } = await req.json();

    // 1. Build payload
    const payload = { stock_code, exchange_code, product_type, expiry_date, right, strike_price: strike_price ?? "" };
    const bodyStr = JSON.stringify(payload);

    // 2. Timestamp
    const ts = new Date().toISOString().slice(0,19) + ".000Z";

    // 3. Checksum
    const raw = ts + bodyStr + SECRET_KEY;
    const hash = new TextEncoder().encode(raw);
    const checksum = await crypto.subtle.digest("SHA-256", hash)
      .then(buf => [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join(""));

    // 4. Breeze headers
    const headers = new Headers({
      "Content-Type":   "application/json",
      "Accept":         "application/json",
      "X-AppKey":       API_KEY,
      "X-Timestamp":    ts,
      "X-Checksum":     checksum,
      "X-SessionToken": SESSION_TOKEN
    });

    // 5. Call Breeze
    const resp = await fetch("https://api.icicidirect.com/breezeapi/api/v1/optionchain", {
      method: "POST",
      headers,
      body: bodyStr
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(txt, { status: resp.status });
    }
    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type":"application/json" }});

  } catch (err: any) {
    return new Response(err.toString(), { status: 500 });
  }
}); 