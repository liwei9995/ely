import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import * as prompts from '@clack/prompts'
import colors from 'picocolors'
import {
  aliasScriptFile,
  readAliasConfig,
  readPackageJson,
  saveAliasConfig,
} from './config'
import {
  addSourceLineToConfig,
  extractScriptFromElyAlias,
  getDefaultShell,
  getShellConfigFile,
  getSourceCommand,
  hasSourceLineInConfig,
  isEvalMode,
  readShellAliases,
} from './shell'

const { blue, cyan, green, red, yellow } = colors

// Generate shell alias script from config
function getShellAliasScript(): string {
  const config = readAliasConfig()

  if (Object.keys(config.aliases).length === 0) {
    return ''
  }

  // Generate aliases
  const aliases = Object.entries(config.aliases)
    .map(([alias, script]) => {
      return `alias ${alias}='${script}'`
    })
    .join('\n')

  return aliases
}

// Generate and save alias script file
export function generateAliasScriptFile(): void {
  const script = getShellAliasScript()
  if (!script) {
    return
  }

  const configDir = aliasScriptFile.split('/').slice(0, -1).join('/')
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  // Add header comment
  const content = `# ely aliases - Auto-generated, do not edit manually
# Generated at: ${new Date().toISOString()}
# To regenerate, run: ely alias:set

${script}
`

  writeFileSync(aliasScriptFile, content, 'utf-8')
}

// Show alias script file status and instructions
function showAliasScriptStatus(cwd: string): void {
  const shellConfigFile = getShellConfigFile()
  if (shellConfigFile && !hasSourceLineInConfig(shellConfigFile)) {
    // First time setting alias, initialize the shell config
    const added = addSourceLineToConfig(shellConfigFile)
    if (added) {
      prompts.log.success(
        `${green('✓')} Alias script file generated: ${cyan(aliasScriptFile)}`
      )
      prompts.log.success(
        `${green('✓')} Source line added to ${cyan(shellConfigFile)}`
      )
      prompts.log.info(
        yellow('\n💡 Run ') +
          cyan(`source ${shellConfigFile}`) +
          yellow(' or restart your terminal to use the aliases')
      )
    } else {
      prompts.log.step(
        blue('📝 Alias script file generated: ') + cyan(aliasScriptFile)
      )
      prompts.log.info(
        yellow('\n💡 Add this line to ') + cyan(shellConfigFile) + yellow(':')
      )
      console.log(
        cyan(`  [ -f "${aliasScriptFile}" ] && source "${aliasScriptFile}"`)
      )
    }
  } else if (shellConfigFile && hasSourceLineInConfig(shellConfigFile)) {
    // Source line already exists, just confirm the update
    prompts.log.success(
      `${green('✓')} Alias script file updated: ${cyan(aliasScriptFile)}`
    )
  } else {
    // Shell config file not detected
    prompts.log.step(
      blue('📝 Alias script file generated: ') + cyan(aliasScriptFile)
    )
    prompts.log.info(
      yellow(
        '\n💡 Add this line to your shell config file (.zshrc, .bashrc, etc.):'
      )
    )
    console.log(
      cyan(`  [ -f "${aliasScriptFile}" ] && source "${aliasScriptFile}"`)
    )
  }

  // If in eval mode, output source command directly
  if (existsSync(aliasScriptFile) && isEvalMode()) {
    console.log(getSourceCommand())
    return
  }

  // Provide ways to source the alias
  if (existsSync(aliasScriptFile)) {
    prompts.log.info(yellow('\n💡 To use the alias immediately, choose one:'))
    console.log(cyan(`  1. source "${aliasScriptFile}"`))
    console.log(cyan(`  2. eval "$(ely alias:set --eval)"`))
    if (shellConfigFile && hasSourceLineInConfig(shellConfigFile)) {
      prompts.log.info(
        yellow('  3. Or restart your terminal to use the alias automatically.')
      )
    }
  }
}

// Validate alias name
function validateAliasName(
  value: string,
  existingAliases: Record<string, string>,
  currentScript?: string
): string | undefined {
  if (!value || value.trim().length === 0) {
    return 'Alias cannot be empty'
  }
  if (!/^[a-zA-Z0-9_:-]+$/.test(value)) {
    return 'Alias can only contain letters, numbers, underscores, hyphens and colons'
  }
  if (existingAliases[value] && existingAliases[value] !== currentScript) {
    return `Alias "${value}" is already in use`
  }
  return undefined
}

