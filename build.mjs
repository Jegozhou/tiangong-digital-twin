import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const realWing = path.resolve('src/models/SolarWingFactory.js');
const realArm = path.resolve('src/models/RoboticArmFactory.js');
const useStubWing = !fs.existsSync(realWing);
const useStubArm = !fs.existsSync(realArm);
if (useStubWing) console.warn('[build] SolarWingFactory.js missing — using development stub');
if (useStubArm) console.warn('[build] RoboticArmFactory.js missing — using development stub');

const stubPlugin = {
  name: 'dev-stubs',
  setup(build) {
    if (useStubWing) build.onResolve({ filter: /SolarWingFactory\.js$/ }, () => ({ path: path.resolve('tests/stubs/SolarWingFactory.js') }));
    if (useStubArm) build.onResolve({ filter: /RoboticArmFactory\.js$/ }, () => ({ path: path.resolve('tests/stubs/RoboticArmFactory.js') }));
  }
};

const result = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'app.js',
  format: 'iife',
  target: ['es2020'],
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  plugins: [stubPlugin],
  logLevel: 'info'
});
console.log(`[build] app.js written (${(fs.statSync('app.js').size / 1024).toFixed(0)} KiB)`);
