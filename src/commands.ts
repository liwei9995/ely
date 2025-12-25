import type { SpawnOptions } from 'node:child_process'
import { join } from 'node:path'
import * as prompts from '@clack/prompts'
import spawn from 'cross-spawn'
import colors from 'picocolors'
import { readPackageJson } from './config'
import { getDefaultShell, getShellArgs, isWindows } from './shell'

const { blue, cyan, green, red, yellow } = colors

// Validate package.json scripts
export function validatePackageScripts(cwd: string): Record<string, string> {
  const pkg = readPackageJson(cwd)
  if (!pkg?.scripts || Object.keys(pkg.scripts).length === 0) {
    prompts.log.error(red('package.json or scripts configuration not found'))
    process.exit(1)
  }
  return pkg.scripts
}

// Execute command
export function run(command: string, cwd: string): void {
  prompts.log.step(`${green('Executing command:')} ${cyan(command)}`)

  // Ensure PATH includes node_modules/.bin to find locally installed commands
  const nodeModulesBin = join(cwd, 'node_modules', '.bin')
  const currentPath = process.env.PATH || ''
  const pathSeparator = isWindows() ? ';' : ':'
  const newPath = currentPath
    ? `${nodeModulesBin}${pathSeparator}${currentPath}`
    : nodeModulesBin

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

// Interactive selection and execution
export async function interactiveSelect(cwd: string): Promise<void> {
  const packageScripts = validatePackageScripts(cwd)
  const scriptEntries = Object.entries(packageScripts)

  prompts.intro(blue('📦 Select command to execute'))

  const selected = await prompts.select({
    message: 'Please select a command:',
    options: scriptEntries.map(([name, command]) => ({
      value: name,
      label: `${cyan(name)} ${yellow('→')} ${command}`,
    })),
  })

  if (prompts.isCancel(selected)) {
    prompts.cancel('Cancelled')
    process.exit(0)
  }

  const scriptName = selected as string
  const command = packageScripts[scriptName]

  if (!command) {
    prompts.log.error(red('Command not found'))
    process.exit(1)
  }

  run(command, cwd)
}
