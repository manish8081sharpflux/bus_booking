import { expect, test } from '@playwright/test'

const routes = ['/', '/search', '/bookings', '/offers', '/profile']
const viewports = [
  { name: 'small-android', width: 360, height: 800 },
  { name: 'iphone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
]

for (const viewport of viewports) {
  test.describe(`${viewport.name} viewport`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const route of routes) {
      test(`${route} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route)
        await page.waitForLoadState('domcontentloaded')
        const dims = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(dims.scrollWidth).toBeLessThanOrEqual(dims.clientWidth + 2)
      })
    }

    test('interactive controls remain usable', async ({ page }) => {
      await page.goto('/')
      const smallControls = await page.locator('button:visible, a:visible, input:visible').evaluateAll((els) =>
        els.filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && (r.height < 36 || r.width < 28)
        }).length,
      )
      expect(smallControls).toBeLessThanOrEqual(3)
    })
  })
}
