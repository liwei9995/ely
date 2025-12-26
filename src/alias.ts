import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
  readShellAliases,
} from './shell'

const { blue, cyan, green, red, yellow } = colors

// Extract alias names from existing script file
function extractAliasNamesFromScript(): Set<string> {
  const aliasNames = new Set<string>()
  if (!existsSync(aliasScriptFile)) {
    return aliasNames
  }

  try {
    const content = readFileSync(aliasScriptFile, 'utf-8')
    // Match lines like "alias name='...'" or "unalias name ..."
    const aliasRegex = /(?:^|\n)(?:alias|unalias)\s+([a-zA-Z0-9_:-]+)/g
    const matches = content.matchAll(aliasRegex)
    for (const match of matches) {
      aliasNames.add(match[1])
    }
  } catch {
    // Ignore errors when reading old script file
  }

  return aliasNames
}

// Generate shell alias script from config
function getShellAliasScript(): string {
  const config = readAliasConfig()

  // Get all aliases from old script file (including deleted ones)
  const oldAliasNames = extractAliasNamesFromScript()

  // Build script: first unalias all old aliases, then define new ones
  const unaliasCommands: string[] = []
  const aliasCommands: string[] = []

  // Unalias all old aliases (including deleted ones)
  for (const aliasName of oldAliasNames) {
    unaliasCommands.push(`unalias ${aliasName} 2>/dev/null || true`)
  }

  // Unalias removed aliases (default aliases that were removed)
  const removedAliases = config.removedAliases || []
  for (const aliasName of removedAliases) {
    unaliasCommands.push(`unalias ${aliasName} 2>/dev/null || true`)
  }

  // Define new aliases
  for (const [alias, script] of Object.entries(config.aliases)) {
    aliasCommands.push(`alias ${alias}='${script}'`)
  }

  // Combine unalias and alias commands
  const allCommands = [...unaliasCommands, ...aliasCommands]

  return allCommands.join('\n')
}

