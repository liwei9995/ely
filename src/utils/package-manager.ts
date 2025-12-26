import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { LOCK_FILES, PACKAGE_MANAGERS } from '../constants'

/**
 * Package manager type
 */
export type PackageManager = keyof typeof PACKAGE_MANAGERS

/**
 * Package manager detection result
 */
export interface PackageManagerInfo {
  manager: PackageManager | null
  lockFile: string | null
}

/**
 * Detect package manager from lock files
 */
export function detectPackageManager(cwd: string): PackageManagerInfo {
  for (const [manager, lockFile] of Object.entries(LOCK_FILES)) {
    const lockFilePath = join(cwd, lockFile)
    if (existsSync(lockFilePath)) {
      return {
        manager: manager as PackageManager,
        lockFile,
      }
    }
  }

  return {
    manager: null,
    lockFile: null,
  }
}

/**
 * Get package manager run command
 */
export function getPackageManagerRunCommand(
  manager: PackageManager | null
): string {
  if (!manager) {
    return 'npm run'
  }

  const pm = PACKAGE_MANAGERS[manager]
  // Bun doesn't need "run" command
  if (manager === 'bun') {
    return pm
  }
  return `${pm} run`
}

/**
 * Format command with package manager
 */
export function formatCommandWithPackageManager(
  scriptName: string,
  manager: PackageManager | null
): string {
  const runCmd = getPackageManagerRunCommand(manager)
  return `${runCmd} ${scriptName}`
}
