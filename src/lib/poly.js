import { Rational } from './rational.js';

export function polyAdd(a, b){
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(null);
  for (let i=0;i<n;i++){
    const ai = i < a.length ? a[i] : new Rational(0n);
    const bi = i < b.length ? b[i] : new Rational(0n);
    out[i] = ai.add(bi);
  }
  let m = out.length - 1;
  while (m>0 && out[m].eq(0n)) m--;
  return out.slice(0, m+1);
}

export function polyScale(p, s){
  s = Rational.from(s);
  return p.map(c => c.mul(s));
}

export function polyMulLinear(p, c){
  c = Rational.from(c);
  const out = new Array(p.length + 1).fill(null).map(() => new Rational(0n));
  for (let i=p.length-1;i>=0;i--){
    out[i] = out[i].add(p[i].neg().mul(c));
    out[i+1] = out[i+1].add(p[i]);
  }
  return out;
}

export function lagrangePolynomial(points){
  const k = points.length;
  let P = [new Rational(0n)];
  for (let i=0;i<k;i++){
    const xi = Rational.from(points[i].x);
    const yi = Rational.from(points[i].y);
    let numerPoly = [new Rational(1n)];
    let denom = new Rational(1n);
    for (let j=0;j<k;j++) if (j!==i){
      const xj = Rational.from(points[j].x);
      numerPoly = polyMulLinear(numerPoly, xj);
      denom = denom.mul(xi.sub(xj));
    }
    const Li = polyScale(numerPoly, new Rational(1n).div(denom));
    const term = polyScale(Li, yi);
    P = polyAdd(P, term);
  }
  return P;
}

export function polyEval(P, x){
  // Horner evaluation for rationals
  x = Rational.from(x);
  let acc = new Rational(0n);
  for (let i=P.length-1;i>=0;i--){
    acc = P[i].add(acc.mul(x));
  }
  return acc;
}
