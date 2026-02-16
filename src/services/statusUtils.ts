/**
 * Shared status normalization, labels, and colors for biomarker statuses.
 * Used by both ParsePreview (before analysis) and ReportPanel (after analysis).
 *
 * Gemini may return any of: normal, low, high, critical_low, critical_high
 * Our parser uses: normal, below_refrange, above_refrange, below_idealrange, above_idealrange
 * This module maps all of them to a canonical set with consistent labels and colors.
 */

export type NormalizedStatus =
  | 'normal'
  | 'low'
  | 'high'
  | 'critical_low'
  | 'critical_high'
  | 'suboptimal'
  | 'supraoptimal'
  | 'unknown'

/** Map any raw status string to a canonical status. */
export function normalizeStatus(raw: string): NormalizedStatus {
  switch (raw) {
    case 'normal':
      return 'normal'
    case 'low':
    case 'below_refrange':
      return 'low'
    case 'high':
    case 'above_refrange':
      return 'high'
    case 'critical_low':
      return 'critical_low'
    case 'critical_high':
      return 'critical_high'
    case 'below_idealrange':
    case 'suboptimal':
      return 'suboptimal'
    case 'above_idealrange':
    case 'supraoptimal':
      return 'supraoptimal'
    default:
      return 'unknown'
  }
}

/** Badge color classes for a normalized status. */
export function statusColor(status: NormalizedStatus): string {
  switch (status) {
    case 'normal':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'low':
    case 'high':
    case 'critical_low':
    case 'critical_high':
      return 'text-red-700 bg-red-50 border-red-200'
    case 'suboptimal':
    case 'supraoptimal':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

/** i18n label for a normalized status. */
export function statusLabel(status: NormalizedStatus, t: (key: string) => string): string {
  switch (status) {
    case 'normal':
      return t('report.normal')
    case 'low':
      return t('report.low')
    case 'high':
      return t('report.high')
    case 'critical_low':
      return t('report.criticalLow')
    case 'critical_high':
      return t('report.criticalHigh')
    case 'suboptimal':
      return t('preview.statusSuboptimal')
    case 'supraoptimal':
      return t('preview.statusSupraoptimal')
    default:
      return status
  }
}

/** Whether a row should be highlighted based on medical or hair status. */
export function isStatusAbnormal(raw: string): boolean {
  const n = normalizeStatus(raw)
  return n !== 'normal' && n !== 'unknown'
}

/** Row background class for abnormal statuses. */
export function statusRowBg(raw: string): string {
  const n = normalizeStatus(raw)
  switch (n) {
    case 'low':
    case 'high':
    case 'critical_low':
    case 'critical_high':
      return 'bg-red-50/60'
    case 'suboptimal':
    case 'supraoptimal':
      return 'bg-yellow-50/60'
    default:
      return ''
  }
}
