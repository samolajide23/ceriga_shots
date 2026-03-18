import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createProjectForUser, getProjectsForUser } from '@/lib/projects'
import type { Project } from '@/hooks/use-projects'
import { isDatabaseConfigured } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      projects: [],
      warning: 'Database is not configured (missing DATABASE_URL).',
    })
  }

  try {
    const projects = await getProjectsForUser(session.user.id)
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('GET /api/projects error', error)
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured (missing DATABASE_URL).' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const input = body as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>

  if (!input.name || !input.originalImage || !input.originalImageName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const project = await createProjectForUser(session.user.id, {
      ...input,
      generatedImages: input.generatedImages ?? [],
    })
    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('POST /api/projects error', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

