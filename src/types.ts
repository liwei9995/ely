export interface PackageJson {
  scripts?: Record<string, string>
}

export interface AliasConfig {
  aliases: Record<string, string>
  removedAliases?: string[]
}

/**
 * CLI arguments interface
 */
export interface CliArgs {
  help?: boolean
  alias?: boolean
  'alias:set'?: boolean
  'alias:list'?: boolean
  'alias:remove'?: boolean
  'alias:init'?: boolean
  _?: string[]
}

/**
 * Result of alias conflict handling
 */
export type AliasConflictResult = 'skip' | 'overwrite' | 'cancel'

/**
 * Alias information with custom flag
 */
export interface AliasInfo {
  value: string
  isCustom: boolean
}

/**
 * Matched alias for selection
 */
export interface MatchedAlias {
  name: string
  value: string
  isCustom: boolean
}

/**
 * Orphaned alias tuple [aliasName, scriptName]
 */
export type OrphanedAlias = [string, string]