// Generate and save alias script file
export function generateAliasScriptFile(): void {
  const script = getShellAliasScript()

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
function showAliasScriptStatus(_cwd: string): void {
  const shellConfigFile = getShellConfigFile()
  let sourceLineAdded = false
  let needsManualSetup = false

  // Handle shell config file setup
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
      sourceLineAdded = true
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
      needsManualSetup = true
    }
  } else if (shellConfigFile && hasSourceLineInConfig(shellConfigFile)) {
    // Source line already exists, just confirm the update
    prompts.log.success(
      `${green('✓')} Alias script file updated: ${cyan(aliasScriptFile)}`
    )
    sourceLineAdded = true
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
    needsManualSetup = true
  }

  // Provide instructions to make alias immediately effective
  if (existsSync(aliasScriptFile)) {
    const sourceCmd = getSourceCommand()

    // Note: We cannot directly modify the parent shell environment from Node.js
    // So we provide clear instructions for the user to execute the command
    if (sourceCmd) {
      prompts.log.step(blue('💡 To make alias effective immediately, run:'))
      console.log(cyan(`  ${sourceCmd}`))
    }

    // Provide additional information based on setup status
    if (sourceLineAdded) {
      // Source line is already in config, just need to reload
      prompts.log.info(
        yellow('\n💡 Or restart your terminal to use the alias automatically.')
      )
    } else if (needsManualSetup) {
      // Need manual setup, suggest running init command
      prompts.log.info(
        yellow('\n💡 To make it permanent, run: ') + cyan('ely alias:init')
      )
    }
  }
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

  const scriptName = selected as string
  let aliasName: string

  // Loop until user provides a valid alias or cancels
  while (true) {
    const alias = await prompts.text({
      message: 'Enter alias:',
      placeholder: 'e.g.: dev, build, ely:check',
      validate: value => {
        if (!value || value.trim().length === 0) {
          return 'Alias cannot be empty'
        }
        if (!/^[a-zA-Z0-9_:-]+$/.test(value)) {
          return 'Alias can only contain letters, numbers, underscores, hyphens and colons'
        }
        return undefined
      },
    })

    if (prompts.isCancel(alias)) {
      return false
    }

    aliasName = alias as string

    // Check if alias already exists in all shell aliases (includes system defaults and loaded custom aliases)
    const shellAliases = readShellAliases()
    const existingShellAlias = shellAliases[aliasName]

    // Check if alias already exists in config (custom aliases, may not be loaded yet)
    const existingConfigAlias = config.aliases[aliasName]

    // If exists in shell aliases (could be system default or already loaded custom alias)
    if (existingShellAlias) {
      // Check if it's the same as what we're trying to set
      const shellScriptName = extractScriptFromElyAlias(existingShellAlias)
      if (shellScriptName === scriptName) {
        prompts.log.info(
          yellow(
            `Alias "${cyan(aliasName)}" already points to "${cyan(scriptName)}". No change needed.`
          )
        )
        return true
      }

      // Ask user if they want to overwrite
      const shouldOverwrite = await prompts.confirm({
        message: `Alias "${cyan(aliasName)}" already exists in shell and points to "${cyan(existingShellAlias)}". Do you want to overwrite it with "${cyan(scriptName)}"?`,
        initialValue: false,
      })

      if (prompts.isCancel(shouldOverwrite)) {
        return false
      }

      if (!shouldOverwrite) {
        // User chose not to overwrite, continue loop to ask for another alias
        continue
      }

      // User chose to overwrite, break out of loop
      break
    }

    // If exists in config but not in shell (not loaded yet)
    if (existingConfigAlias) {
      // If it's the same script, no need to overwrite
      if (existingConfigAlias === scriptName) {
        prompts.log.info(
          yellow(
            `Alias "${cyan(aliasName)}" already points to "${cyan(scriptName)}". No change needed.`
          )
        )
        return true
      }

      // Ask user if they want to overwrite
      const shouldOverwrite = await prompts.confirm({
        message: `Alias "${cyan(aliasName)}" already exists in config and points to "${cyan(existingConfigAlias)}". Do you want to overwrite it with "${cyan(scriptName)}"?`,
        initialValue: false,
      })

      if (prompts.isCancel(shouldOverwrite)) {
        return false
      }

      if (!shouldOverwrite) {
        // User chose not to overwrite, continue loop to ask for another alias
        continue
      }

      // User chose to overwrite, break out of loop
      break
    }

    // Alias doesn't exist, break out of loop
    break
  }

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

  let aliasName: string

  // Loop until user provides a valid alias or cancels
  while (true) {
    const nameInput = await prompts.text({
      message: 'Enter alias name:',
      placeholder: 'e.g.: dev, build, mycmd',
      validate: value => {
        if (!value || value.trim().length === 0) {
          return 'Alias cannot be empty'
        }
        if (!/^[a-zA-Z0-9_:-]+$/.test(value)) {
          return 'Alias can only contain letters, numbers, underscores, hyphens and colons'
        }
        return undefined
      },
    })

    if (prompts.isCancel(nameInput)) {
      prompts.cancel('Cancelled')
      process.exit(0)
    }

    aliasName = nameInput as string

    // Check if alias already exists in all shell aliases (includes system defaults and loaded custom aliases)
    const shellAliases = readShellAliases()
    const existingShellAlias = shellAliases[aliasName]

    // Check if alias already exists in config (custom aliases, may not be loaded yet)
    const existingConfigAlias = config.aliases[aliasName]

    // If exists in shell aliases (could be system default or already loaded custom alias)
    if (existingShellAlias) {
      // Ask user if they want to overwrite
      const shouldOverwrite = await prompts.confirm({
        message: `Alias "${cyan(aliasName)}" already exists in shell and points to "${cyan(existingShellAlias)}". Do you want to overwrite it?`,
        initialValue: false,
      })

      if (prompts.isCancel(shouldOverwrite)) {
        prompts.cancel('Cancelled')
        process.exit(0)
      }

      if (!shouldOverwrite) {
        // User chose not to overwrite, continue loop to ask for another alias
        continue
      }

      // User chose to overwrite, break out of loop
      break
    }

    // If exists in config but not in shell (not loaded yet)
    if (existingConfigAlias) {
      // Ask user if they want to overwrite
      const shouldOverwrite = await prompts.confirm({
        message: `Alias "${cyan(aliasName)}" already exists in config and points to "${cyan(existingConfigAlias)}". Do you want to overwrite it?`,
        initialValue: false,
      })

      if (prompts.isCancel(shouldOverwrite)) {
        prompts.cancel('Cancelled')
        process.exit(0)
      }

      if (!shouldOverwrite) {
        // User chose not to overwrite, continue loop to ask for another alias
        continue
      }

      // User chose to overwrite, break out of loop
      break
    }

    // Alias doesn't exist, break out of loop
    break
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

  const value = aliasValue as string

  config.aliases[aliasName] = value
  saveAliasConfig(config)

  prompts.log.success(
    `${green('Alias set successfully:')} ${cyan(aliasName)} ${yellow('→')} ${cyan(value)}`
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

// Fuzzy match function for alias names
function fuzzyMatch(pattern: string, text: string): boolean {
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

// Remove alias
export async function removeAlias(): Promise<void> {
  const config = readAliasConfig()
  const shellAliases = readShellAliases()

  // Merge all aliases: config aliases (custom) + shell aliases (default + custom)
  const allAliases = new Map<string, { value: string; isCustom: boolean }>()

  // Add shell aliases (includes both default and custom ones)
  for (const [name, value] of Object.entries(shellAliases)) {
    allAliases.set(name, { value, isCustom: false })
  }

  // Mark config aliases as custom
  for (const [name, script] of Object.entries(config.aliases)) {
    allAliases.set(name, { value: script, isCustom: true })
  }

  if (allAliases.size === 0) {
    prompts.log.info(yellow('No aliases found'))
    return
  }

  prompts.intro(blue('🗑️  Remove alias'))

  // Get user input for fuzzy matching (allow empty to show all)
  const searchInput = await prompts.text({
    message:
      'Enter alias name to search (supports fuzzy matching, empty to show all):',
    placeholder: 'e.g.: dev, build, or partial match',
    initialValue: '',
  })

  if (prompts.isCancel(searchInput)) {
    prompts.cancel('Cancelled')
    process.exit(0)
  }

  const searchPattern = (searchInput as string).trim()

  // Filter aliases based on fuzzy match (empty pattern matches all)
  const matchedAliases = Array.from(allAliases.entries())
    .filter(([name]) => fuzzyMatch(searchPattern, name))
    .map(([name, info]) => ({
      name,
      value: info.value,
      isCustom: info.isCustom,
    }))

  if (matchedAliases.length === 0) {
    prompts.log.info(yellow(`No aliases found matching "${searchPattern}"`))
    return
  }

  // Always show selection for user confirmation (multi-select)
  const selected = await prompts.multiselect({
    message: searchPattern
      ? `Found ${matchedAliases.length} matching alias(es). Select one or more to remove:`
      : `Select alias(es) to remove (${matchedAliases.length} total, use Space to select):`,
    options: matchedAliases.map(({ name, value, isCustom }) => ({
      value: name,
      label: `${cyan(name)} ${yellow('→')} ${green(value)} ${isCustom ? yellow('(custom)') : ''}`,
    })),
  })

  if (prompts.isCancel(selected)) {
    prompts.cancel('Cancelled')
    process.exit(0)
  }

  const selectedNames = selected as string[]
  if (selectedNames.length === 0) {
    prompts.log.info(yellow('No aliases selected'))
    return
  }

  // Remove all selected aliases
  const removedAliasNames: string[] = []
  for (const selectedName of selectedNames) {
    const aliasToRemove = matchedAliases.find(a => a.name === selectedName)
    if (!aliasToRemove) {
      prompts.log.warn(yellow(`Alias "${selectedName}" not found, skipping`))
      continue
    }

    const aliasName = aliasToRemove.name

    // Remove from config if it's a custom alias
    if (aliasToRemove.isCustom && config.aliases[aliasName]) {
      delete config.aliases[aliasName]
    }

    // If it's a default alias (not in config), add it to removedAliases
    if (!aliasToRemove.isCustom) {
      if (!config.removedAliases) {
        config.removedAliases = []
      }
      // Only add if not already in the list
      if (!config.removedAliases.includes(aliasName)) {
        config.removedAliases.push(aliasName)
      }
    }

    removedAliasNames.push(aliasName)
  }

  if (removedAliasNames.length === 0) {
    prompts.log.info(yellow('No aliases were removed'))
    return
  }

  // Save config changes
  saveAliasConfig(config)

  // Regenerate alias script file (this will unalias all old aliases including the ones we want to remove)
  generateAliasScriptFile()

  if (removedAliasNames.length === 1) {
    prompts.log.success(
      `${green('Alias removed:')} ${cyan(removedAliasNames[0])}`
    )
  } else {
    prompts.log.success(
      `${green('Removed')} ${cyan(removedAliasNames.length.toString())} ${green('aliases:')} ${cyan(removedAliasNames.join(', '))}`
    )
  }

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
