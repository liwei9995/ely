import * as prompts from '@clack/prompts'
import mri from 'mri'
import colors from 'picocolors'
import {
  initAliasScript,
  listShellAliases,
  removeAlias,
  setAlias,
} from './alias'
import { interactiveSelect } from './commands'
import { isElyInitialized } from './shell'

const { blue, cyan, yellow } = colors

interface CliArgs {
  help?: boolean
  alias?: boolean
  'alias:set'?: boolean
  'alias:list'?: boolean
  'alias:remove'?: boolean
  'alias:init'?: boolean
  _?: string[]
}

export async function init(cwd: string): Promise<void> {
  const argv = mri<CliArgs>(process.argv.slice(2), {
    boolean: [
      'help',
      'alias',
      'alias:set',
      'alias:list',
      'alias:remove',
      'alias:init',
    ],
    alias: {
      h: 'help',
      st: 'alias:set',
      ls: 'alias:list',
      rm: 'alias:remove',
      it: 'alias:init',
    },
  })

  if (argv.help) {
    console.log(`
${blue('ely')} - Quick project command execution tool

${cyan('Usage:')}
  ely                   Interactive command selection and execution
  ely alias:set         Set command alias and generate alias script file
  ely alias:list        List all aliases
  ely alias:remove      Remove alias
  ely alias:init        Initialize or repair alias script file and shell config
`)
    process.exit(0)
  }

  // Check position arguments (e.g., "ely alias:list")
  const command = (argv._?.[0] as string) || ''

  if (argv['alias:set'] || argv.alias === true || command === 'alias:set') {
    await setAlias(cwd)
    return
  }

  if (argv['alias:list'] || command === 'alias:list') {
    listShellAliases()
    return
  }

  if (argv['alias:remove'] || command === 'alias:remove') {
    await removeAlias()
    return
  }

  if (argv['alias:init'] || command === 'alias:init') {
    await initAliasScript()
    return
  }

  // Check if ely is initialized on first run (only prompt if not initialized)
  // Skip prompt if user explicitly runs a command or if already initialized
  const isInitialized = isElyInitialized()
  const hasSkipEnv = process.env.ELY_SKIP_INIT_PROMPT !== undefined
  if (isInitialized) {
    // Already initialized, skip prompt
  } else if (hasSkipEnv) {
    // User explicitly skipped, don't prompt
  } else {
    const shouldInit = await prompts.confirm({
      message:
        'Ely aliases are not initialized. Would you like to initialize them now?',
      initialValue: true,
    })

    if (prompts.isCancel(shouldInit)) {
      prompts.cancel('Cancelled')
      process.exit(0)
    }

    if (shouldInit) {
      await initAliasScript()
      // After initialization, continue with interactive selection
      prompts.log.info(
        yellow('\n💡 You can now use aliases in your terminal. Running ely...')
      )
    }
  }

  // Default behavior: interactive selection
  await interactiveSelect(cwd)
}
