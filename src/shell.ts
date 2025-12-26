import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { aliasScriptFile } from './config'

// Check if running on Windows
export function isWindows(): boolean {
  return process.platform === 'win32'
}

// Get user default shell
export function getDefaultShell(): string {
  if (isWindows()) {
    return process.env.COMSPEC || 'cmd.exe'
  }
  return process.env.SHELL || '/bin/sh'
}

// Get shell arguments for executing commands
export function getShellArgs(): string[] {
  return isWindows() ? ['/d', '/s', '/c'] : ['-c']
}

// Get shell config file path based on shell type
export function getShellConfigFile(): string | null {
  const shell = getDefaultShell()
  const shellName = shell.split('/').pop() || shell

  if (isWindows()) {
    return null // Windows not supported for now
  }

  if (shellName.includes('zsh')) {
    return join(homedir(), '.zshrc')
  }

  if (shellName.includes('bash')) {
    // Try .bashrc first, fallback to .bash_profile
    const bashrc = join(homedir(), '.bashrc')
    const bashProfile = join(homedir(), '.bash_profile')
    if (existsSync(bashrc)) {
      return bashrc
    }
    return bashProfile
  }

  return null
}

// Check if source line already exists in shell config
export function hasSourceLineInConfig(configFile: string): boolean {
  if (!configFile) {
    return false
  }
  if (!existsSync(configFile)) {
    return false
  }

  try {
    const content = readFileSync(configFile, 'utf-8')
    // Check for source or . command with aliasScriptFile
    const sourcePattern = new RegExp(
      `(source|\\.)\\s+["']?${aliasScriptFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?`,
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

// Add source line to shell config file
export function addSourceLineToConfig(configFile: string): boolean {
  if (!configFile) {
    return false
  }

  // Check if already exists
  if (hasSourceLineInConfig(configFile)) {
    return true
  }

  try {
    const sourceLine = `\n# ely aliases\n[ -f "${aliasScriptFile}" ] && source "${aliasScriptFile}"\n`

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

// Get source command for eval mode
export function getSourceCommand(): string {
  if (!existsSync(aliasScriptFile)) {
    return ''
  }
  // Use a more robust source command that checks file existence first
  return `[ -f "${aliasScriptFile}" ] && source "${aliasScriptFile}" 2>/dev/null || true`
}

// Execute source command to make aliases effective immediately
export function executeSourceCommand(): boolean {
  if (!existsSync(aliasScriptFile)) {
    return false
  }

  if (isWindows()) {
    // Windows not supported for now
    return false
  }

  try {
    const shell = getDefaultShell()
    const shellName = shell.split('/').pop() || shell
    const sourceCmd = getSourceCommand()

    let shellArgs: string[] = []
    if (shellName.includes('zsh') || shellName.includes('bash')) {
      // Use -i flag for interactive shell to load .zshrc/.bashrc
      // Use -c flag to execute the command
      shellArgs = ['-i', '-c', sourceCmd]
    } else {
      // For other shells, just use -c
      shellArgs = ['-c', sourceCmd]
    }

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

// Check if we're being called via eval (for automatic sourcing)
export function isEvalMode(): boolean {
  return process.env.ELY_EVAL_MODE === '1' || process.argv.includes('--eval')
}

// Get alias command for different shells
function getAliasCommand(shellName: string): string {
  // Get source command for ely alias script
  const elySourceCmd = getSourceCommand()
  const elySource = elySourceCmd ? `${elySourceCmd} && ` : ''

  if (shellName.includes('zsh')) {
    return `(source ~/.zshrc 2>/dev/null || true) && ${elySource}alias`
  }
  if (shellName.includes('bash')) {
    return `(source ~/.bashrc 2>/dev/null || source ~/.bash_profile 2>/dev/null || true) && ${elySource}alias`
  }
  return `${elySource}alias`
}

// Parse a single alias line
function parseAliasLine(line: string): [string, string] | null {
  let trimmedLine = line.trim()

  if (!trimmedLine) {
    return null
  }

  // Remove 'alias' prefix if present
  if (trimmedLine.startsWith('alias ')) {
    trimmedLine = trimmedLine.slice(6).trim()
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
  if (name.length >= 2) {
    const nameFirstChar = name[0]
    const nameLastChar = name.at(-1)
    if (
      (nameFirstChar === "'" && nameLastChar === "'") ||
      (nameFirstChar === '"' && nameLastChar === '"')
    ) {
      name = name.slice(1, -1).trim()
    }
  }

  if (!name) {
    return null
  }

  // Remove quotes from value if present
  if (value.length > 0) {
    // Handle $'...' format (ANSI-C quoting) - keep as-is
    if (value.startsWith("$'") && value.endsWith("'")) {
      // Keep the $'...' format
    } else if (value.length >= 2) {
      const valueFirstChar = value[0]
      const valueLastChar = value.at(-1)
      if (
        (valueFirstChar === "'" && valueLastChar === "'") ||
        (valueFirstChar === '"' && valueLastChar === '"')
      ) {
        value = value.slice(1, -1)
      }
    }
  }

  return [name, value]
}

// Extract script name from ely alias value
export function extractScriptFromElyAlias(aliasValue: string): string | null {
  const trimmed = aliasValue.trim()
  // Remove quotes if present
  const withoutQuotes = trimmed.replace(/^['"]|['"]$/g, '')
  return withoutQuotes || null
}

// Read shell aliases from user's default shell
export function readShellAliases(): Record<string, string> {
  const shell = getDefaultShell()
  const shellName = shell.split('/').pop() || shell
  const aliases: Record<string, string> = {}

  try {
    const command = getAliasCommand(shellName)

    // Execute the command using the default shell
    const shellCommand = shell
    let shellArgs: string[] = []

    if (isWindows()) {
      // Windows: use /d /s /c for cmd.exe
      shellArgs = [...getShellArgs(), command]
    } else if (shellName.includes('zsh') || shellName.includes('bash')) {
      // Use -i flag for interactive shell to load .zshrc/.bashrc
      // Use -c flag to execute the command
      shellArgs = ['-i', '-c', command]
    } else {
      // For other shells, just use -c
      shellArgs = ['-c', command]
    }

    const result = spawnSync(shellCommand, shellArgs, {
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
