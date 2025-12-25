import mri from 'mri'
import colors from 'picocolors'
import {
  initAliasScript,
  listAliases,
  listShellAliases,
  removeAlias,
  setAlias,
} from './alias'
import { interactiveSelect } from './commands'

const { blue, cyan } = colors

interface CliArgs {
  help?: boolean
  alias?: boolean
  'alias:set'?: boolean
  'alias:list'?: boolean
  'alias:remove'?: boolean
  'alias:shell'?: boolean
  'alias:init'?: boolean
  eval?: boolean
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
      'alias:shell',
      'alias:init',
      'eval',
    ],
    alias: {
      h: 'help',
      st: 'alias:set',
      ls: 'alias:list',
      rm: 'alias:remove',
      sh: 'alias:shell',
      it: 'alias:init',
      e: 'eval',
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
  ely alias:shell       List all aliases from user's default shell
  ely alias:init        Initialize alias script file and add to shell config
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
    listAliases()
    return
  }

  if (argv['alias:remove'] || command === 'alias:remove') {
    await removeAlias()
    return
  }

  if (argv['alias:shell'] || command === 'alias:shell') {
    listShellAliases()
    return
  }

  if (argv['alias:init'] || command === 'alias:init') {
    await initAliasScript()
    return
  }

  // Default behavior: interactive selection
  await interactiveSelect(cwd)
}
