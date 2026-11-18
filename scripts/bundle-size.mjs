// Prints the size of the JavaScript the browser must download before the first screen: the entry
// script and everything index.html preloads. Lazy chunks are not counted.
import { readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const dist = join(process.argv[2] ?? 'apps/web/dist')
const html = readFileSync(join(dist, 'index.html'), 'utf-8')
const files = new Set()
for (const m of html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)) files.add(m[1])

let raw = 0
let gz = 0
for (const file of files) {
  const path = join(dist, file)
  if (!existsSync(path)) continue
  const bytes = readFileSync(path)
  raw += bytes.length
  gz += gzipSync(bytes).length
  console.log(`${file.padEnd(40)} ${(bytes.length / 1024).toFixed(1).padStart(8)} kB  gzip ${(gzipSync(bytes).length / 1024).toFixed(1).padStart(7)} kB`)
}
console.log(`${'initial JavaScript'.padEnd(40)} ${(raw / 1024).toFixed(1).padStart(8)} kB  gzip ${(gz / 1024).toFixed(1).padStart(7)} kB`)
