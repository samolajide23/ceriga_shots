'use client'

import { useParams } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ResultsPage() {
  const params = useParams()
  const projectId = params.id as string
  const { getProject } = useProjects()
  const project = getProject(projectId)

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/dashboard/library">
          <Button className="mt-4">Back to Library</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/dashboard/library">
          <Button variant="outline" className="mb-4">← Back</Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
        <p className="text-muted-foreground">
          {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Original Design</h2>
          <div className="rounded-lg overflow-hidden border border-border">
            <img
              src={project.originalImage}
              alt="Original design"
              className="w-full aspect-square object-cover"
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Generated Content</h2>
          <div className="grid grid-cols-2 gap-4">
            {project.generatedImages.map((img) => (
              <div
                key={img.id}
                className="rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
              >
                <img
                  src={img.url}
                  alt={img.type}
                  className="w-full aspect-square object-cover"
                />
                <p className="text-xs text-muted-foreground p-2 bg-card text-center capitalize">
                  {img.type.replace('-', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button>Download All</Button>
        <Button variant="outline">Share</Button>
      </div>
    </div>
  )
}
