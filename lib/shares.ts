import { db, ensureSchema } from '@/lib/db'
import type { Project } from '@/hooks/use-projects'

type SharedProjectRow = {
  token: string
  project_id: string
  owner_id: string
  created_at: string
  id: string
  name: string
  original_image: string
  original_image_name: string
  generated_images: unknown
  generation: unknown | null
  updated_at: string
}

function mapProject(row: Pick<SharedProjectRow, 'id' | 'name' | 'original_image' | 'original_image_name' | 'generated_images' | 'generation' | 'created_at' | 'updated_at'>): Project {
  return {
    id: row.id,
    name: row.name,
    originalImage: row.original_image,
    originalImageName: row.original_image_name,
    generatedImages: (row.generated_images as Project['generatedImages']) ?? [],
    generation: (row.generation as Project['generation']) ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

export async function createShareForProject(ownerId: string, projectId: string): Promise<string> {
  await ensureSchema()
  const rows = (await db`
    insert into project_shares (project_id, owner_id)
    values (${projectId}::uuid, ${ownerId})
    returning token
  `) as Array<{ token: string }>
  return rows[0]!.token
}

export async function getProjectForShareToken(token: string): Promise<Project | null> {
  await ensureSchema()
  const rows = (await db`
    select
      s.token,
      s.project_id,
      s.owner_id,
      s.created_at,
      p.id,
      p.name,
      p.original_image,
      p.original_image_name,
      p.generated_images,
      p.generation,
      p.created_at,
      p.updated_at
    from project_shares s
    join projects p on p.id = s.project_id
    where s.token = ${token}::uuid
    limit 1
  `) as SharedProjectRow[]

  return rows[0] ? mapProject(rows[0]) : null
}

