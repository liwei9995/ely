/**
 * Application constants
 */

/**
 * Configuration directory and file names
 */
export const CONFIG_DIR_NAME = '.ely'
export const ALIASES_CONFIG_FILE = 'aliases.json'
export const ALIASES_SCRIPT_FILE = 'aliases.sh'

/**
 * PATH environment variable constants
 */
export const PATH_SEPARATOR_WINDOWS = ';'
export const PATH_SEPARATOR_UNIX = ':'
export const NODE_MODULES_BIN = 'node_modules/.bin'

/**
 * Shell-related constants
 */
export const WINDOWS_SHELL_ARGS = ['/d', '/s', '/c'] as const
export const UNIX_SHELL_ARGS = ['-c'] as const
export const INTERACTIVE_SHELL_ARGS = ['-i', '-c'] as const
export const DEFAULT_WINDOWS_SHELL = 'cmd.exe'
export const DEFAULT_UNIX_SHELL = '/bin/sh'

/**
 * Package manager lock file names
 */
export const LOCK_FILES = {
  npm: 'package-lock.json',
  pnpm: 'pnpm-lock.yaml',
  yarn: 'yarn.lock',
  bun: 'bun.lockb',
} as const

/**
 * Package manager executable names
 */
export const PACKAGE_MANAGERS = {
  npm: 'npm',
  pnpm: 'pnpm',
  yarn: 'yarn',
  bun: 'bun',
} as const

/**
 * CLI command aliases
 */
export const CLI_ALIASES = {
  h: 'help',
  st: 'alias:set',
  ls: 'alias:list',
  rm: 'alias:remove',
  it: 'alias:init',
} as const

/**
 * CLI boolean arguments
 */
export const CLI_BOOLEAN_ARGS = [
  'help',
  'alias',
  'alias:set',
  'alias:list',
  'alias:remove',
  'alias:init',
] as const

/**
 * Environment variable names
 */
export const ENV_VARS = {
  ELY_SKIP_INIT_PROMPT: 'ELY_SKIP_INIT_PROMPT',
  ELY_EVAL_MODE: 'ELY_EVAL_MODE',
} as const

/**
 * Alias prefix for shell commands
 */
export const ALIAS_PREFIX = 'alias '
