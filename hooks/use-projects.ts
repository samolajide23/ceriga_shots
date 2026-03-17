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

const LEGACY_STORAGE_KEY = 'ceriga_projects'

// IndexedDB storage (to avoid localStorage quota limits for base64 image data).
const DB_NAME = 'ceriga_shots'
const DB_VERSION = 1
const STORE_NAME = 'kv'
const PROJECTS_KEY = 'projects'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'))
  })
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'))
  })
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(value as unknown, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('IndexedDB set failed'))
  })
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load projects from IndexedDB on mount (migrating from localStorage if needed)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await idbGet<Project[]>(PROJECTS_KEY)
        if (!cancelled && stored) {
          setProjects(stored)
          return
        }

        // One-time legacy migration (best effort).
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (legacy) {
          const parsed = JSON.parse(legacy) as Project[]
          await idbSet(PROJECTS_KEY, parsed)
          localStorage.removeItem(LEGACY_STORAGE_KEY)
          if (!cancelled) setProjects(parsed)
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

  // Save projects to IndexedDB whenever they change
  useEffect(() => {
    if (!isLoading) {
      ;(async () => {
        try {
          await idbSet(PROJECTS_KEY, projects)
        } catch (error) {
          console.error('Failed to save projects:', error)
        }
      })()
    }
  }, [projects, isLoading])

  const addProject = useCallback((project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProject: Project = {
      ...project,
      id: `project-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setProjects(prev => [newProject, ...prev])
    return newProject
  }, [])

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      )
    )
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [])

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id)
  }, [projects])

  return {
    projects,
    isLoading,
    addProject,
    updateProject,
    deleteProject,
    getProject,
  }
}
