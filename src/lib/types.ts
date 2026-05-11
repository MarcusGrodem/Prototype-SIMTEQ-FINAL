// Database types matching the Supabase schema

export interface Profile {
  id: string
  full_name: string
  role: string
  email: string | null
  department: string | null
  created_at: string
  updated_at: string
}

export interface RoleOption {
  key: string
  label: string
  description: string | null
  created_at: string
}

export interface Risk {
  id: string
  title: string
  category: string
  likelihood: 'Low' | 'Medium' | 'High'
  impact: 'Low' | 'Medium' | 'High'
  risk_score: number
  owner_name: string
  status: 'Active' | 'Mitigated' | 'Monitoring'
  last_review: string | null
  created_at: string
  updated_at: string
  // Joined
  risk_controls?: { control_id: string }[]
}

export interface Control {
  id: string
  title: string
  category: string
  frequency: 'Monthly' | 'Quarterly' | 'Yearly'
  owner_name: string
  status: 'Completed' | 'Pending' | 'Overdue'
  last_execution: string | null
  next_due: string | null
  description: string | null
  control_objective_id: string | null
  created_at: string
  updated_at: string
}

export interface ControlObjective {
  id: string
  title: string
  description: string | null
  risk_area: string | null
  evidence_requirement: string | null
  in_scope: boolean
  created_at: string
  updated_at: string
}

export interface RiskControl {
  risk_id: string
  control_id: string
}

export interface Document {
  id: string
  name: string
  file_type: string | null
  uploaded_by_name: string
  file_path: string | null
  file_size: number | null
  current_version: number
  reviewer_status: 'pending' | 'approved' | 'rejected'
  reviewer_comment: string | null
  reviewed_by_name: string | null
  reviewed_date: string | null
  created_at: string
  updated_at: string
  // Joined
  document_links?: DocumentLink[]
}

export interface DocumentVersion {
  id: string
  document_id: string
  version: number
  file_path: string | null
  file_size: number | null
  changelog: string
  uploaded_by_name: string
  created_at: string
}

export interface DocumentLink {
  id: string
  document_id: string
  link_type: 'risk' | 'control'
  link_id: string
  execution_id: string | null
  created_at: string
}

export interface ComplianceEvent {
  id: string
  title: string
  type: 'control' | 'audit' | 'review'
  date: string
  owner_name: string
  status: 'Completed' | 'Upcoming' | 'Overdue'
  created_at: string
}

export interface Alert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  date: string | null
  related_to: string | null
  created_at: string
}

export interface Reminder {
  id: string
  user_id: string
  email: string
  days_before: number
  email_enabled: boolean
  created_at: string
}

export interface ChangeLog {
  id: string
  title: string
  description: string | null
  change_type: 'Release' | 'Configuration' | 'Access' | 'Code' | 'Infrastructure'
  environment: 'Production' | 'Staging' | 'Development' | null
  author_name: string
  approved_by_name: string | null
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Deployed' | 'Rejected'
  related_risk_id: string | null
  related_control_id: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  owner_name: string
  created_at: string
}

export interface ReleaseChange {
  id: string
  release_id: string
  change_type: 'Feature' | 'Bug Fix' | 'Security' | 'Breaking Change' | 'Performance' | 'Other'
  description: string
  created_at: string
}

export interface Release {
  id: string
  version: string
  title: string
  description: string | null
  environment: 'Production' | 'Staging' | 'Development'
  status: 'Planned' | 'In Progress' | 'Released' | 'Rolled Back'
  released_by_name: string | null
  approved_by_name: string | null
  approved_at: string | null
  product_name: string | null
  release_date: string | null
  created_at: string
  updated_at: string
  changes?: ReleaseChange[]
}

export interface RiskCategory {
  id: string
  name: string
  color: string
  description: string | null
  created_at: string
}

