import * as prompts from '@clack/prompts'
import colors from 'picocolors'
import { init } from './cli'

const { red } = colors

const cwd = process.cwd()

init(cwd).catch(error => {
  prompts.log.error(red(`Ely cli error: ${error.message}`))
  process.exit(1)
})
