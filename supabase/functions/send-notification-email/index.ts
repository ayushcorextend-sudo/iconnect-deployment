import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { to, subject, bodyHtml, bodyText } = await req.json();
    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Missing to or subject" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    if (!RESEND_API_KEY) {
      console.log("[send-notification-email] No RESEND_API_KEY — skipping");
      return new Response(JSON.stringify({ success: true, note: "no key" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "iConnect <onboarding@resend.dev>",
        to: [to],
        subject,
        html: bodyHtml || `<p>${bodyText || ""}</p>`,
        text: bodyText || "",
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }
});
