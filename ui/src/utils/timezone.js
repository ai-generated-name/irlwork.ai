/**
 * Convert an IANA timezone identifier to a short GMT offset string.
 * e.g. "America/New_York" -> "GMT-5", "Asia/Kolkata" -> "GMT+5:30"
 */
export function formatTimezoneShort(iana) {
  if (!iana) return ''
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'shortOffset'
    })
    const parts = formatter.formatToParts(now)
    const tzPart = parts.find(p => p.type === 'timeZoneName')
    return tzPart?.value || iana
  } catch {
    return iana
  }
}

/**
 * Common timezones grouped by region for the dropdown.
 * Each entry: { value: IANA string, label: "City — GMT offset" }
 */
export const TIMEZONE_OPTIONS = (() => {
  const zones = [
    // Americas
    { value: 'Pacific/Honolulu', city: 'Honolulu' },
    { value: 'America/Anchorage', city: 'Anchorage' },
    { value: 'America/Los_Angeles', city: 'Los Angeles' },
    { value: 'America/Denver', city: 'Denver' },
    { value: 'America/Chicago', city: 'Chicago' },
    { value: 'America/New_York', city: 'New York' },
    { value: 'America/Halifax', city: 'Halifax' },
    { value: 'America/St_Johns', city: "St. John's" },
    { value: 'America/Sao_Paulo', city: 'São Paulo' },
    { value: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires' },
    { value: 'America/Mexico_City', city: 'Mexico City' },
    { value: 'America/Bogota', city: 'Bogotá' },
    { value: 'America/Lima', city: 'Lima' },
    { value: 'America/Toronto', city: 'Toronto' },
    { value: 'America/Vancouver', city: 'Vancouver' },
    // Europe
    { value: 'Atlantic/Reykjavik', city: 'Reykjavik' },
    { value: 'Europe/London', city: 'London' },
    { value: 'Europe/Paris', city: 'Paris' },
    { value: 'Europe/Berlin', city: 'Berlin' },
    { value: 'Europe/Madrid', city: 'Madrid' },
    { value: 'Europe/Rome', city: 'Rome' },
    { value: 'Europe/Amsterdam', city: 'Amsterdam' },
    { value: 'Europe/Zurich', city: 'Zurich' },
    { value: 'Europe/Stockholm', city: 'Stockholm' },
    { value: 'Europe/Warsaw', city: 'Warsaw' },
    { value: 'Europe/Athens', city: 'Athens' },
    { value: 'Europe/Bucharest', city: 'Bucharest' },
    { value: 'Europe/Helsinki', city: 'Helsinki' },
    { value: 'Europe/Istanbul', city: 'Istanbul' },
    { value: 'Europe/Moscow', city: 'Moscow' },
    { value: 'Europe/Kiev', city: 'Kyiv' },
    // Africa
    { value: 'Africa/Lagos', city: 'Lagos' },
    { value: 'Africa/Cairo', city: 'Cairo' },
    { value: 'Africa/Nairobi', city: 'Nairobi' },
    { value: 'Africa/Johannesburg', city: 'Johannesburg' },
    { value: 'Africa/Casablanca', city: 'Casablanca' },
    // Middle East
    { value: 'Asia/Dubai', city: 'Dubai' },
    { value: 'Asia/Riyadh', city: 'Riyadh' },
    { value: 'Asia/Tehran', city: 'Tehran' },
    // Asia
    { value: 'Asia/Kolkata', city: 'Kolkata' },
    { value: 'Asia/Karachi', city: 'Karachi' },
    { value: 'Asia/Dhaka', city: 'Dhaka' },
    { value: 'Asia/Bangkok', city: 'Bangkok' },
    { value: 'Asia/Jakarta', city: 'Jakarta' },
    { value: 'Asia/Singapore', city: 'Singapore' },
    { value: 'Asia/Hong_Kong', city: 'Hong Kong' },
    { value: 'Asia/Shanghai', city: 'Shanghai' },
    { value: 'Asia/Taipei', city: 'Taipei' },
    { value: 'Asia/Seoul', city: 'Seoul' },
    { value: 'Asia/Tokyo', city: 'Tokyo' },
    // Oceania
    { value: 'Australia/Perth', city: 'Perth' },
    { value: 'Australia/Adelaide', city: 'Adelaide' },
    { value: 'Australia/Sydney', city: 'Sydney' },
    { value: 'Australia/Melbourne', city: 'Melbourne' },
    { value: 'Australia/Brisbane', city: 'Brisbane' },
    { value: 'Pacific/Auckland', city: 'Auckland' },
    { value: 'Pacific/Fiji', city: 'Fiji' },
  ]

  return zones.map(z => ({
    value: z.value,
    label: `${z.city} (${formatTimezoneShort(z.value)})`
  }))
})()