export interface ReportTemplate {
  id: string
  name: string
  company_name: string
  period_start: string
  period_end: string
  include_front_page?: boolean
  cover_image_data_url?: string | null
  cover_image_name?: string | null
  cover_image_caption?: string | null
  cover_image_width_mm?: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface ReportTemplateSection {
  id: string
  template_id: string
  section_key: string
  title: string
  body: string
  position: number
  visible: boolean
  page_break_before?: boolean
}

export interface NotificationLogEntry {
  id: string
  kind: string
  recipient_email: string
  subject: string
  body: string | null
  related_type: string | null
  related_id: string | null
  status: string
  created_at: string
}

export type ImportRunStatus = 'running' | 'completed' | 'completed_with_errors' | 'failed'
export type ImportRunRowStatus = 'success' | 'failed'

export interface ImportRun {
  id: string
  target: string
  file_name: string | null
  source_type: string
  source_checksum: string | null
  source_file_size: number | null
  row_count: number
  success_count: number
  failure_count: number
  status: ImportRunStatus
  imported_by_name: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface ImportRowTransformRecord {
  field: string
  original: string
  normalized: string
  reason: string
}

export interface ImportRunRow {
  id: string
  import_run_id: string
  row_number: number
  status: ImportRunRowStatus
  source_data: Record<string, unknown>
  payload: Record<string, unknown>
  transforms: ImportRowTransformRecord[]
  error_message: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  source: string
  context: Record<string, unknown> | null
  created_at: string
}

export interface AuditPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  freeze_date: string | null
  report_due_date: string | null
  status: 'planned' | 'active' | 'closed' | 'archived'
  auditor: string | null
  frozen_at: string | null
  frozen_by_name: string | null
  created_at: string
  updated_at: string
}

export interface ManagementAssertion {
  id: string
  audit_period_id: string
  signer_name: string
  signed_date: string
  acknowledgement: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type KpiSnapshotRagStatus = 'green' | 'amber' | 'red' | 'neutral'

export interface KpiSnapshot {
  id: string
  audit_period_id: string
  snapshot_date: string
  kpi_name: string
  value: number | null
  target: number | null
  rag_status: KpiSnapshotRagStatus
  created_at: string
}

export interface ControlExecution {
  id: string
  control_id: string
  audit_period_id: string
  scheduled_due_date: string
  performed_date: string | null
  performed_by_name: string | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'failed' | 'not_applicable'
  reviewer_status: 'pending' | 'approved' | 'rejected'
  reviewed_by_name: string | null
  reviewed_date: string | null
  comments: string | null
  created_at: string
  updated_at: string
}

export interface Deviation {
  id: string
  control_id: string
  execution_id: string | null
  audit_period_id: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'missing_evidence' | 'late_execution' | 'failed_control' | 'incomplete_approval' | 'other'
  description: string
  detected_date: string
  root_cause: string | null
  audit_impact: string | null
  status: 'open' | 'under_remediation' | 'retesting' | 'closed' | 'risk_accepted'
  owner_name: string | null
  created_at: string
  updated_at: string
}

export interface RemediationAction {
  id: string
  deviation_id: string
  action_description: string
  owner_name: string | null
  due_date: string | null
  closed_date: string | null
  closure_evidence: string | null
  retest_required: boolean
  retest_result: 'passed' | 'failed' | 'not_tested' | null
  status: 'open' | 'closed' | 'overdue'
  created_at: string
  updated_at: string
}

export interface AuditorRequest {
  id: string
  audit_period_id: string
  auditor: string | null
  request_text: string
  related_control: string | null
  owner_name: string | null
  due_date: string | null
  status: 'open' | 'answered' | 'accepted' | 'closed'
  response: string | null
  submitted_date: string
  created_at: string
  updated_at: string
}

export interface Policy {
  id: string
  title: string
  category: string
  description: string | null
  version: string
  status: 'Active' | 'Draft' | 'Under Review' | 'Archived'
  owner_name: string
  last_reviewed: string | null
  next_review: string | null
  related_control_id: string | null
  created_at: string
  updated_at: string
}
