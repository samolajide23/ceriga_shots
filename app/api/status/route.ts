import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isDatabaseConfigured } from '@/lib/db'

export const runtime = 'nodejs'

function hasGeminiKey() {
  return Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)
}

function hasGoogleAuth() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
}

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function isAdminEmail(email: string | undefined | null) {
  if (!email) return false
  const admins = parseAdminEmails()
  if (!admins.length) return false
  return admins.includes(email.trim().toLowerCase())
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? null

  if (!isAdminEmail(email)) {
    // Hide existence/details from non-admins.
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    database: {
      configured: isDatabaseConfigured(),
    },
    gemini: {
      configured: hasGeminiKey(),
    },
    auth: {
      googleConfigured: hasGoogleAuth(),
      secretConfigured: Boolean(process.env.AUTH_SECRET),
    },
  })
}

