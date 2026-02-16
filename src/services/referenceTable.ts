import referenceTableData from '../config/reference-table.json'
import { ReferenceTableEntry, ParsedRange, MaraStatus, Observation } from '../types'
import { extractHourFromDateTime, getCortisolRangeForTime } from './cortisol'

const referenceTable: ReferenceTableEntry[] = referenceTableData as ReferenceTableEntry[]

export function parseNumericValue(value: string | number): number | null {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

export function parseRange(rangeStr: string): ParsedRange | null {
  if (!rangeStr || typeof rangeStr !== 'string') return null
  const trimmed = rangeStr.trim()

  if (trimmed.startsWith('>')) {
    const value = parseFloat(trimmed.substring(1))
    if (isNaN(value)) return null
    return { min: value, max: Infinity, type: 'greater_than' }
  }

  if (trimmed.startsWith('<')) {
    const value = parseFloat(trimmed.substring(1))
    if (isNaN(value)) return null
    return { min: -Infinity, max: value, type: 'less_than' }
  }

  const dashMatch = trimmed.match(/^([\d.,]+)\s*[-–]\s*([\d.,]+)$/)
  if (dashMatch) {
    const min = parseFloat(dashMatch[1].replace(',', '.'))
    const max = parseFloat(dashMatch[2].replace(',', '.'))
    if (isNaN(min) || isNaN(max)) return null
    return { min, max, type: 'range' }
  }

  return null
}

function isWithinRange(value: number, range: ParsedRange): boolean {
  return value >= range.min && value <= range.max
}

function findParameterInReferenceTable(parameterCode: string): ReferenceTableEntry | null {
  if (!parameterCode || !referenceTable.length) return null
  const normalizedCode = parameterCode.toUpperCase().trim()
  for (const param of referenceTable) {
    if (param.parameter && param.parameter.toUpperCase() === normalizedCode) {
      return param
    }
  }
  return null
}

export function determineMaraStatus(observation: Observation): { status: MaraStatus; range: string | null } {
  const parameterCode = observation.code
  const value = parseNumericValue(observation.value)
  const labRefRange = observation.refRange

  if (value === null) {
    return { status: '', range: null }
  }

  // Cortisol special handling
  if (parameterCode && parameterCode.toUpperCase() === 'CORT') {
    const timeToUse = observation.specimenCollectionTime || observation.observationDateTime
    const hourDecimal = extractHourFromDateTime(timeToUse)
    if (hourDecimal !== null) {
      const cortisolRange = getCortisolRangeForTime(hourDecimal)
      if (cortisolRange) {
        if (value >= cortisolRange.standardMin && value <= cortisolRange.standardMax) {
          return { status: 'normal', range: null }
        } else if (value < cortisolRange.standardMin) {
          return { status: 'below_refrange', range: null }
        } else {
          return { status: 'above_refrange', range: null }
        }
      }
    }
  }

  // If we have a lab reference range, check medical (ref) range first.
  // Only use ideal (hair) range when value is within lab ref — so we don't label medically normal values as ref-range abnormal.
  if (labRefRange) {
    const labRange = parseRange(labRefRange)
    if (labRange && !isWithinRange(value, labRange)) {
      // Outside medical reference range
      if (value < labRange.min) {
        return { status: 'below_refrange', range: null }
      }
      return { status: 'above_refrange', range: null }
    }
  }

  // Check reference table for ideal (hair) range
  const referenceParam = findParameterInReferenceTable(parameterCode)
  if (referenceParam && referenceParam.ideal_range) {
    const idealRange = parseRange(referenceParam.ideal_range)
    if (idealRange) {
      if (isWithinRange(value, idealRange)) {
        return { status: 'normal', range: referenceParam.ideal_range }
      } else if (value < idealRange.min) {
        return { status: 'below_idealrange', range: referenceParam.ideal_range }
      } else {
        return { status: 'above_idealrange', range: referenceParam.ideal_range }
      }
    }
  }

  if (labRefRange) {
    const labRange = parseRange(labRefRange)
    if (labRange) {
      if (isWithinRange(value, labRange)) {
        return { status: 'normal', range: null }
      } else if (value < labRange.min) {
        return { status: 'below_refrange', range: null }
      } else {
        return { status: 'above_refrange', range: null }
      }
    }
  }

  return { status: '', range: null }
}
