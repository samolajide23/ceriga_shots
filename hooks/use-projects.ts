import { useProjectsContext } from '@/components/projects-provider'
export type { GeneratedImage, GenerationState, Project } from '@/types/projects'

export function useProjects() {
  // Backed by a provider mounted at the dashboard layout level.
  // This prevents refetching projects on every page navigation.
  return useProjectsContext()
}
