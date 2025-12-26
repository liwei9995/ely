import { existsSync } from 'node:fs'
import * as prompts from '@clack/prompts'
import colors from 'picocolors'
import { aliasScriptFile } from '../config'
import {
  addSourceLineToConfig,
  getDefaultShell,
  getShellConfigFile,
  getSourceCommand,
  hasSourceLineInConfig,
} from '../shell'

const { blue, cyan, green, yellow } = colors

/**
 * Show alias script file status and instructions
 */
export function showAliasScriptStatus(_cwd: string): void {
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

/**
 * Show alias set success message
 */
export function showAliasSetSuccess(
  aliasName: string,
  scriptName: string
): void {
  prompts.log.success(
    `${green('Alias set successfully:')} ${cyan(aliasName)} ${yellow('→')} ${cyan(scriptName)}`
  )
}

/**
 * Show alias remove success message
 */
export function showAliasRemoveSuccess(removedNames: string[]): void {
  if (removedNames.length === 1) {
    prompts.log.success(`${green('Alias removed:')} ${cyan(removedNames[0])}`)
  } else {
    prompts.log.success(
      `${green('Removed')} ${cyan(removedNames.length.toString())} ${green('aliases:')} ${cyan(removedNames.join(', '))}`
    )
  }
}

/**
 * Show alias list
 */
export function showAliasList(aliases: Record<string, string>): void {
  const shell = getDefaultShell()
  const shellName = shell.split('/').pop() || shell

  prompts.intro(blue(`🔍 Reading aliases from ${cyan(shellName)}`))

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
