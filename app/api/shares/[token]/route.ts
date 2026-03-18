import { NextResponse } from 'next/server'
import { isDatabaseConfigured } from '@/lib/db'
import { getProjectForShareToken } from '@/lib/shares'

export const runtime = 'nodejs'

export async function GET(_req: Request) {
  const url = new URL(_req.url)
  const token = url.pathname.split('/').pop() as string

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured (missing DATABASE_URL).' },
      { status: 503 }
    )
  }

  const project = await getProjectForShareToken(token)
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      originalImage: project.originalImage,
      originalImageName: project.originalImageName,
      generatedImages: project.generatedImages,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  })
}

