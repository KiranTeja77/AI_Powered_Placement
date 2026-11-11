import { apiRequest } from './client'
import type {
  AnalysisDetail,
  AnalysisSummary,
  AnalyzeInput,
  CareerInterests,
  Page,
  RoleDefinition,
  SkillDefinition,
  SkillEditsInput,
} from './resume-types'

export const resumeApi = {
  roles: () => apiRequest<RoleDefinition[]>('/roles'),
  skills: () => apiRequest<SkillDefinition[]>('/skills'),
  analyze: (body: AnalyzeInput) =>
    apiRequest<AnalysisDetail>('/resumes/analyze', { method: 'POST', body }),
  analyses: (page: number, size: number) =>
    apiRequest<Page<AnalysisSummary>>(`/resumes/analyses?page=${page}&size=${size}`),
  analysis: (id: string) => apiRequest<AnalysisDetail>(`/resumes/analyses/${id}`),
  updateSkills: (id: string, body: SkillEditsInput) =>
    apiRequest<AnalysisDetail>(`/resumes/analyses/${id}/skills`, { method: 'PATCH', body }),
  deleteAnalysis: (id: string) => apiRequest<void>(`/resumes/analyses/${id}`, { method: 'DELETE' }),
  careerInterests: () => apiRequest<CareerInterests>('/me/career-interests'),
  saveCareerInterests: (roleSlugs: string[]) =>
    apiRequest<CareerInterests>('/me/career-interests', { method: 'PUT', body: { roleSlugs } }),
}
