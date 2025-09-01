import fs from 'node:fs';

export function parseInBase(str, base) {
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

export function readPointsFromJsonPath(inputPath){
  const text = fs.readFileSync(inputPath, 'utf8');
  const obj = JSON.parse(text);
  const { n, k } = obj.keys;
  const entries = Object.entries(obj).filter(([key]) => key !== 'keys');
  if (entries.length !== n) throw new Error(`Expected n=${n} points, got ${entries.length}`);
  const points = entries.map(([key, { base, value }]) => ({
    x: BigInt(key),
    y: parseInBase(value, base)
  })).sort((a,b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));
  return { points, k };
}
