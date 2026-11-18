/**
 * Shapes the admin, recruiter and notification screens expect from the API once it exists.
 * Nothing here is data: the screens get empty results from the hooks in `pending.ts`.
 */

export interface AuditEntry {
  id: string
  at: string
  userName: string
  action: string
  target: string
  ip: string
}

export interface Permission {
  id: string
  label: string
  /** Heading the permission is listed under. */
  group: string
  /** Open to everyone, to any signed-in account, or only to the roles that hold it. */
  access: 'public' | 'signed_in' | 'roles'
  /** The API paths the rule covers, with the method where it is limited to one. */
  endpoints: string[]
}

export interface PermissionMatrix {
  roles: { id: string; label: string }[]
  permissions: Permission[]
  /** For each permission id, the ids of the roles that hold it. */
  grants: Record<string, string[]>
}

export interface RecruiterDriveRow {
  id: string
  company: string
  role: string
  driveDate: string
  approvedCount: number
}

export interface RecruiterDrive {
  id: string
  company: string
  role: string
  driveDate: string
  /** The stages candidates can be moved to, in order. */
  stages: string[]
}

export interface RecruiterCandidate {
  id: string
  name: string
  department: string
  cgpa: number | null
  keySkills: string[]
  stage: string
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  /** Where the notification leads, if anywhere. */
  to: string | null
}
