import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { aliasScriptFile } from './config'
import {
  ALIAS_PREFIX,
  DEFAULT_UNIX_SHELL,
  DEFAULT_WINDOWS_SHELL,
  INTERACTIVE_SHELL_ARGS,
  UNIX_SHELL_ARGS,
  WINDOWS_SHELL_ARGS,
} from './constants'

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return process.platform === 'win32'
}

/**
 * Get user default shell
 */
export function getDefaultShell(): string {
  if (isWindows()) {
    return process.env.COMSPEC || DEFAULT_WINDOWS_SHELL
  }
  return process.env.SHELL || DEFAULT_UNIX_SHELL
}

/**
 * Get shell command execution arguments
 */
export function getShellArgs(): string[] {
  return isWindows() ? [...WINDOWS_SHELL_ARGS] : [...UNIX_SHELL_ARGS]
}

/**
 * Get interactive shell arguments (for loading config files)
 */
function getInteractiveShellArgs(): string[] {
  return [...INTERACTIVE_SHELL_ARGS]
}

/**
 * Get shell config file name
 */
function getShellConfigFileName(shellName: string): string | null {
  if (shellName.includes('zsh')) {
    return '.zshrc'
  }
  if (shellName.includes('bash')) {
    // Try .bashrc first, fallback to .bash_profile
    const bashrc = join(homedir(), '.bashrc')
    if (existsSync(bashrc)) {
      return '.bashrc'
    }
    return '.bash_profile'
  }
  return null
}

/**
 * Get shell config file path based on shell type
 */
