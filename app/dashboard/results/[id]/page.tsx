'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ResultsPage() {
  const params = useParams()
  const projectId = params.id as string
  const { getProject, updateProject } = useProjects()
  const project = getProject(projectId)
  const isRunningRef = useRef(false)
  const [moreCount, setMoreCount] = useState<number>(4)

  const types = useMemo<Array<'flat-lay' | 'product-shot' | 'detail' | 'lifestyle'>>(
    () => ['flat-lay', 'product-shot', 'detail', 'lifestyle'],
    []
  )

  useEffect(() => {
    if (!project) return
    const shouldGenerate =
      project.generation?.status === 'generating' &&
      project.generation.completed < project.generation.total

    if (!shouldGenerate || isRunningRef.current) return

    isRunningRef.current = true

    const run = async () => {
      const total = project.generation?.total ?? 0
      let completed = project.generation?.completed ?? project.generatedImages.length
      const images = [...project.generatedImages]

      console.info('[results] generation start', { projectId, total, completed })

      while (completed < total) {
        const nextType = types[completed % types.length]
        updateProject(projectId, {
          generation: {
            status: 'generating',
            total,
            completed,
            nextType,
          },
        })

        const startedAt = performance.now()
        console.info(`[results] generating ${completed + 1}/${total}`, { nextType })

        try {
          const res = await fetch('/api/mockups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageDataUrl: project.originalImage,
              type: nextType,
              attempts: 2,
            }),
          })

          const data = (await res.json()) as
            | {
                generatedImage: {
                  id: string
                  type: 'flat-lay' | 'product-shot' | 'lifestyle' | 'detail'
                  url: string
                  timestamp: number
                }
              }
            | { error: string }

          if (!res.ok || 'error' in data) {
            const message = 'error' in data ? data.error : 'Please try again.'
            console.error('[results] generation failed', {
              status: res.status,
              message,
              ms: Math.round(performance.now() - startedAt),
            })
            updateProject(projectId, {
              generation: {
                status: 'error',
                total,
                completed,
                nextType,
                errorMessage: message,
              },
            })
            return
          }

          images.push(data.generatedImage)
          updateProject(projectId, {
            generatedImages: images,
            generation: {
              status: 'generating',
              total,
              completed: completed + 1,
            },
          })
          completed += 1
          console.info(`[results] done ${completed}/${total}`, {
            ms: Math.round(performance.now() - startedAt),
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error'
          console.error('[results] generation error', { message })
          updateProject(projectId, {
            generation: {
              status: 'error',
              total,
              completed,
              nextType,
              errorMessage: message,
            },
          })
          return
        }
      }

      updateProject(projectId, {
        generation: {
          status: 'complete',
          total,
          completed: total,
        },
      })
      console.info('[results] generation complete', { projectId, total })
    }

    run().finally(() => {
      isRunningRef.current = false
    })
  }, [
    project?.generation?.status,
    project?.generation?.completed,
    project?.generation?.total,
    project?.generatedImages,
    project?.originalImage,
    projectId,
    types,
    updateProject,
  ])

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

  const generationLabel = project.generation
    ? project.generation.status === 'generating'
      ? `Generating ${project.generation.completed}/${project.generation.total}${
          project.generation.nextType ? ` • Next: ${project.generation.nextType}` : ''
        }`
      : project.generation.status === 'complete'
        ? `Complete • ${project.generation.completed}/${project.generation.total}`
        : project.generation.status === 'error'
          ? `Error • ${project.generation.completed}/${project.generation.total}`
          : ''
    : ''

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
        {generationLabel ? (
          <p className="text-sm text-muted-foreground mt-2">{generationLabel}</p>
        ) : null}
        {project.generation?.status === 'error' && project.generation.errorMessage ? (
          <p className="text-sm text-destructive mt-2">{project.generation.errorMessage}</p>
        ) : null}
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
            {project.generation?.status === 'generating'
              ? Array.from(
                  { length: Math.max(0, project.generation.total - project.generatedImages.length) },
                  (_, i) => (
                    <div
                      key={`placeholder-${i}`}
                      className="rounded-lg overflow-hidden border border-border bg-secondary/50"
                    >
                      <div className="w-full aspect-square flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">
                          {i === 0 ? 'Generating…' : 'Pending'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground p-2 bg-card text-center">
                        {i === 0
                          ? project.generation?.nextType
                            ? `Generating ${project.generation.nextType.replace('-', ' ')}`
                            : 'Generating'
                          : 'Pending'}
                      </p>
                    </div>
                  )
                )
              : null}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button>Download All</Button>
        <Button variant="outline">Share</Button>
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Generate more</h3>
            <p className="text-sm text-muted-foreground">
              Create additional mockups for this same product photo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={String(moreCount)} onValueChange={(v) => setMoreCount(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">+1 image</SelectItem>
                <SelectItem value="4">+4 images</SelectItem>
                <SelectItem value="8">+8 images</SelectItem>
              </SelectContent>
            </Select>

            <Button
              disabled={project.generation?.status === 'generating'}
              onClick={() => {
                const totalNow =
                  typeof project.generation?.total === 'number'
                    ? project.generation.total
                    : project.generatedImages.length
                const newTotal = totalNow + moreCount
                const completed = project.generatedImages.length
                const nextType = types[completed % types.length]

                updateProject(projectId, {
                  generation: {
                    status: 'generating',
                    total: newTotal,
                    completed,
                    nextType,
                  },
                })
              }}
            >
              {project.generation?.status === 'generating' ? 'Generating…' : 'Generate more'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
