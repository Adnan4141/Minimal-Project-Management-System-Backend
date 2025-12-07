import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import { resolve } from 'path'

const require = createRequire(import.meta.url)
require('tsx/cjs/register')

const serverPath = resolve(process.cwd(), 'src/server.ts')
const serverUrl = pathToFileURL(serverPath).href
const { default: app } = await import(serverUrl)

export default app

