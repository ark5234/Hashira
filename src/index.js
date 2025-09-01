import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readPointsFromJsonPath } from './lib/io.js';
import { Rational } from './lib/rational.js';
import { lagrangePolynomial, polyEval } from './lib/poly.js';

function readPointsFromJson(obj){
  const { n, k } = obj.keys;
  const entries = Object.entries(obj).filter(([key]) => key !== 'keys');
  if (entries.length !== n) throw new Error(`Expected n=${n} points, got ${entries.length}`);
  const points = entries.map(([key, { base, value }]) => ({
    x: BigInt(key),
    y: parseInBase(value, base)
  }));
  // Sort by x just in case
  points.sort((a,b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));
  return { points, k };
}

function parseCli(){
  const args = process.argv.slice(2);
  const res = { input: 'data/sample.json', useAll: false, kOverride: null };
  if (args[0] && !args[0].startsWith('--')) res.input = args[0];
  for (const a of args){
    if (a === '--use-all') res.useAll = true;
    else if (a.startsWith('--k=')) res.kOverride = Number(a.split('=')[1]);
  }
  return res;
}

function main(){
  const opts = parseCli();
  const inputPath = path.resolve(opts.input);
  const { points, k } = readPointsFromJsonPath(inputPath);
  if (k < 1 || k > points.length) throw new Error('Invalid k');
  const kUse = opts.kOverride ?? k;
  if (kUse < 1 || kUse > points.length) throw new Error('Invalid k override');
  const subset = opts.useAll ? points.slice(0, points.length) : points.slice(0, kUse);
  // Build polynomial and get f(0) from constant term
  const P = lagrangePolynomial(subset);
  const f0 = P[0];
  // Verify polynomial matches all provided points
  const mismatches = [];
  for (const pt of points){
    const y = polyEval(P, new Rational(pt.x));
    const yIntOk = y.d === 1n;
    const yInt = yIntOk ? y.n : null;
    if (!yIntOk || yInt !== pt.y){
      mismatches.push({ x: pt.x.toString(), expected: pt.y.toString(), got: y.toString() });
    }
  }
  // Prepare output
  const coeffsStr = P.map(c => c.toString());
  const out = { degree: P.length - 1, coefficients: coeffsStr, f0: f0.toString(), verified: mismatches.length === 0 };
  out.used_points = subset.map(p => p.x.toString());
  if (mismatches.length) out.mismatches = mismatches;
  // Attach integer forms when exactly integral
  try { out.f0_int = f0.toBigIntExact().toString(); } catch {}
  const coeffsInt = [];
  let allInt = true;
  for (const c of P){
    try { coeffsInt.push(c.toBigIntExact().toString()); }
    catch { allInt = false; break; }
  }
  if (allInt) out.coefficients_int = coeffsInt;
  console.log(JSON.stringify(out, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  try { main(); }
  catch (e){
    console.error('Error:', e.message);
    process.exit(1);
  }
}
