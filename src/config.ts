import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  ALIASES_CONFIG_FILE,
  ALIASES_SCRIPT_FILE,
  CONFIG_DIR_NAME,
} from './constants'
import type { AliasConfig, PackageJson } from './types'

const configDir = join(homedir(), CONFIG_DIR_NAME)
const configFile = join(configDir, ALIASES_CONFIG_FILE)
export const aliasScriptFile = join(configDir, ALIASES_SCRIPT_FILE)

/**
 * Safely read and parse JSON file
 */
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  if (!existsSync(filePath)) {
    return defaultValue
  }
  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return defaultValue
  }
}

/**
 * Default alias configuration
 */
const DEFAULT_ALIAS_CONFIG: AliasConfig = {
  aliases: {},
  removedAliases: [],
}

/**
 * Read package.json
 */
export function readPackageJson(cwd: string): PackageJson | null {
  const packageJsonPath = join(cwd, 'package.json')
  if (!existsSync(packageJsonPath)) {
    return null
  }
  try {
    const content = readFileSync(packageJsonPath, 'utf-8')
    return JSON.parse(content) as PackageJson
  } catch {
    return null
  }
}

/**
 * Read alias configuration
 */
export function readAliasConfig(): AliasConfig {
  const config = readJsonFile<AliasConfig>(configFile, DEFAULT_ALIAS_CONFIG)
  // Ensure removedAliases exists for backward compatibility
  if (!config.removedAliases) {
    config.removedAliases = []
  }
  return config
}

/**
 * Save alias configuration
 */
export function saveAliasConfig(config: AliasConfig): void {
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8')
}

// Get config directory
export function getConfigDir(): string {
  return configDir
}

// Get config file path
export function getConfigFile(): string {
  return configFile
}
