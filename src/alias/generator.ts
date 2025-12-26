import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { aliasScriptFile, readAliasConfig } from '../config'

/**
 * Extract alias names from existing script file
 */
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

/**
 * Generate helper function to find and add node_modules/.bin to PATH
 */
function getNodeModulesBinHelper(): string {
  return `# Helper function to find node_modules/.bin and add to PATH
_ely_find_node_modules_bin() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    local node_bin="$dir/node_modules/.bin"
    if [ -d "$node_bin" ]; then
      export PATH="$node_bin:$PATH"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}
`
}

/**
 * Escape command for use in shell alias
 * Handles single quotes by replacing ' with '\''
 */
function escapeCommandForAlias(command: string): string {
  return command.replace(/'/g, "'\\''")
}

/**
 * Generate shell alias script
 */
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
  // 使用辅助函数来确保 node_modules/.bin 在 PATH 中
  // 在别名中内联查找逻辑，确保命令能够找到本地安装的包
  for (const [alias, command] of Object.entries(config.aliases)) {
    const escapedCommand = escapeCommandForAlias(command)
    // 在别名执行前查找并添加 node_modules/.bin 到 PATH
    // 使用函数调用，然后执行命令
    aliasCommands.push(
      `alias ${alias}='_ely_find_node_modules_bin >/dev/null 2>&1; ${escapedCommand}'`
    )
  }

  // Combine helper function, unalias and alias commands
  const helperFunction = getNodeModulesBinHelper()
  const allCommands = [helperFunction, ...unaliasCommands, ...aliasCommands]

  return allCommands.join('\n')
}

/**
 * Generate and save alias script file
 */
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
