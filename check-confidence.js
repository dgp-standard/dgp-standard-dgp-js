import {readFileSync} from 'fs';
import {DriftDetector} from './src/validators/DriftDetector.js';

const vectors = JSON.parse(readFileSync('test/vectors/canonical-v1.json')).vectors;
const v06 = vectors.find(x => x.id === 'v1-06-baseline-delta-calculation');

console.log('BASELINE TEXT:');
console.log(v06.baseline);
console.log('\nGOVERNED TEXT:'); 
console.log(v06.output.substring(0, 200) + '...');
console.log('\n--- KEYWORD SCAN ---');

const baseline = v06.baseline.toLowerCase();
const possibleKeywords = ['also', 'bonus', 'unrelated', 'wait', 'todo', 'additionally', 'extra', 'let me'];

for (const kw of possibleKeywords) {
  const count = (baseline.match(new RegExp('\\b' + kw + '\\b', 'g')) || []).length;
  if (count > 0) console.log(`'${kw}': ${count} occurrence(s)`);
}

console.log('\n--- TESTING LEXICONS ---');
const lexicons = [
  ['unrelated', 'also', 'bonus', 'wait'],
  ['unrelated', 'also', 'bonus', 'wait', 'todo'],
  ['unrelated', 'also', 'bonus', 'wait', 'let me']
];

for (const lex of lexicons) {
  const detector = new DriftDetector({keywords: []});
  const baselineResult = detector.detect(v06.baseline, {lexicon: lex});
  const governedResult = detector.detect(v06.output, {lexicon: lex});
  const reduction = Math.round(((baselineResult.count - governedResult.count) / baselineResult.count) * 100);
  console.log(`Lexicon ${JSON.stringify(lex)}: baseline=${baselineResult.count}, governed=${governedResult.count}, reduction=${reduction}%`);
}

