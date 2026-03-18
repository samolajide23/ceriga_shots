import { useState, useEffect, useCallback } from 'react'

export interface GeneratedImage {
  id: string
  type: 'flat-lay' | 'product-shot' | 'lifestyle' | 'detail'
  url: string
  timestamp: number
}

export interface GenerationState {
  status: 'idle' | 'generating' | 'complete' | 'error'
  total: number
  completed: number
  nextType?: GeneratedImage['type']
  errorMessage?: string
}

export interface Project {
  id: string
  name: string
  originalImage: string
  originalImageName: string
  generatedImages: GeneratedImage[]
  generation?: GenerationState
  createdAt: number
  updatedAt: number
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const upsertProject = useCallback((project: Project) => {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === project.id)
      if (idx === -1) return [project, ...prev]
      const next = [...prev]
      next[idx] = project
      return next
    })
  }, [])

  // Load projects for the current user from the API on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/projects', { method: 'GET' })
        if (!res.ok) {
          throw new Error(`Failed to load projects: ${res.status}`)
        }
        const data = (await res.json()) as { projects: Project[] }
        if (!cancelled) {
          setProjects(data.projects ?? [])
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const addProject = useCallback(
    async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
      const now = Date.now()
      const optimistic: Project = {
        ...project,
        id: `temp-${now}`,
        createdAt: now,
        updatedAt: now,
      }
      setProjects((prev) => [optimistic, ...prev])

      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project),
        })

        if (!res.ok) {
          throw new Error(`Failed to create project: ${res.status}`)
        }
        const data = (await res.json()) as { project: Project }
        setProjects((prev) => prev.map((p) => (p.id === optimistic.id ? data.project : p)))
        return data.project
      } catch (error) {
        console.error('Failed to create project:', error)
        setProjects((prev) => prev.filter((p) => p.id !== optimistic.id))
        throw error
      }
    },
    []
  )

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      )
    )

    ;(async () => {
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        if (!res.ok) {
          throw new Error(`Failed to update project: ${res.status}`)
        }
        const data = (await res.json()) as { project: Project }
        setProjects(prev =>
          prev.map(p => (p.id === id ? data.project : p))
        )
      } catch (error) {
        console.error('Failed to update project:', error)
      }
    })()
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))

    ;(async () => {
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          throw new Error(`Failed to delete project: ${res.status}`)
        }
      } catch (error) {
        console.error('Failed to delete project:', error)
      }
    })()
  }, [])

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id)
  }, [projects])

  const fetchProject = useCallback(
    async (id: string): Promise<Project | null> => {
      try {
        const res = await fetch(`/api/projects/${id}`, { method: 'GET' })
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`Failed to load project: ${res.status}`)
        const data = (await res.json()) as { project: Project }
        if (data.project) upsertProject(data.project)
        return data.project ?? null
      } catch (error) {
        console.error('Failed to load project:', error)
        throw error
      }
    },
    [upsertProject]
  )

  return {
    projects,
    isLoading,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    fetchProject,
  }
}
