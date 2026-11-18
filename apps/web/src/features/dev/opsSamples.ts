/**
 * Labelled sample content for laying out the permission matrix and the recruiter's candidate
 * table in the component catalogue. It is imported only by the development catalogue.
 */
import type { PermissionMatrix, RecruiterCandidate } from '@/lib/api/ops-types'

export const SAMPLE_MATRIX: PermissionMatrix = {
  roles: [
    { id: 'student', label: 'Student' },
    { id: 'faculty', label: 'Faculty' },
    { id: 'tp', label: 'T&P head' },
    { id: 'recruiter', label: 'Recruiter' },
    { id: 'admin', label: 'Admin' },
  ],
  permissions: [
    { id: 'p1', label: 'Take assessments', group: 'Assessments' },
    { id: 'p2', label: 'Create questions', group: 'Assessments' },
    { id: 'p3', label: 'Review proctoring alerts', group: 'Assessments' },
    { id: 'p4', label: 'Create drives', group: 'Recruitment' },
    { id: 'p5', label: 'Approve shortlists', group: 'Recruitment' },
    { id: 'p6', label: 'View approved candidates', group: 'Recruitment' },
    { id: 'p7', label: 'Manage users', group: 'Administration' },
  ],
  grants: {
    p1: ['student'],
    p2: ['faculty', 'admin'],
    p3: ['faculty', 'tp', 'admin'],
    p4: ['tp', 'admin'],
    p5: ['tp'],
    p6: ['recruiter'],
    p7: ['admin'],
  },
}

export const SAMPLE_CANDIDATES: RecruiterCandidate[] = [
  {
    id: 'c1',
    name: 'Sample Student A',
    department: 'CSE',
    cgpa: 8.4,
    keySkills: ['Java', 'SQL', 'Spring Boot', 'Docker'],
    stage: 'Online test',
  },
  {
    id: 'c2',
    name: 'Sample Student B',
    department: 'IT',
    cgpa: 7.9,
    keySkills: ['Python', 'SQL'],
    stage: 'Interview',
  },
  {
    id: 'c3',
    name: 'Sample Student C',
    department: 'ECE',
    cgpa: null,
    keySkills: ['C++', 'Embedded C', 'Verilog'],
    stage: 'Online test',
  },
]

export const SAMPLE_STAGES = ['Online test', 'Interview', 'HR round', 'Offer']
