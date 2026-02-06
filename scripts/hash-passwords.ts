// SEC-008: One-time password hashing migration script
// Run: npx tsx scripts/hash-passwords.ts
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SALT_ROUNDS = 10;

async function hashAllPasswords() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching employees with plaintext passwords...');
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, email, password')
    .not('password', 'is', null);

  if (error) {
    console.error('Error fetching employees:', error);
    process.exit(1);
  }

  if (!employees || employees.length === 0) {
    console.log('No employees with passwords found.');
    return;
  }

  console.log(`Found ${employees.length} employees to hash.`);
  let hashed = 0;
  let skipped = 0;

  for (const emp of employees) {
    if (!emp.password) {
      skipped++;
      continue;
    }

    // Skip if already looks like a bcrypt hash
    if (emp.password.startsWith('$2a$') || emp.password.startsWith('$2b$')) {
      skipped++;
      continue;
    }

    const hash = await bcrypt.hash(emp.password, SALT_ROUNDS);
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        password_hash: hash,
        password: null, // SEC: clear plaintext after hashing
        must_reset_password: true,
        password_changed_at: null,
      })
      .eq('id', emp.id);

    if (updateError) {
      console.error(`Failed to hash password for ${emp.email}:`, updateError.message);
    } else {
      hashed++;
      console.log(`[${hashed}/${employees.length}] Hashed password for ${emp.email}`);
    }
  }

  console.log(`\nDone! Hashed: ${hashed}, Skipped: ${skipped}, Total: ${employees.length}`);
  console.log('All employees with must_reset_password = true will be forced to change password on next login.');
}

hashAllPasswords().catch(console.error);
