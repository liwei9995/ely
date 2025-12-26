import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { AliasConfig, PackageJson } from './types'

const configDir = join(homedir(), '.ely')
const configFile = join(configDir, 'aliases.json')
export const aliasScriptFile = join(configDir, 'aliases.sh')

// Helper function to safely read and parse JSON files
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

// Read package.json
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

// Read alias configuration
export function readAliasConfig(): AliasConfig {
  const config = readJsonFile<AliasConfig>(configFile, {
    aliases: {},
    removedAliases: [],
  })
  // Ensure removedAliases exists for backward compatibility
  if (!config.removedAliases) {
    config.removedAliases = []
  }
  return config
}

// Save alias configuration
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
