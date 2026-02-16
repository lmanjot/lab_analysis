import {
  ParsedHL7,
  MessageHeader,
  Patient,
  Order,
  ObservationRequest,
  Observation,
  NoteSegment,
} from '../types'
import { fixGermanEncoding } from './encoding'
import { extractHourFromDateTime, getCortisolRangeForTime } from './cortisol'
import { determineMaraStatus } from './referenceTable'

function getField(parts: string[], index: number): string {
  return parts[index] || ''
}

function getSubfield(field: string, index: number): string {
  if (!field) return ''
  const subfields = field.split('^')
  return subfields[index] || ''
}

function formatDate(hl7Date: string): string {
  if (!hl7Date || hl7Date.length !== 8) return hl7Date
  return `${hl7Date.substring(0, 4)}-${hl7Date.substring(4, 6)}-${hl7Date.substring(6, 8)}`
}

function formatDateTime(hl7DateTime: string): string {
  if (!hl7DateTime || hl7DateTime.length < 8) return hl7DateTime
  const date = hl7DateTime.substring(0, 8)
  const time = hl7DateTime.substring(8)
  if (time.length >= 6) {
    return `${formatDate(date)}T${time.substring(0, 2)}:${time.substring(2, 4)}:${time.substring(4, 6)}`
  }
  return formatDate(date)
}

function parseMessageHeader(parts: string[]): MessageHeader {
  const messageTypeField = getField(parts, 9)
  const messageTypeParts = messageTypeField.split('^')

  return {
    sendingApp: getField(parts, 3),
    sendingFacility: getField(parts, 4),
    messageDateTime: formatDateTime(getField(parts, 7)),
    messageType: {
      id: messageTypeParts[0] || '',
      trigger: messageTypeParts[1] || '',
    },
    controlId: getField(parts, 10),
    processingId: getField(parts, 11),
    version: getField(parts, 12),
    charset: getField(parts, 18) || undefined,
  }
}

function parsePatient(parts: string[]): Patient {
  const idField = getField(parts, 2)
  const internalIdField = getField(parts, 3)
  const nameField = getField(parts, 5)
  const addressField = getField(parts, 11)

  const patient: Patient = {
    id: idField,
    assigningAuthority: getSubfield(internalIdField, 5) || undefined,
    lastName: getSubfield(nameField, 0),
    firstName: getSubfield(nameField, 1),
    birthDate: formatDate(getField(parts, 7)),
    sex: getField(parts, 8),
    phone: getField(parts, 13) || undefined,
  }

  if (addressField) {
    patient.address = {
      street: getSubfield(addressField, 0) || undefined,
      city: getSubfield(addressField, 2) || undefined,
      state: getSubfield(addressField, 3) || undefined,
      zip: getSubfield(addressField, 4) || undefined,
      country: getSubfield(addressField, 5) || undefined,
    }
  }

  return patient
}

function parseOrder(parts: string[]): Order {
  const orderingProviderField = getField(parts, 12)
  const orderDateTimeField = getField(parts, 7)

  const order: Order = {
    placerOrderNumber: getSubfield(getField(parts, 2), 0) || undefined,
    fillerOrderNumber: getSubfield(getField(parts, 3), 0) || undefined,
    orderControl: getField(parts, 1),
    orderDateTime: getSubfield(orderDateTimeField, 3)
      ? formatDateTime(getSubfield(orderDateTimeField, 3))
      : undefined,
  }

  if (orderingProviderField) {
    order.orderingProvider = {
      id: getSubfield(orderingProviderField, 0) || undefined,
      last: getSubfield(orderingProviderField, 1) || undefined,
      first: getSubfield(orderingProviderField, 2) || undefined,
      authority: getSubfield(orderingProviderField, 7) || undefined,
    }
  }

  return order
}

