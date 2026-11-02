import { createClient } from '@supabase/supabase-js'

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY']
for (const name of requiredEnv) {
  if (!process.env[name]) throw new Error(`Missing ${name} in .env.seed.local`)
}

const accounts = [
  { email: 'admin@atlas.com', name: 'Atlas Admin', department: 'Operations', role: 'Super Admin', passwordKey: 'SEED_ADMIN_PASSWORD' },
  { email: 'spaceadmin@atlas.com', name: 'Engineering Admin', department: 'Engineering', role: 'Space Admin', space: 'engineering', passwordKey: 'SEED_SPACE_ADMIN_PASSWORD' },
  { email: 'author@atlas.com', name: 'Atlas Author', department: 'Product', role: 'Author', space: 'product-design', passwordKey: 'SEED_AUTHOR_PASSWORD' },
  { email: 'reviewer@atlas.com', name: 'Atlas Reviewer', department: 'Security', role: 'Reviewer', space: 'security', passwordKey: 'SEED_REVIEWER_PASSWORD' },
  { email: 'viewer@atlas.com', name: 'Atlas Viewer', department: 'Customer Success', role: 'Viewer', space: 'customer-success', passwordKey: 'SEED_VIEWER_PASSWORD' },
]

for (const account of accounts) {
  const password = process.env[account.passwordKey]
  if (!password || password.length < 14) {
    throw new Error(`${account.passwordKey} must be set to a unique password of at least 14 characters.`)
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: userPage, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (listError) throw listError

for (const account of accounts) {
  const existing = userPage.users.find((user) => user.email?.toLowerCase() === account.email)
  const attributes = {
    email: account.email,
    password: process.env[account.passwordKey],
    email_confirm: true,
    user_metadata: { full_name: account.name },
  }

  const { data: authData, error: authError } = existing
    ? await supabase.auth.admin.updateUserById(existing.id, attributes)
    : await supabase.auth.admin.createUser(attributes)
  if (authError) throw new Error(`Could not seed ${account.email}: ${authError.message}`)
  if (!authData.user) throw new Error(`Supabase did not return a user for ${account.email}.`)

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    email: account.email,
    display_name: account.name,
    department: account.department,
    role: account.role,
  }, { onConflict: 'id' })
  if (profileError) throw new Error(`Could not create profile for ${account.email}: ${profileError.message}`)

  if (account.space) {
    const { data: space, error: spaceError } = await supabase.from('spaces').select('id').eq('slug', account.space).single()
    if (spaceError || !space) throw new Error(`Seed spaces before users; missing space slug: ${account.space}`)

    const { error: membershipError } = await supabase.from('space_members').upsert({
      space_id: space.id,
      user_id: authData.user.id,
      role: account.role === 'Space Admin' ? 'Space Admin' : 'Member',
    }, { onConflict: 'space_id,user_id' })
    if (membershipError) throw new Error(`Could not add ${account.email} to ${account.space}: ${membershipError.message}`)
  }

  console.log(`Seeded ${account.role}: ${account.email}`)
}

console.log('Seed complete. Passwords were not printed.')
