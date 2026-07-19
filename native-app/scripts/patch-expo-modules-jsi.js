const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Coding',
  'JavaScriptCodable+Date.swift',
);

const ambiguous = 'abs(milliseconds) <= maxJavaScriptDateMilliseconds';
const explicit = 'Swift.abs(milliseconds) <= maxJavaScriptDateMilliseconds';
const source = fs.readFileSync(target, 'utf8');

if (source.includes(explicit)) {
  process.stdout.write('ExpoModulesJSI Xcode 26 compatibility patch already applied.\n');
} else if (source.includes(ambiguous)) {
  fs.writeFileSync(target, source.replace(ambiguous, explicit));
  process.stdout.write('Applied ExpoModulesJSI Xcode 26 compatibility patch.\n');
} else {
  throw new Error('ExpoModulesJSI source changed; review the Xcode 26 compatibility patch.');
}
