'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Check, Pencil, X } from 'lucide-react'
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
  const { getProject, fetchProject, updateProject } = useProjects()
  const project = getProject(projectId)
  const isRunningRef = useRef(false)
  const [moreCount, setMoreCount] = useState<number>(4)
  const [isHydrating, setIsHydrating] = useState(false)
  const [hydrateFailed, setHydrateFailed] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const types = useMemo<Array<'flat-lay' | 'product-shot' | 'detail' | 'lifestyle'>>(
    () => ['flat-lay', 'product-shot', 'detail', 'lifestyle'],
    []
  )

  const formatViewTitle = (t: 'flat-lay' | 'product-shot' | 'detail' | 'lifestyle') => {
    switch (t) {
      case 'flat-lay':
        return 'Flat Lay'
      case 'product-shot':
        return 'Product Shot'
      case 'detail':
        return 'Detail'
      case 'lifestyle':
        return 'Lifestyle'
    }
  }

  useEffect(() => {
    if (project) return
    let cancelled = false
    setIsHydrating(true)
    setHydrateFailed(null)

    fetchProject(projectId)
      .then((p) => {
        if (cancelled) return
        if (!p) setHydrateFailed('Project not found')
      })
      .catch((e) => {
        if (cancelled) return
        setHydrateFailed(e instanceof Error ? e.message : 'Failed to load project')
      })
      .finally(() => {
        if (cancelled) return
        setIsHydrating(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchProject, project, projectId])

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
              // Generate-more should diversify scenes more aggressively than the initial set.
              variationLevel: 3,
              variationSeed: Date.now() + completed * 9973,
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
        <p className="text-muted-foreground">
          {isHydrating ? 'Loading project…' : hydrateFailed ?? 'Project not found'}
        </p>
        <Link href="/dashboard/library">
          <Button className="mt-4">Back to Library</Button>
        </Link>
      </div>
    )
  }

  const startRename = () => {
    setNameDraft(project.name)
    setIsRenaming(true)
  }

  const cancelRename = () => {
    setIsRenaming(false)
    setNameDraft('')
  }

  const saveRename = () => {
    const next = nameDraft.trim()
    if (!next) return
    if (next !== project.name) {
      updateProject(projectId, { name: next })
    }
    setIsRenaming(false)
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
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link href="/dashboard/library">
            <Button variant="outline" className="mb-3">← Back</Button>
          </Link>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="h-10 text-base sm:text-lg font-semibold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename()
                      if (e.key === 'Escape') cancelRename()
                    }}
                    aria-label="Project name"
                  />
                  <Button size="icon" className="shrink-0" onClick={saveRename} aria-label="Save name">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    onClick={cancelRename}
                    aria-label="Cancel rename"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold leading-tight truncate">{project.name}</h1>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={startRename}
                    aria-label="Rename project"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(project.createdAt).toLocaleDateString()}
            <span className="mx-2">•</span>
            {project.generatedImages.length} generated
            {project.generation?.status === 'generating'
              ? ` (${project.generation.completed}/${project.generation.total})`
              : project.generation?.status === 'complete'
                ? ` (${project.generation.total}/${project.generation.total})`
                : ''}
          </p>
          {generationLabel ? (
            <p className="text-sm text-muted-foreground mt-2">{generationLabel}</p>
          ) : null}
          {project.generation?.status === 'error' && project.generation.errorMessage ? (
            <p className="text-sm text-destructive mt-2">{project.generation.errorMessage}</p>
          ) : null}
        </div>

        <div className="flex gap-3 shrink-0">
          <Button>Download All</Button>
          <Button variant="outline">Share</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        {/* Left: sticky sidebar */}
        <aside className="lg:sticky lg:top-6 space-y-6">
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="p-4 border-b border-border">
              <h2 className="text-base font-semibold">Original</h2>
              <p className="text-xs text-muted-foreground mt-1">
                This is the reference image used for all outputs.
              </p>
            </div>
            <div className="p-4">
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={project.originalImage}
                  alt="Original design"
                  className="w-full aspect-square object-cover"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="p-4 border-b border-border">
              <h3 className="text-base font-semibold">Generate more</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Add additional views while keeping the same original.
              </p>
            </div>
            <div className="p-4 flex flex-col gap-3">
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
                  className="flex-1"
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

              <div className="text-xs text-muted-foreground">
                Tip: you can generate dozens of assets; the gallery will keep expanding below.
              </div>
            </div>
          </div>
        </aside>

        {/* Right: responsive gallery */}
        <section className="min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Generated Content</h2>
            <p className="text-xs text-muted-foreground">
              {project.generation?.status === 'generating'
                ? 'Updating live…'
                : project.generatedImages.length
                  ? 'Ready'
                  : 'No outputs yet'}
            </p>
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {project.generatedImages.map((img) => (
              <div
                key={img.id}
                className="rounded-xl overflow-hidden border border-border bg-card hover:border-accent transition-colors"
              >
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.type}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center bg-secondary/50">
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatViewTitle(img.type)}
                    </p>
                  </div>
                )}
                <div className="px-3 py-2 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center capitalize">
                    {img.type.replace('-', ' ')}
                  </p>
                </div>
              </div>
            ))}

            {project.generation?.status === 'generating'
              ? Array.from(
                  { length: Math.max(0, project.generation.total - project.generatedImages.length) },
                  (_, i) => {
                    const isNext = i === 0
                    const label = isNext
                      ? project.generation?.nextType
                        ? formatViewTitle(project.generation.nextType)
                        : 'Generating'
                      : 'Pending'
                    return (
                      <div
                        key={`placeholder-${i}`}
                        className="rounded-xl overflow-hidden border border-border bg-card"
                      >
                        <div className="w-full aspect-square flex items-center justify-center bg-secondary/50">
                          <p className="text-sm font-medium text-muted-foreground">
                            {label}
                          </p>
                        </div>
                        <div className="px-3 py-2 border-t border-border">
                          <p className="text-xs text-muted-foreground text-center">
                            {isNext ? 'Generating…' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    )
                  }
                )
              : null}
          </div>
        </section>
      </div>
    </div>
  )
}