// Generate shell aliases: read package.json, let user select command and input alias
export async function generateShellAliases(cwd: string): Promise<boolean> {
  const pkg = readPackageJson(cwd)
  if (!pkg?.scripts || Object.keys(pkg.scripts).length === 0) {
    prompts.log.info(
      yellow('No package.json or scripts found in current directory')
    )
    return false
  }

  const scripts = Object.entries(pkg.scripts)
  const config = readAliasConfig()

  prompts.intro(blue('🔖 Set command alias'))

  const selected = await prompts.select({
    message: 'Select command to set alias for:',
    options: scripts.map(([name, command]) => ({
      value: name,
      label: `${cyan(name)} ${yellow('→')} ${command}`,
    })),
  })

  if (prompts.isCancel(selected)) {
    return false
  }

  const alias = await prompts.text({
    message: 'Enter alias:',
    placeholder: 'e.g.: dev, build, ely:check',
    validate: value =>
      validateAliasName(value, config.aliases, selected as string),
  })

  if (prompts.isCancel(alias)) {
    return false
  }

  const aliasName = alias as string
  const scriptName = selected as string

  config.aliases[aliasName] = scriptName
  saveAliasConfig(config)

  prompts.log.success(
    `${green('Alias set successfully:')} ${cyan(aliasName)} ${yellow('→')} ${cyan(scriptName)}`
  )

  // Generate alias script file
  generateAliasScriptFile()

  // Show status and instructions
  showAliasScriptStatus(cwd)

  return true
}

// Custom alias: let user input name and value directly
export async function generateCustomAlias(cwd: string): Promise<void> {
  const config = readAliasConfig()

  prompts.intro(blue('🔖 Set custom alias'))

  const aliasName = await prompts.text({
    message: 'Enter alias name:',
    placeholder: 'e.g.: dev, build, mycmd',
    validate: value => validateAliasName(value, config.aliases),
  })

  if (prompts.isCancel(aliasName)) {
    prompts.cancel('Cancelled')
    process.exit(0)
  }

  const aliasValue = await prompts.text({
    message: 'Enter alias value (script name):',
    placeholder: 'e.g.: dev, build, test',
    validate: value => {
      if (!value || value.trim().length === 0) {
        return 'Alias value cannot be empty'
      }
      // More lenient validation: only exclude control characters and newlines
      if (/[\n\r]/.test(value)) {
        return 'Alias value cannot contain newline characters'
      }
      return undefined
    },
  })

  if (prompts.isCancel(aliasValue)) {
    prompts.cancel('Cancelled')
    process.exit(0)
  }

  const name = aliasName as string
  const value = aliasValue as string

  config.aliases[name] = value
  saveAliasConfig(config)

  prompts.log.success(
    `${green('Alias set successfully:')} ${cyan(name)} ${yellow('→')} ${cyan(value)}`
  )

  // Generate alias script file
  generateAliasScriptFile()

  // Show status and instructions
  showAliasScriptStatus(cwd)
}

// Set alias
export async function setAlias(cwd: string): Promise<void> {
  // Try to generate aliases from package.json first
  const success = await generateShellAliases(cwd)

  // If no package.json or user cancelled, ask if they want to set custom alias
  if (!success) {
    const shouldCustom = await prompts.confirm({
      message: 'Do you want to set a custom alias?',
      initialValue: true,
    })

    if (prompts.isCancel(shouldCustom)) {
      prompts.cancel('Cancelled')
      process.exit(0)
    }

    if (shouldCustom) {
      await generateCustomAlias(cwd)
    } else {
      prompts.cancel('Cancelled')
      process.exit(0)
    }
  }
}

// List all aliases
export function listAliases(): void {
  const config = readAliasConfig()
  const aliases = Object.entries(config.aliases)

  if (aliases.length === 0) {
    prompts.log.info(yellow('No alias configuration'))
    return
  }

  prompts.intro(blue('📋 Current alias list'))
  for (const [alias, script] of aliases) {
    console.log(`  ${cyan(alias)} ${yellow('→')} ${green(script)}`)
  }
}

// Remove alias
export async function removeAlias(): Promise<void> {
  const config = readAliasConfig()
  const aliases = Object.entries(config.aliases)

  if (aliases.length === 0) {
    prompts.log.info(yellow('No alias configuration'))
    return
  }

  prompts.intro(blue('🗑️  Remove alias'))

  const alias = await prompts.select({
    message: 'Select alias to remove:',
    options: aliases.map(([name, script]) => ({
      value: name,
      label: `${cyan(name)} ${yellow('→')} ${green(script)}`,
    })),
  })

  if (prompts.isCancel(alias)) {
    prompts.cancel('Cancelled')
    process.exit(0)
  }

  const aliasName = alias as string
  delete config.aliases[aliasName]
  saveAliasConfig(config)

  // Regenerate alias script file
  generateAliasScriptFile()

  prompts.log.success(`${green('Alias removed:')} ${cyan(aliasName)}`)

  // Prompt user to source the updated alias script
  const shellConfigFile = getShellConfigFile()
  if (shellConfigFile) {
    prompts.log.info(
      yellow('Alias script file updated. Run ') +
        cyan(`source ${shellConfigFile}`) +
        yellow(' or restart your terminal to apply changes')
    )
  } else {
    prompts.log.info(
      yellow(
        'Alias script file updated. Restart your terminal to apply changes'
      )
    )
  }
}

