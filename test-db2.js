const { createClient } = require('@supabase/supabase-js');

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.from('vendors').select('*').limit(1);
  if (data && data.length > 0) {
    console.log("Keys in vendor row:", Object.keys(data[0]));
  }
}
run();
