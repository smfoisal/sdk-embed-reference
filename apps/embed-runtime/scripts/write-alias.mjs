// Writes the channel alias, e.g. dist/v1/flarie.js -> ../1.0.0/flarie.js
//
// CDN layout:
//   /embed/1.0.0/flarie.js   Cache-Control: public, max-age=31536000, immutable
//   /embed/1.0.0/chunks/*    Cache-Control: public, max-age=31536000, immutable
//   /embed/v1/flarie.js      Cache-Control: public, max-age=300   <- only this changes on release
//
// Releasing 1.0.1 = upload 1.0.1/ and repoint the tiny alias. Rolling back = repoint it again.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const channel = `v${version.split('.')[0]}`;
const dir = new URL(`../dist/${channel}/`, import.meta.url);

mkdirSync(dir, { recursive: true });
writeFileSync(new URL('flarie.js', dir), `// Channel ${channel} -> ${version}\nimport '../${version}/flarie.js';\n`);
writeFileSync(new URL('manifest.json', dir), JSON.stringify({ channel, version, releasedAt: new Date().toISOString() }, null, 2));
console.log(`alias ${channel}/flarie.js -> ${version}/flarie.js`);
