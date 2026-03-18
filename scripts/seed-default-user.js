/* eslint-disable no-console */

const fs = require('node:fs')
const path = require('node:path')

const bcrypt = require('bcryptjs')
const { neon } = require('@neondatabase/serverless')

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue

    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] == null) process.env[key] = value
  }
}

async function ensureSchema(db) {
  await db`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      password_hash text not null,
      created_at timestamptz not null default now()
    );
  `
}

async function main() {
  loadDotEnvLocal()

  const databaseUrl = process.env.DATABASE_URL
  const email = (process.env.DEFAULT_USER_EMAIL ?? '').trim().toLowerCase()
  const password = process.env.DEFAULT_USER_PASSWORD ?? ''

  if (!databaseUrl) {
    console.error('Missing DATABASE_URL. Add it to .env.local or your environment.')
    process.exit(1)
  }

  if (!email || !password) {
    console.error(
      'Missing DEFAULT_USER_EMAIL or DEFAULT_USER_PASSWORD. Add them to .env.local or your environment.'
    )
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('DEFAULT_USER_PASSWORD must be at least 8 characters.')
    process.exit(1)
  }

  const db = neon(databaseUrl)
  await ensureSchema(db)

  const existing = await db`
    select id, email
    from users
    where email = ${email}
    limit 1
  `

  if (Array.isArray(existing) && existing[0]) {
    console.log(`User already exists: ${existing[0].email}`)
    return
  }

  const hash = await bcrypt.hash(password, 12)

  const inserted = await db`
    insert into users (email, password_hash)
    values (${email}, ${hash})
    returning id, email
  `

  console.log(`Created user: ${inserted[0].email}`)
}

main().catch((err) => {
  console.error('Seed failed', err)
  process.exit(1)
})