export function getShellConfigFile(): string | null {
  if (isWindows()) {
    return null // Windows not supported for now
  }

  const shell = getDefaultShell()
  const shellName = shell.split('/').pop() || shell
  const configFileName = getShellConfigFileName(shellName)

  if (!configFileName) {
    return null
  }

  return join(homedir(), configFileName)
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Check if source line already exists in shell config file
 */
export function hasSourceLineInConfig(configFile: string): boolean {
  if (!(configFile && existsSync(configFile))) {
    return false
  }

  try {
    const content = readFileSync(configFile, 'utf-8')
    // Check for source or . command with aliasScriptFile
    const escapedPath = escapeRegex(aliasScriptFile)
    const sourcePattern = new RegExp(
      `(source|\\.)\\s+["']?${escapedPath}["']?`,
      'i'
    )
    return sourcePattern.test(content)
  } catch {
    return false
  }
}

// Check if ely aliases are initialized (shell config has source line)
export function isElyInitialized(): boolean {
  const shellConfigFile = getShellConfigFile()
  if (!shellConfigFile) {
    return false
  }
  return hasSourceLineInConfig(shellConfigFile)
}

/**
 * Generate source line content
 */
function generateSourceLine(): string {
  return `\n# ely aliases\n[ -f "${aliasScriptFile}" ] && source "${aliasScriptFile}"\n`
}

/**
 * Add source line to shell config file
 */
export function addSourceLineToConfig(configFile: string): boolean {
  if (!configFile) {
    return false
  }

  // Check if already exists
  if (hasSourceLineInConfig(configFile)) {
    return true
  }

  try {
    const sourceLine = generateSourceLine()

    // Read existing content
    let content = ''
    if (existsSync(configFile)) {
      content = readFileSync(configFile, 'utf-8')
      // Ensure file ends with newline
      if (content && !content.endsWith('\n')) {
        content += '\n'
      }
    }

    // Append source line
    content += sourceLine

    // Write back
    writeFileSync(configFile, content, 'utf-8')
    return true
  } catch {
    return false
  }
}

/**
 * Get source command (for immediate effect)
 */
export function getSourceCommand(): string {
  if (!existsSync(aliasScriptFile)) {
    return ''
  }
  // Use a more robust source command that checks file existence first
  return `[ -f "${aliasScriptFile}" ] && source "${aliasScriptFile}" 2>/dev/null || true`
}

/**
 * Check if shell is interactive shell (zsh or bash)
 */
function isInteractiveShell(shellName: string): boolean {
  return shellName.includes('zsh') || shellName.includes('bash')
}

/**
 * Execute source command to make aliases effective immediately
 */
export function executeSourceCommand(): boolean {
  if (!existsSync(aliasScriptFile) || isWindows()) {
    return false
  }

  try {
    const shell = getDefaultShell()
    const shellName = shell.split('/').pop() || shell
    const sourceCmd = getSourceCommand()

    const shellArgs = isInteractiveShell(shellName)
      ? [...getInteractiveShellArgs(), sourceCmd]
      : [...UNIX_SHELL_ARGS, sourceCmd]

    const result = spawnSync(shell, shellArgs, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    // Return true if command executed successfully (even if there were warnings)
    return result.status === 0 || result.status === null
  } catch {
    return false
  }
}

/**
 * Get source command for shell config file
 */
function getShellConfigSourceCommand(shellName: string): string {
  if (shellName.includes('zsh')) {
    return '(source ~/.zshrc 2>/dev/null || true)'
  }
  if (shellName.includes('bash')) {
    return '(source ~/.bashrc 2>/dev/null || source ~/.bash_profile 2>/dev/null || true)'
  }
  return ''
}

/**
 * Get alias command for different shells
 */
function getAliasCommand(shellName: string): string {
  // Get source command for ely alias script
  const elySourceCmd = getSourceCommand()
  const elySource = elySourceCmd ? `${elySourceCmd} && ` : ''
  const shellConfigSource = getShellConfigSourceCommand(shellName)

  if (shellConfigSource) {
    return `${shellConfigSource} && ${elySource}alias`
  }
  return `${elySource}alias`
}

/**
 * Remove quotes from both ends of string
 */
function removeQuotes(str: string): string {
  if (str.length < 2) {
    return str
  }
  const firstChar = str[0]
  const lastChar = str.at(-1)
  if (
    (firstChar === "'" && lastChar === "'") ||
    (firstChar === '"' && lastChar === '"')
  ) {
    return str.slice(1, -1)
  }
  return str
}

/**
 * Parse single alias line
 */
function parseAliasLine(line: string): [string, string] | null {
  let trimmedLine = line.trim()

  if (!trimmedLine) {
    return null
  }

  // Remove 'alias' prefix if present
  if (trimmedLine.startsWith(ALIAS_PREFIX)) {
    trimmedLine = trimmedLine.slice(ALIAS_PREFIX.length).trim()
  }

  // Find the first = sign to split name and value
  const equalIndex = trimmedLine.indexOf('=')
  if (equalIndex === -1 || equalIndex === 0) {
    return null
  }

  let name = trimmedLine.slice(0, equalIndex).trim()
  let value = trimmedLine.slice(equalIndex + 1).trim()

  if (!name) {
    return null
  }

  // Remove quotes from alias name if present
  name = removeQuotes(name).trim()
  if (!name) {
    return null
  }

  // Remove quotes from value if present
  // Handle $'...' format (ANSI-C quoting) - keep as-is
  if (value.startsWith("$'") && value.endsWith("'")) {
    // Keep the $'...' format
  } else if (value.length > 0) {
    value = removeQuotes(value)
  }

  return [name, value]
}

/**
 * Extract script name from ely alias value
 */
export function extractScriptFromElyAlias(aliasValue: string): string | null {
  const trimmed = aliasValue.trim()
  if (!trimmed) {
    return null
  }
  // Remove quotes if present
  const withoutQuotes = removeQuotes(trimmed)
  return withoutQuotes || null
}

/**
 * Read aliases from user's default shell
 */
export function readShellAliases(): Record<string, string> {
  const shell = getDefaultShell()
  const shellName = shell.split('/').pop() || shell
  const aliases: Record<string, string> = {}

  try {
    const command = getAliasCommand(shellName)
    let shellArgs: string[] = []

    if (isWindows()) {
      // Windows: use /d /s /c for cmd.exe
      shellArgs = [...getShellArgs(), command]
    } else if (isInteractiveShell(shellName)) {
      // Use -i flag for interactive shell to load .zshrc/.bashrc
      shellArgs = [...getInteractiveShellArgs(), command]
    } else {
      // For other shells, just use -c
      shellArgs = [...UNIX_SHELL_ARGS, command]
    }

    const result = spawnSync(shell, shellArgs, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env },
    })

    if (result.error) {
      throw result.error
    }

    const output = result.stdout || ''

    // Parse alias output line by line
    for (const line of output.split('\n')) {
      const parsed = parseAliasLine(line)
      if (parsed) {
        const [name, value] = parsed
        aliases[name] = value
      }
    }
  } catch {
    // If reading fails, return empty object
    // This can happen if shell config files don't exist or have errors
    return {}
  }

  return aliases
}
