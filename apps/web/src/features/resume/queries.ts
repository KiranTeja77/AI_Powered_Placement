import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resumeApi } from '@/lib/api/resume-api'
import type { AnalysisDetail, AnalyzeInput, SkillEditsInput } from '@/lib/api/resume-types'

export const HISTORY_PAGE_SIZE = 10

/** The role catalogue changes only when the API restarts, so it is fetched once per visit. */
export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: resumeApi.roles, staleTime: Infinity })
}

/** All skills, for the "add a skill" picker. Only fetched when the picker is opened. */
export function useSkillCatalogue(enabled: boolean) {
  return useQuery({
    queryKey: ['skills'],
    queryFn: resumeApi.skills,
    staleTime: Infinity,
    enabled,
  })
}

export function useAnalyses(page: number) {
  return useQuery({
    queryKey: ['analyses', page],
    queryFn: () => resumeApi.analyses(page, HISTORY_PAGE_SIZE),
    placeholderData: keepPreviousData,
  })
}

export function useAnalysis(id: string) {
  return useQuery({ queryKey: ['analysis', id], queryFn: () => resumeApi.analysis(id) })
}

export function useAnalyze() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AnalyzeInput) => resumeApi.analyze(input),
    onSuccess: (detail) => {
      client.setQueryData(['analysis', detail.id], detail)
      void client.invalidateQueries({ queryKey: ['analyses'] })
    },
  })
}

export function useUpdateSkills(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: SkillEditsInput) => resumeApi.updateSkills(id, input),
    onSuccess: (detail: AnalysisDetail) => {
      client.setQueryData(['analysis', id], detail)
      void client.invalidateQueries({ queryKey: ['analyses'] })
    },
  })
}
