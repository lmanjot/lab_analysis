import { CortisolRange } from '../types'

const CORTISOL_REFERENCE_POINTS = {
  early: { time: 9.5, optimalMin: 128.3, optimalMax: 321.7, standardMin: 133, standardMax: 537 },
  late: { time: 18.5, optimalMin: 58.3, optimalMax: 151.7, standardMin: 57.4, standardMax: 292.0 },
}

function linearExtrapolate(x: number, x1: number, y1: number, x2: number, y2: number): number {
  return y1 + (x - x1) * (y2 - y1) / (x2 - x1)
}

export function extractHourFromDateTime(dateTimeStr: string | undefined): number | null {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return null

  const timeMatch = dateTimeStr.match(/T(\d{2}):(\d{2})/)
  if (timeMatch) {
    const hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2])
    return hours + (minutes / 60)
  }

  return null
}

export function getCortisolRangeForTime(hourDecimal: number | null): CortisolRange | null {
  if (hourDecimal === null || isNaN(hourDecimal)) return null

  const { early, late } = CORTISOL_REFERENCE_POINTS

  if (hourDecimal <= early.time) {
    return {
      optimalMin: early.optimalMin,
      optimalMax: early.optimalMax,
      standardMin: early.standardMin,
      standardMax: early.standardMax,
      timeUsed: hourDecimal,
      capped: 'early',
    }
  }

  if (hourDecimal >= late.time) {
    return {
      optimalMin: late.optimalMin,
      optimalMax: late.optimalMax,
      standardMin: late.standardMin,
      standardMax: late.standardMax,
      timeUsed: hourDecimal,
      capped: 'late',
    }
  }

  return {
    optimalMin: linearExtrapolate(hourDecimal, early.time, early.optimalMin, late.time, late.optimalMin),
    optimalMax: linearExtrapolate(hourDecimal, early.time, early.optimalMax, late.time, late.optimalMax),
    standardMin: linearExtrapolate(hourDecimal, early.time, early.standardMin, late.time, late.standardMin),
    standardMax: linearExtrapolate(hourDecimal, early.time, early.standardMax, late.time, late.standardMax),
    timeUsed: hourDecimal,
    capped: false,
  }
}
