import { chromium } from '/workspace/chinese-rpg/prototype/node_modules/playwright-core/index.mjs';
const files = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1900, height: 800 }, deviceScaleFactor: 1 });
for (const f of files) {
  await p.goto('file:///workspace/desy/ui-review/src/' + f + '.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.locator('.sheet').screenshot({ path: '/workspace/desy/ui-review/' + f + '.png' }); console.log('saved', f);
}
await b.close();
