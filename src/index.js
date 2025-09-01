// Reconstruct polynomial coefficients and secret f(0) from mixed-base roots using Lagrange interpolation over rationals (BigInt)
// Input: JSON file path (defaults to data/sample.json)

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// --------- BigInt Rational Helpers ---------
class Rational {
  constructor(num, den = 1n) {
    if (typeof num === 'number') num = BigInt(num);
    if (typeof den === 'number') den = BigInt(den);
    if (den === 0n) throw new Error('Zero denominator');
    const g = gcd(abs(num), abs(den));
    num /= g; den /= g;
    if (den < 0n) { num = -num; den = -den; }
    this.n = num; this.d = den;
  }
  static from(x) {
    if (x instanceof Rational) return x;
    if (typeof x === 'bigint') return new Rational(x, 1n);
    if (typeof x === 'number') return new Rational(BigInt(x), 1n);
    throw new Error('Unsupported type');
  }
  add(b){ b=Rational.from(b); return new Rational(this.n*b.d + b.n*this.d, this.d*b.d); }
  sub(b){ b=Rational.from(b); return new Rational(this.n*b.d - b.n*this.d, this.d*b.d); }
  mul(b){ b=Rational.from(b); return new Rational(this.n*b.n, this.d*b.d); }
  div(b){ b=Rational.from(b); if (b.n===0n) throw new Error('Divide by zero'); return new Rational(this.n*b.d, this.d*b.n); }
  neg(){ return new Rational(-this.n, this.d); }
  inv(){ if (this.n===0n) throw new Error('Zero has no inverse'); return new Rational(this.d, this.n); }
  eq(b){ b=Rational.from(b); return this.n===b.n && this.d===b.d; }
  toString(){ return this.d===1n ? this.n.toString() : `${this.n}/${this.d}`; }
  toBigIntRounded(){ // exact only if denominator divides numerator
    if (this.n % this.d !== 0n) throw new Error('Not an integer');
    return this.n / this.d;
  }
}

function abs(x){ return x<0n?-x:x; }
function gcd(a,b){ while(b){ [a,b] = [b, a%b]; } return a; }

// Convert string in base to BigInt safely (supports up to base 36)
function parseInBase(str, base) {
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  base = Number(base);
  const s = str.toLowerCase();
  let val = 0n;
  for (const ch of s) {
    const v = BigInt(digits.indexOf(ch));
    if (v < 0n || v >= BigInt(base)) throw new Error(`Invalid digit '${ch}' for base ${base}`);
    val = val * BigInt(base) + v;
  }
  return val;
}

// --------- Polynomial over Q (Rational) helpers ---------
function polyAdd(a, b){
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(null);
  for (let i=0;i<n;i++){
    const ai = i < a.length ? a[i] : new Rational(0n);
    const bi = i < b.length ? b[i] : new Rational(0n);
    out[i] = ai.add(bi);
  }
  // trim trailing zeros
  let m = out.length - 1;
  while (m>0 && out[m].eq(0n)) m--;
  return out.slice(0, m+1);
}

function polyScale(p, s){
  s = Rational.from(s);
  return p.map(c => c.mul(s));
}

// Multiply polynomial p(x) by (x - c)
function polyMulLinear(p, c){
  c = Rational.from(c);
  const out = new Array(p.length + 1).fill(null).map(() => new Rational(0n));
  for (let i=p.length-1;i>=0;i--){
    // out[i] += -c * p[i]
    out[i] = out[i].add(p[i].neg().mul(c));
    // out[i+1] += 1 * p[i]
    out[i+1] = out[i+1].add(p[i]);
  }
  return out;
}

// Build Lagrange interpolation polynomial P(x) of degree <= k-1
function lagrangePolynomial(points){
  const k = points.length;
  let P = [new Rational(0n)];
  for (let i=0;i<k;i++){
    const xi = new Rational(points[i].x);
    const yi = new Rational(points[i].y);
    // basis numerator: prod_{j!=i} (x - xj)
    let numerPoly = [new Rational(1n)]; // constant 1
    let denom = new Rational(1n);
    for (let j=0;j<k;j++) if (j!==i){
      const xj = new Rational(points[j].x);
      numerPoly = polyMulLinear(numerPoly, xj); // multiply by (x - xj)
      denom = denom.mul(xi.sub(xj));
    }
    const Li = polyScale(numerPoly, new Rational(1n).div(denom));
    const term = polyScale(Li, yi);
    P = polyAdd(P, term);
  }
  return P;
}

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

function main(){
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('data/sample.json');
  const text = fs.readFileSync(inputPath, 'utf8');
  const obj = JSON.parse(text);
  const { points, k } = readPointsFromJson(obj);
  if (k < 1 || k > points.length) throw new Error('Invalid k');
  const subset = points.slice(0, k); // any k points suffice
  // Build polynomial and get f(0) from constant term
  const P = lagrangePolynomial(subset);
  const f0 = P[0];
  // Prepare output
  const coeffsStr = P.map(c => c.toString());
  const out = { degree: P.length - 1, coefficients: coeffsStr, f0: f0.toString() };
  // Attach integer forms when exactly integral
  try { out.f0_int = f0.toBigIntRounded().toString(); } catch {}
  const coeffsInt = [];
  let allInt = true;
  for (const c of P){
    try { coeffsInt.push(c.toBigIntRounded().toString()); }
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
