/**
 * Alias validation and fuzzy matching utility functions
 */

/**
 * Validate alias name format
 */
export function validateAliasName(name: string): string | undefined {
  if (!name || name.trim().length === 0) {
    return 'Alias cannot be empty'
  }
  if (!/^[a-zA-Z0-9_:-]+$/.test(name)) {
    return 'Alias can only contain letters, numbers, underscores, hyphens and colons'
  }
  return undefined
}

/**
 * Validate alias value format
 */
export function validateAliasValue(value: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return 'Alias value cannot be empty'
  }
  // More lenient validation: only exclude control characters and newlines
  if (/[\n\r]/.test(value)) {
    return 'Alias value cannot contain newline characters'
  }
  return undefined
}

/**
 * Fuzzy match function - check if pattern matches text
 */
export function fuzzyMatch(pattern: string, text: string): boolean {
  if (!pattern || pattern.trim().length === 0) {
    return true // Empty pattern matches everything
  }

  const patternLower = pattern.toLowerCase().trim()
  const textLower = text.toLowerCase()

  // Exact match (case-insensitive)
  if (textLower === patternLower) {
    return true
  }

  // Starts with match
  if (textLower.startsWith(patternLower)) {
    return true
  }

  // Contains match (substring)
  if (textLower.includes(patternLower)) {
    return true
  }

  // Fuzzy match: check if all pattern characters appear in order (not necessarily consecutive)
  let patternIndex = 0
  for (
    let i = 0;
    i < textLower.length && patternIndex < patternLower.length;
    i++
  ) {
    if (textLower[i] === patternLower[patternIndex]) {
      patternIndex++
    }
  }

  return patternIndex === patternLower.length
}
