// Supabase Edge Function: backfill-zones
// Backfills the `zone` column for any profile that has a `state` but no `zone`.
// Deploy: supabase functions deploy backfill-zones
// Invoke: POST https://<project>.supabase.co/functions/v1/backfill-zones
//         with header: Authorization: Bearer <service_role_key>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STATE_TO_ZONE: Record<string, string> = {
  // North
  Delhi: 'North', Haryana: 'North', 'Himachal Pradesh': 'North',
  'Jammu & Kashmir': 'North', Punjab: 'North', Rajasthan: 'North',
  Uttarakhand: 'North', 'Uttar Pradesh': 'North',
  // South
  'Andhra Pradesh': 'South', Karnataka: 'South', Kerala: 'South',
  'Tamil Nadu': 'South', Telangana: 'South',
  // East
  'Arunachal Pradesh': 'East', Assam: 'East', Bihar: 'East',
  Jharkhand: 'East', Manipur: 'East', Meghalaya: 'East',
  Mizoram: 'East', Nagaland: 'East', Odisha: 'East',
  Sikkim: 'East', Tripura: 'East', 'West Bengal': 'East',
  // West
  Goa: 'West', Gujarat: 'West', Maharashtra: 'West',
  // Central
  Chhattisgarh: 'Central', 'Madhya Pradesh': 'Central',
};

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase    = createClient(supabaseUrl, serviceKey);

  // Fetch profiles that have a state but no zone
  const { data: profiles, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, state, zone')
    .not('state', 'is', null)
    .or('zone.is.null,zone.eq.');

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const toUpdate = (profiles || []).filter(p => STATE_TO_ZONE[p.state]);
  let updated = 0;
  let skipped = 0;

  // Process in batches of 50
  for (let i = 0; i < toUpdate.length; i += 50) {
    const batch = toUpdate.slice(i, i + 50);
    await Promise.all(batch.map(async (p) => {
      const zone = STATE_TO_ZONE[p.state];
      const { error } = await supabase
        .from('profiles')
        .update({ zone })
        .eq('id', p.id);
      if (!error) updated++; else skipped++;
    }));
  }

  const unmapped = (profiles || []).filter(p => !STATE_TO_ZONE[p.state]);

  return new Response(JSON.stringify({
    success: true,
    total_without_zone: (profiles || []).length,
    updated,
    skipped,
    unmapped_states: [...new Set(unmapped.map(p => p.state))],
  }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
