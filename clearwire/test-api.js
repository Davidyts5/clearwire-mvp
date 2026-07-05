const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
      .from('vendor_change_requests')
      .select('*, vendors (name, account_number, swift_bic, status), users!requested_by (full_name, email)')
      .limit(1);
  console.log(JSON.stringify(data, null, 2));
}
run();
