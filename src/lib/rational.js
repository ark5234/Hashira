export class Rational {
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
  eq(b){ b=Rational.from(b); return this.n===b.n && this.d===b.d; }
  toString(){ return this.d===1n ? this.n.toString() : `${this.n}/${this.d}`; }
  toBigIntExact(){ if (this.n % this.d !== 0n) throw new Error('Not an integer'); return this.n / this.d; }
}

export function abs(x){ return x<0n?-x:x; }
export function gcd(a,b){ while(b){ [a,b] = [b, a%b]; } return a; }
