const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, filename);
};
const path = require('node:path');
const root = process.env.ASL_SOURCE_ROOT || process.cwd();
const k = require(path.join(root, 'src/localization/kalmanFilter.ts'));
const l = require(path.join(root, 'src/localization/localization.ts'));
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const output = input.map(test => {
  if (test.kind === 'kalman') {
    let state = test.initial;
    return test.observations.map(z => (state = k.updateKalmanFilter(state, z, test.config)));
  }
  if (test.kind === 'ranges') {
    return l.estimatePositionFromRanges(test.observations, test.initial, test.iterations);
  }
  return l.buildLocalizationSamples(test.path, test.noise, test.rows, test.cols);
});
process.stdout.write(JSON.stringify(output));
