'use client'

import { useProjects } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function LibraryPage() {
  const { projects, deleteProject, isLoading } = useProjects()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const projectToDelete = deleteId
    ? projects.find((p) => p.id === deleteId) ?? null
    : null

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
              className="border border-border rounded-lg overflow-hidden hover:border-accent transition-colors group"
            >
              <Link
                href={`/dashboard/results/${project.id}`}
                aria-label={`Open project ${project.name}`}
                className="block focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                  <p className="text-xs text-muted-foreground">
                    {project.generatedImages.length} assets •{' '}
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>

              <div className="px-4 pb-4">
                <div className="flex gap-2">
                  <Link className="flex-1" href={`/dashboard/results/${project.id}`}>
                    <Button size="sm" variant="outline" className="w-full">
                      View
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setDeleteId(project.id)}
                    aria-label={`Delete project ${project.name}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete
                ? `This will permanently delete “${projectToDelete.name}” from this device.`
                : 'This will permanently delete this project from this device.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteId) return
                deleteProject(deleteId)
                setDeleteId(null)
                toast({
                  title: 'Project deleted',
                })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
