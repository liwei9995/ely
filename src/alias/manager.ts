import * as prompts from '@clack/prompts'
import colors from 'picocolors'
import {
  aliasScriptFile,
  readAliasConfig,
  readPackageJson,
  saveAliasConfig,
} from '../config'
import {
  addSourceLineToConfig,
  extractScriptFromElyAlias,
  getShellConfigFile,
  hasSourceLineInConfig,
  readShellAliases,
} from '../shell'
import type {
  AliasConflictResult,
  AliasInfo,
  MatchedAlias,
  OrphanedAlias,
} from '../types'
import {
  detectPackageManager,
  formatCommandWithPackageManager,
} from '../utils/package-manager'
import { generateAliasScriptFile } from './generator'
import {
  showAliasList,
  showAliasRemoveSuccess,
  showAliasScriptStatus,
  showAliasSetSuccess,
} from './ui'
import { fuzzyMatch, validateAliasName, validateAliasValue } from './validator'

const { blue, cyan, green, red, yellow } = colors

/**
 * Check if alias already exists and handle conflicts
 */
async function handleAliasConflict(
  aliasName: string,
  targetValue: string,
  isCustom = false
): Promise<AliasConflictResult> {
  const shellAliases = readShellAliases()
  const config = readAliasConfig()
  const existingShellAlias = shellAliases[aliasName]
  const existingConfigAlias = config.aliases[aliasName]

  // Check shell aliases first
  if (existingShellAlias) {
    // 提取 shell alias 中的实际命令值（去除引号等）
    const shellAliasValue = extractScriptFromElyAlias(existingShellAlias)

    if (!isCustom) {
      // For script aliases, check if it's the same command
      if (shellAliasValue === targetValue) {
        prompts.log.info(
          yellow(
            `Alias "${cyan(aliasName)}" already points to "${cyan(targetValue)}". No change needed.`
          )
        )
        return 'skip'
      }
    }

    const shouldOverwrite = await prompts.confirm({
      message: `Alias "${cyan(aliasName)}" already exists in shell and points to "${cyan(shellAliasValue || existingShellAlias)}". Do you want to overwrite it with "${cyan(targetValue)}"?`,
      initialValue: false,
    })

    if (prompts.isCancel(shouldOverwrite)) {
      return 'cancel'
    }

    if (!shouldOverwrite) {
      return 'skip'
    }

    return 'overwrite'
  }

  // Check config aliases
  if (existingConfigAlias) {
    if (existingConfigAlias === targetValue) {
      prompts.log.info(
        yellow(
          `Alias "${cyan(aliasName)}" already points to "${cyan(targetValue)}". No change needed.`
        )
      )
      return 'skip'
    }

    const shouldOverwrite = await prompts.confirm({
      message: `Alias "${cyan(aliasName)}" already exists in config and points to "${cyan(existingConfigAlias)}". Do you want to overwrite it with "${cyan(targetValue)}"?`,
      initialValue: false,
    })

    if (prompts.isCancel(shouldOverwrite)) {
      return 'cancel'
    }

    if (!shouldOverwrite) {
      return 'skip'
    }

    return 'overwrite'
  }

  return 'overwrite'
}

/**
 * Generate shell aliases from package.json
 */
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
  const rawCommand = pkg.scripts[scriptName]

  if (!rawCommand) {
    prompts.log.error(red('Command not found'))
    return false
  }

  // Detect package manager and format command
  const pmInfo = detectPackageManager(cwd)
  const command = formatCommandWithPackageManager(scriptName, pmInfo.manager)

  let aliasName: string

  // Loop until user provides a valid alias or cancels
  while (true) {
    const alias = await prompts.text({
      message: 'Enter alias:',
      placeholder: 'e.g.: dev, build, ely:check',
      validate: validateAliasName,
    })

    if (prompts.isCancel(alias)) {
      return false
    }

    aliasName = alias as string

    // 检查别名是否已存在，如果存在则提示是否覆盖
    const conflictResult = await handleAliasConflict(
      aliasName,
      command, // 传入完整的命令用于比较
      false
    )
    if (conflictResult === 'cancel') {
      return false
    }
    if (conflictResult === 'skip') {
      return true
    }
    if (conflictResult === 'overwrite') {
      break
    }
  }

  // 保存格式为 "自定义别名": "pnpm run dev"
  config.aliases[aliasName] = command
  saveAliasConfig(config)

  showAliasSetSuccess(aliasName, command)

  // Generate alias script file
  generateAliasScriptFile()

  // Show status and instructions
  showAliasScriptStatus(cwd)

  return true
}

/**
 * Generate custom alias
 */
export async function generateCustomAlias(cwd: string): Promise<void> {
  const config = readAliasConfig()

  prompts.intro(blue('🔖 Set custom alias'))

  let aliasName: string

  // Loop until user provides a valid alias or cancels
  while (true) {
    const nameInput = await prompts.text({
      message: 'Enter alias name:',
      placeholder: 'e.g.: dev, build, mycmd',
      validate: validateAliasName,
    })

    if (prompts.isCancel(nameInput)) {
      prompts.cancel('Cancelled')
      process.exit(0)
    }

    aliasName = nameInput as string

    const conflictResult = await handleAliasConflict(aliasName, '', true)
    if (conflictResult === 'cancel') {
      prompts.cancel('Cancelled')
      process.exit(0)
    }
    if (conflictResult === 'skip') {
      continue
    }
    if (conflictResult === 'overwrite') {
      break
    }
  }

  const aliasValue = await prompts.text({
    message: 'Enter alias value (script name):',
    placeholder: 'e.g.: dev, build, test',
    validate: validateAliasValue,
  })

  if (prompts.isCancel(aliasValue)) {
    prompts.cancel('Cancelled')
    process.exit(0)
  }

  const value = aliasValue as string

  config.aliases[aliasName] = value
  saveAliasConfig(config)

  showAliasSetSuccess(aliasName, value)

  // Generate alias script file
  generateAliasScriptFile()

  // Show status and instructions
  showAliasScriptStatus(cwd)
}

/**
 * Set alias (from package.json or custom)
 */
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

/**
 * Remove alias
 */
export async function removeAlias(): Promise<void> {
  const config = readAliasConfig()
  const shellAliases = readShellAliases()

  // Merge all aliases: config aliases (custom) + shell aliases (default + custom)
  const allAliases = new Map<string, AliasInfo>()

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
  const matchedAliases: MatchedAlias[] = Array.from(allAliases.entries())
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

  showAliasRemoveSuccess(removedAliasNames)

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

/**
 * Initialize alias script file
 */
export async function initAliasScript(): Promise<void> {
  prompts.intro(blue('🚀 Initialize ely aliases'))

  // Read config and shell aliases to find orphaned aliases
  const config = readAliasConfig()
  const shellAliases = readShellAliases()

  // Find aliases that exist in config but not in shell (orphaned aliases)
  const orphanedAliases: OrphanedAlias[] = []
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

/**
 * List shell aliases
 */
export function listShellAliases(): void {
  const aliases = readShellAliases()
  showAliasList(aliases)
}
