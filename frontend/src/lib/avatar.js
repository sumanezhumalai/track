/**
 * Shared avatar initials, color styling, and user data normalization utilities.
 */

/**
 * Generate 2-letter avatar initials according to specification:
 * - Single word: first two letters (e.g. "testdev" -> "Te", "Admin" -> "Ad")
 * - Separated words (space, underscore, hyphen, dot): 1st letter of 1st word + 1st letter of 2nd word
 *   (e.g. "john_dev" -> "Jd", "alice dev" -> "Ad")
 * Formatted as: 1st letter Uppercase, 2nd letter Lowercase.
 */
export function getAvatarInitials(name) {
  if (!name || typeof name !== 'string') return '??'
  const parts = name.trim().split(/[_\s.-]+/).filter(Boolean)
  if (!parts.length) return '??'
  const first = parts[0][0].toUpperCase()
  const second = (parts.length >= 2 ? parts[1][0] : parts[0][1] || '').toLowerCase()
  return `${first}${second}` || first
}

/**
 * Deterministic harmonic color palette for user avatars.
 */
const AVATAR_PALETTES = [
  'bg-[#E9F0EB] text-[#244D34] border-[#D0DFD4]', // Muted Sage (theme green)
  'bg-[#E9ECEF] text-[#34485E] border-[#D3DAE2]', // Muted Slate Blue
  'bg-[#ECECE8] text-[#4A4A42] border-[#D7D7D0]', // Muted Warm Stone
  'bg-[#EDE8EC] text-[#553C55] border-[#DDD3DC]', // Muted Dusty Mauve
  'bg-[#EFECE5] text-[#5C4D33] border-[#DDD5C7]', // Muted Dusty Sand
  'bg-[#EFE8E8] text-[#633A3A] border-[#DED1D1]', // Muted Dusty Rose
  'bg-[#E7EDEE] text-[#2A4C4E] border-[#CEDBE0]', // Muted Dusty Teal
  'bg-[#EAEAF0] text-[#3B415C] border-[#D4D5E2]', // Muted Dusty Indigo
]

export function getAvatarColorClass(name) {
  if (!name) return 'bg-muted text-muted-foreground border-border'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length
  return AVATAR_PALETTES[index]
}

/**
 * Normalizes user data from any source (DevSupport entity, ProjectMember, string devName)
 * into a consistent, robust object representation.
 */
export function normalizeUserData(raw) {
  if (!raw) {
    return { id: '', devId: null, devName: '', name: '', initials: '??', role: '', team: '', type: 'dev' }
  }

  if (typeof raw === 'string') {
    const name = raw.trim()
    return {
      id: name,
      devId: null,
      devName: name,
      name,
      initials: getAvatarInitials(name),
      role: '',
      team: '',
      type: 'dev',
    }
  }

  const devName = raw.devName || raw.name || raw.aeName || ''
  const id = String(raw.devId || raw.aeId || raw.memberId || raw.id || devName)

  return {
    id,
    devId: raw.devId ?? null,
    devName,
    name: devName,
    initials: getAvatarInitials(devName),
    role: raw.role || '',
    team: raw.team || '',
    type: raw.type || 'dev',
  }
}

/**
 * Safely parses the authenticated user from localStorage with normalized role and isAdmin flag.
 */
export function getStoredUser() {
  const raw = localStorage.getItem('user')
  let user = { name: 'User', role: 'DEV' }
  if (raw) {
    try {
      user = JSON.parse(raw)
    } catch {
      /* ignore JSON parse error */
    }
  }
  const role = (user.role || '').toUpperCase().replace(/^ROLE_/, '')
  return {
    ...user,
    role,
    isAdmin: role === 'ADMIN',
  }
}