// Initialize alias script file and add source line to shell config
export async function initAliasScript(): Promise<void> {
  prompts.intro(blue('🚀 Initialize ely aliases'))

  // Read config and shell aliases to find orphaned aliases
  const config = readAliasConfig()
  const shellAliases = readShellAliases()

  // Find aliases that exist in config but not in shell (orphaned aliases)
  const orphanedAliases: [string, string][] = []
  for (const [aliasName, scriptName] of Object.entries(config.aliases)) {
    // Check if this alias exists in shell
    const shellAliasValue = shellAliases[aliasName]
    const shellScriptName = shellAliasValue
      ? extractScriptFromElyAlias(shellAliasValue)
      : null

    // If alias doesn't exist in shell or has different script, it's orphaned
    if (!shellScriptName || shellScriptName !== scriptName) {
      orphanedAliases.push([aliasName, scriptName])
    }
  }

  // Ask user if they want to delete orphaned aliases
  if (orphanedAliases.length > 0) {
    prompts.log.step(
      blue(
        `Found ${cyan(orphanedAliases.length.toString())} alias(es) in config that are not in shell:`
      )
    )
    for (const [aliasName, scriptName] of orphanedAliases) {
      console.log(`  ${cyan(aliasName)} ${yellow('→')} ${green(scriptName)}`)
    }

    const shouldDelete = await prompts.confirm({
      message: 'Do you want to delete these orphaned aliases?',
      initialValue: false,
    })

    if (prompts.isCancel(shouldDelete)) {
      prompts.cancel('Cancelled')
      process.exit(0)
    }

    if (shouldDelete) {
      // Delete orphaned aliases from config
      for (const [aliasName] of orphanedAliases) {
        delete config.aliases[aliasName]
      }
      saveAliasConfig(config)
      prompts.log.success(
        `${green('✓')} Deleted ${cyan(orphanedAliases.length.toString())} orphaned alias(es)`
      )
    }
  }

  // Generate alias script file
  generateAliasScriptFile()

  const shellConfigFile = getShellConfigFile()
  if (!shellConfigFile) {
    prompts.log.warn(yellow('Could not detect shell config file'))
    prompts.log.info(
      yellow('Please manually add this line to your shell config file:')
    )
    console.log(
      cyan(`  [ -f "${aliasScriptFile}" ] && source "${aliasScriptFile}"`)
    )
    return
  }

  if (hasSourceLineInConfig(shellConfigFile)) {
    prompts.log.success(
      `${green('✓')} Source line already exists in ${cyan(shellConfigFile)}`
    )
    prompts.log.info(
      yellow('Run ') +
        cyan(`source ${shellConfigFile}`) +
        yellow(' or restart your terminal')
    )
    return
  }

  const added = addSourceLineToConfig(shellConfigFile)
  if (added) {
    prompts.log.success(
      `${green('✓')} Alias script file generated: ${cyan(aliasScriptFile)}`
    )
    prompts.log.success(
      `${green('✓')} Source line added to ${cyan(shellConfigFile)}`
    )
    prompts.log.info(
      yellow('\n💡 Run ') +
        cyan(`source ${shellConfigFile}`) +
        yellow(' or restart your terminal to use the aliases')
    )
  } else {
    prompts.log.error(red(`Failed to add source line to ${shellConfigFile}`))
    prompts.log.info(yellow('Please manually add this line:'))
    console.log(
      cyan(`  [ -f "${aliasScriptFile}" ] && source "${aliasScriptFile}"`)
    )
  }
}

// List shell aliases
export function listShellAliases(): void {
  const shell = getDefaultShell()
  const shellName = shell.split('/').pop() || shell

  prompts.intro(blue(`🔍 Reading aliases from ${cyan(shellName)}`))

  const aliases = readShellAliases()
  const aliasEntries = Object.entries(aliases)

  if (aliasEntries.length === 0) {
    prompts.log.info(yellow('No shell aliases found'))
    return
  }

  prompts.log.step(
    blue(`📋 Found ${cyan(aliasEntries.length.toString())} shell aliases:`)
  )
  for (const [alias, value] of aliasEntries) {
    console.log(`  ${cyan(alias)} ${yellow('→')} ${green(value)}`)
  }
}
