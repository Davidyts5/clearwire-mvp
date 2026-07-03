const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('vendor_change_requests').select('id, old_data').limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
