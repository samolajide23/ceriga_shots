'use client'

import { useProjects } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LibraryPage() {
  const { projects, deleteProject, isLoading } = useProjects()
  const router = useRouter()

  if (isLoading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Project Library</h1>
          <p className="text-muted-foreground">Manage all your generated campaigns</p>
        </div>
        <Link href="/dashboard/generate">
          <Button>New Project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No projects yet</p>
          <Link href="/dashboard/generate">
            <Button>Create Your First Project</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border border-border rounded-lg overflow-hidden hover:border-accent transition-colors group cursor-pointer"
              onClick={() => router.push(`/dashboard/results/${project.id}`)}
            >
              <div className="relative aspect-square overflow-hidden bg-card">
                <img
                  src={project.originalImage}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate mb-1">{project.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {project.generatedImages.length} assets • {new Date(project.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/dashboard/results/${project.id}`)
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this project?')) {
                        deleteProject(project.id)
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
