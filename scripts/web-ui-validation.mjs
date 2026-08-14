import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const checks = []
const add = (name, ok) => checks.push({ name, ok })
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const exists = (p) => fs.existsSync(path.join(root, p))

add('customer/operator polish stylesheet exists', exists('frontend/src/theme/web-polish.css'))
add('customer/operator polish is imported last', read('frontend/src/main.tsx').includes("./theme/web-polish.css"))
add('admin polish stylesheet exists', exists('admin-panel/src/css/busgo-polish.css'))
add('admin polish is imported', read('admin-panel/src/main.tsx').includes("./css/busgo-polish.css"))
const html = read('frontend/index.html')
add('web branding is BusGo', html.includes('BusGo') && !html.includes('Busberry'))
add('mobile viewport-fit is enabled', html.includes('viewport-fit=cover'))
const css = read('frontend/src/theme/web-polish.css')
add('phone responsive breakpoint exists', css.includes('@media (max-width: 480px)'))
add('tablet responsive breakpoint exists', css.includes('@media (max-width: 1024px)'))
add('safe-area handling exists', css.includes('safe-area-inset-bottom'))
add('focus-visible accessibility exists', css.includes(':focus-visible'))
const e2e = read('e2e/responsive.spec.ts')
for (const size of ['360', '390', '768', '1024', '1366', '1920']) {
  add(`responsive E2E includes ${size}px viewport`, e2e.includes(`width: ${size}`))
}

const failed = checks.filter(c => !c.ok)
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}`)
console.log(`\nWeb UI validation: ${checks.length - failed.length} passed, ${failed.length} failed`)
if (failed.length) process.exit(1)
