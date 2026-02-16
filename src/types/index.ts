export interface Address {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

export interface Patient {
  id: string
  assigningAuthority?: string
  lastName: string
  firstName: string
  birthDate: string
  sex: string
  phone?: string
  address?: Address
}

export interface MessageHeader {
  sendingApp: string
  sendingFacility: string
  messageDateTime: string
  messageType: {
    id: string
    trigger: string
  }
  controlId: string
  processingId: string
  version: string
  charset?: string
}

export interface OrderingProvider {
  id?: string
  last?: string
  first?: string
  authority?: string
}

export interface Order {
  placerOrderNumber?: string
  fillerOrderNumber?: string
  orderControl: string
  orderDateTime?: string
  orderingProvider?: OrderingProvider
}

export interface ObservationRequest {
  panelCode: string
  panelText?: string
  obrDateTime?: string
  resultDateTime?: string
  orderingProvider?: OrderingProvider
}

export type MaraStatus =
  | 'normal'
  | 'below_idealrange'
  | 'above_idealrange'
  | 'below_refrange'
  | 'above_refrange'
  | ''

export interface Observation {
  setId: number
  valueType: string
  code: string
  text: string
  system?: string
  value: string
  units?: string
  refRange?: string
  abnormalFlags?: string
  status: string
  observationDateTime?: string
  specimenCollectionTime?: string
  notes: string[]
  mara_status: MaraStatus
  mara_range?: string
}

export interface NoteSegment {
  setId: number
  text: string
}

export interface ParsedHL7 {
  messageHeader: MessageHeader | null
  patient: Patient | null
  orders: Order[]
  observationRequests: ObservationRequest[]
  observations: Observation[]
  notes: NoteSegment[]
  messageType: string
  totalSegments: number
}

export interface ReferenceTableEntry {
  parameter: string
  ideal_range: string
}

export interface PatientContext {
  medicalFormData?: string
}

export interface ParsedRange {
  min: number
  max: number
  type: 'range' | 'greater_than' | 'less_than'
}

export interface CortisolRange {
  optimalMin: number
  optimalMax: number
  standardMin: number
  standardMax: number
  timeUsed: number
  capped: string | false
}

// Gemini API types
export interface GeminiReportPanel {
  name: string
  biomarkers: GeminiReportBiomarker[]
}

export type HairStatus = 'optimal' | 'suboptimal' | 'concern' | 'not_relevant' | ''

export interface GeminiReportBiomarker {
  code: string
  name: string
  value: string
  units: string
  refRange: string
  status: 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high'
  hairStatus: HairStatus
  interpretation: string
}

export interface GeminiReport {
  medicalRecordAnalysis: string
  generalHealth: string
  hairSummary: string
  etiologyAssessment: string
  regenerativeIndication: string
  panels: GeminiReportPanel[]
  actionPlan: string[]
}

// Auth types
export interface AuthState {
  isSignedIn: boolean
  accessToken: string | null
  email: string | null
  name: string | null
  expiresAt: number | null
}

// App state
export type AppView = 'input' | 'analyzing' | 'report'
