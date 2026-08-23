import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL || 'admin@readbook.local';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456!';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env or .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('🤖 Seeding Admin User for ReadBook...');
  console.log(`📧 Admin Email: ${adminEmail}`);

  // 1. Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }

  const existingUser = usersData.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());

  let userId: string;

  if (existingUser) {
    console.log(`ℹ️ User ${adminEmail} already exists (ID: ${existingUser.id}). Updating to Admin role...`);
    userId = existingUser.id;

    // Update password and metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'admin', display_name: 'Administrator' },
    });

    if (updateError) {
      console.warn('⚠️ Warning updating auth user:', updateError.message);
    }
  } else {
    console.log(`✨ Creating new admin user: ${adminEmail}...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: 'admin', display_name: 'Administrator' },
    });

    if (createError || !createData.user) {
      console.error('❌ Failed to create admin user:', createError?.message);
      process.exit(1);
    }
    userId = createData.user.id;
  }

  // 2. Ensure profile exists and has role='admin', is_active=true
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: adminEmail,
      display_name: 'Administrator',
      role: 'admin',
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('❌ Failed to upsert admin profile:', profileError.message);
    process.exit(1);
  }

  console.log('✅ Admin user successfully configured!');
  console.log('==================================================');
  console.log(`🔑 Login Email:    ${adminEmail}`);
  console.log(`🔒 Login Password: ${adminPassword}`);
  console.log(`🛡️ Role:           admin`);
  console.log('==================================================');
}

main().catch((err) => {
  console.error('Fatal error seeding admin:', err);
  process.exit(1);
});
