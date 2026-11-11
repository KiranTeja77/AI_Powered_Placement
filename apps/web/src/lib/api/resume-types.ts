import type { components } from './schema'

type Schemas = components['schemas']

/** Springdoc marks every response field optional; these are the shapes the API really returns. */
type Strict<T> = T extends (infer U)[]
  ? Strict<U>[]
  : T extends object
    ? { [K in keyof T]-?: Strict<NonNullable<T[K]>> }
    : T

export type Importance = 'core' | 'important' | 'bonus'
export type SkillGrade = 'applied' | 'listed'
export type SkillStatus = 'detected' | 'possible'
export type GapStatus = 'matched' | 'partial' | 'possible' | 'missing'
export type Priority = 'high' | 'medium' | 'low'

export type Evidence = Strict<Schemas['AnalysisEvidence']>
export type RoleReadiness = Strict<Schemas['RoleReadiness']>
export type Suggestion = Strict<Schemas['AnalysisSuggestion']>
export type EffectiveSkill = Strict<Schemas['EffectiveSkill']>
export type TargetRole = Strict<Schemas['TargetRole']>
export type SkillEdits = Strict<Schemas['SkillEdits']>

export type ResumeSkill = Omit<Strict<Schemas['AnalysisSkill']>, 'similarity' | 'evidence'> & {
  evidence: Evidence[]
  /** How close the text was to the skill name (0 to 100), for possible matches only. */
  similarity: number | null
}

export type ResumeResult = Omit<
  Strict<Schemas['AnalysisResult']>,
  'skills' | 'sections' | 'fields'
> & {
  skills: ResumeSkill[]
  sections: { name: string; heading: string | null; start: number; end: number }[]
  fields: Omit<Strict<Schemas['AnalysisFields']>, 'cgpa'> & {
    cgpa: Strict<Schemas['AnalysisCgpa']> | null
  }
}

export type AnalysisDetail = Omit<Strict<Schemas['AnalysisDetail']>, 'result' | 'edits'> & {
  result: ResumeResult
  /** Null until the student confirms, removes or adds a skill. */
  edits: SkillEdits | null
}

export type AnalysisSummary = Omit<Strict<Schemas['AnalysisSummary']>, 'topRole' | 'topScore'> & {
  topRole: TargetRole | null
  topScore: number | null
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export type RoleSkill = Strict<Schemas['RoleSkillResponse']>
export type RoleDefinition = Strict<Schemas['RoleResponse']>
export type SkillDefinition = Strict<Schemas['SkillResponse']>

/** The role slugs a student has marked as interests. */
export interface CareerInterests {
  roleSlugs: string[]
}

export interface AnalyzeInput {
  text: string
  targetRoles: string[]
}

export interface SkillEditsInput {
  confirmedSkillIds: string[]
  removedSkillIds: string[]
  addedSkillIds: string[]
}

export const MIN_TEXT = 200
export const MAX_TEXT = 20_000
export const MAX_ROLES = 14
