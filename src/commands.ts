import type { SpawnOptions } from 'node:child_process'
import { join } from 'node:path'
import * as prompts from '@clack/prompts'
import spawn from 'cross-spawn'
import colors from 'picocolors'
import { readPackageJson } from './config'
import {
  NODE_MODULES_BIN,
  PATH_SEPARATOR_UNIX,
  PATH_SEPARATOR_WINDOWS,
} from './constants'
import { getDefaultShell, getShellArgs, isWindows } from './shell'
import {
  detectPackageManager,
  formatCommandWithPackageManager,
} from './utils/package-manager'

const { blue, cyan, green, red, yellow } = colors

/**
 * Validate scripts configuration in package.json
 */
export function validatePackageScripts(cwd: string): Record<string, string> {
  const pkg = readPackageJson(cwd)
  if (!pkg?.scripts || Object.keys(pkg.scripts).length === 0) {
    prompts.log.error(red('package.json or scripts configuration not found'))
    process.exit(1)
  }
  return pkg.scripts
}

/**
 * Build PATH environment variable including node_modules/.bin
 */
function buildPathWithNodeModulesBin(cwd: string): string {
  const nodeModulesBin = join(cwd, NODE_MODULES_BIN)
  const currentPath = process.env.PATH || ''
  const pathSeparator = isWindows()
    ? PATH_SEPARATOR_WINDOWS
    : PATH_SEPARATOR_UNIX

  return currentPath
    ? `${nodeModulesBin}${pathSeparator}${currentPath}`
    : nodeModulesBin
}

/**
 * Execute command
 */
export function run(command: string, cwd: string): void {
  prompts.log.step(`${green('Executing command:')} ${cyan(command)}`)

  // Ensure PATH includes node_modules/.bin to find locally installed commands
  const newPath = buildPathWithNodeModulesBin(cwd)

  // Execute command as if in terminal
  const shell = getDefaultShell()
  const shellArgs = getShellArgs()

  const options: SpawnOptions = {
    stdio: 'inherit',
    cwd,
    env: {
      ...process.env,
      PATH: newPath,
    },
  }

  // Execute command using shell, just like typing in terminal
  const child = spawn(shell, [...shellArgs, command], options)

  child.on('error', error => {
    prompts.log.error(`${red('Execution failed:')} ${error.message}`)
    process.exit(1)
  })

  child.on('exit', code => {
    if (code !== 0) {
      process.exit(code || 1)
    }
  })
}

/**
 * Format script option label
 */
function formatScriptLabel(name: string, command: string): string {
  return `${cyan(name)} ${yellow('→')} ${command}`
}

/**
 * Interactive command selection and execution
 */
export async function interactiveSelect(cwd: string): Promise<void> {
  const packageScripts = validatePackageScripts(cwd)
  const scriptEntries = Object.entries(packageScripts)

  prompts.intro(blue('🍣 Select a command to run'))

  const selected = await prompts.select({
    message: 'Select a command to run:',
    options: scriptEntries.map(([name, command]) => ({
      value: name,
      label: formatScriptLabel(name, command),
    })),
  })

  if (prompts.isCancel(selected)) {
    prompts.cancel('Cancelled')
    process.exit(0)
  }

  const scriptName = selected as string
  const rawCommand = packageScripts[scriptName]

  if (!rawCommand) {
    prompts.log.error(red('Command not found'))
    process.exit(1)
  }

  // Detect package manager and format command
  const pmInfo = detectPackageManager(cwd)
  const command = formatCommandWithPackageManager(scriptName, pmInfo.manager)

  run(command, cwd)
}