function parseObservationRequest(parts: string[]): ObservationRequest {
  const panelField = getField(parts, 4)
  const orderingProviderField = getField(parts, 16)
  const resultDateTimeField = getField(parts, 27)

  const obr: ObservationRequest = {
    panelCode: getSubfield(panelField, 0),
    panelText: getSubfield(panelField, 1) || undefined,
    obrDateTime: formatDateTime(getField(parts, 7)) || undefined,
    resultDateTime: getSubfield(resultDateTimeField, 3)
      ? formatDateTime(getSubfield(resultDateTimeField, 3))
      : undefined,
  }

  if (orderingProviderField) {
    obr.orderingProvider = {
      id: getSubfield(orderingProviderField, 0) || undefined,
      last: getSubfield(orderingProviderField, 1) || undefined,
      first: getSubfield(orderingProviderField, 2) || undefined,
      authority: getSubfield(orderingProviderField, 7) || undefined,
    }
  }

  return obr
}

function parseObservation(parts: string[], specimenCollectionTime: string | undefined): Observation {
  const codeField = getField(parts, 3)
  const unitsField = getField(parts, 6)

  let code = getSubfield(codeField, 0)
  let text = fixGermanEncoding(getSubfield(codeField, 1))

  const isCortisol = code && (code.toUpperCase() === 'CORT8' || code.toUpperCase() === 'CORT17')
  if (isCortisol) {
    code = 'CORT'
    text = 'Cortisol Diurnal'
  }

  const observation: Observation = {
    setId: parseInt(getField(parts, 1)) || 0,
    valueType: getField(parts, 2),
    code,
    text,
    system: getSubfield(codeField, 2) || undefined,
    value: getField(parts, 5),
    units: getSubfield(unitsField, 0) || undefined,
    refRange: getField(parts, 7) || undefined,
    abnormalFlags: getField(parts, 8) || undefined,
    status: getField(parts, 11),
    observationDateTime: getField(parts, 14) ? formatDateTime(getField(parts, 14)) : undefined,
    specimenCollectionTime: specimenCollectionTime || undefined,
    notes: [],
    mara_status: '',
  }

  // Update refRange for cortisol based on time
  if (isCortisol) {
    const timeToUse = specimenCollectionTime || observation.observationDateTime
    const hourDecimal = extractHourFromDateTime(timeToUse)
    if (hourDecimal !== null) {
      const cortisolRange = getCortisolRangeForTime(hourDecimal)
      if (cortisolRange) {
        observation.refRange = `${cortisolRange.standardMin.toFixed(1)}-${cortisolRange.standardMax.toFixed(1)}`
      }
    }
  }

  // Determine mara status
  const maraResult = determineMaraStatus(observation)
  observation.mara_status = maraResult.status
  if (maraResult.range !== null) {
    observation.mara_range = maraResult.range
  }

  return observation
}

export function parseHL7Message(hl7Data: string): ParsedHL7 {
  let cleanedData = hl7Data.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  cleanedData = fixGermanEncoding(cleanedData)

  const lines = cleanedData
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)

  if (lines.length === 0) {
    throw new Error('Empty HL7 message')
  }

  let messageHeader: MessageHeader | null = null
  let patient: Patient | null = null
  const orders: Order[] = []
  const observationRequests: ObservationRequest[] = []
  const observations: Observation[] = []
  const notes: NoteSegment[] = []

  let currentObservation: Observation | null = null
  let currentSpecimenCollectionTime: string | undefined = undefined

  for (const line of lines) {
    const parts = line.split('|')
    const segmentType = parts[0]

    switch (segmentType) {
      case 'MSH':
        messageHeader = parseMessageHeader(parts)
        break

      case 'PID':
        patient = parsePatient(parts)
        break

      case 'ORC':
        orders.push(parseOrder(parts))
        break

      case 'OBR': {
        const obr = parseObservationRequest(parts)
        observationRequests.push(obr)
        currentSpecimenCollectionTime = obr.obrDateTime
        break
      }

      case 'OBX':
        currentObservation = parseObservation(parts, currentSpecimenCollectionTime)
        observations.push(currentObservation)
        break

      case 'NTE': {
        const noteText = fixGermanEncoding(getField(parts, 3))
        if (currentObservation && noteText) {
          currentObservation.notes.push(noteText)
        } else if (noteText) {
          notes.push({
            setId: parseInt(getField(parts, 1)) || 0,
            text: noteText,
          })
        }
        break
      }
    }
  }

  return {
    messageHeader,
    patient,
    orders,
    observationRequests,
    observations,
    notes,
    messageType: messageHeader?.messageType?.id || 'Unknown',
    totalSegments: lines.length,
  }
}
