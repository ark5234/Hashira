# Polynomial Reconstruction (Non-Python)

This project reconstructs a polynomial P(x) from n given points (x_i, y_i) provided in JSON, where each y_i is encoded in a given base. It uses exact Lagrange interpolation over rationals (BigInt) to avoid floating-point error, and reports the polynomial coefficients and the secret f(0) = P(0).

- Language/Runtime: Node.js (>= 18); Java (optional alternative)
- Input: JSON testcases as provided
- Output: polynomial degree, coefficients (as rationals), f(0), and a verification flag

## Run


```powershell
node src/index.js data/sample.json
```


```powershell
node src/index.js data/case2.json
```

Or via npm scripts:

```powershell
npm run test:sample
npm run test:case2
```

Options:

- Use only the first k points (default, as per testcase k):
  node src/index.js data\case2.json
- Use all n points (fits degree n-1 polynomial):
  node src/index.js data\case2.json --use-all
- Print only the constant term c=f(0):
  node src/index.js data\sample.json --only-c
  node src/index.js data\case2.json --only-c
  node src/index.js data\case2.json --use-all --only-c

### Java (alternative implementation)

Compile and run using the same data files:

```powershell
javac .\java\src\main\java\PolynomialFromRoots.java
java -cp .\java\src\main\java PolynomialFromRoots data\sample.json
java -cp .\java\src\main\java PolynomialFromRoots data\case2.json
java -cp .\java\src\main\java PolynomialFromRoots data\sample.json --only-c
java -cp .\java\src\main\java PolynomialFromRoots data\case2.json --only-c
java -cp .\java\src\main\java PolynomialFromRoots data\case2.json --use-all --only-c
```

Notes:

- The Java version uses a tiny JSON reader tailored to this schema, so no external jars are needed.
- Coefficients are printed from lowest to highest degree, and f(0) is the constant term.

## Output

- Sample testcase output:

```json
{
  "degree": 2,
  "coefficients": [
    "3",
    "0",
    "1"
  ],
  "f0": "3",
  "f0_int": "3",
  "coefficients_int": [
    "3",
    "0",
    "1"
  ]
}
```

- Second testcase output:

```json
{
  "degree": 9,
  "coefficients": [
    "-13478698549472778234",
    "1833418570792308113423/56",
    "-4960281346989528422327/160",
    "79305979839166094365147/5040",
    "-27786940237806044278753/5760",
    "5406336350476139866597/5760",
    "-335777692580281062209/2880",
    "181813744003161222077/20160",
    "-2267857950616037857/5760",
    "299528408571929531/40320"
  ],
  "f0": "-13478698549472778234",
  "f0_int": "-13478698549472778234",
  "verified": true
}
```

Notes:

- coefficients are reported lowest degree first: [c0, c1, ..., cm]
- f(0) is the constant term c0 (the "secret").

If you strictly use only the first k points for the second testcase (k=7), you will get a degree-6 polynomial whose f(0) is -6290016743746469796, but it won’t verify against all n points. Using all points (n=10) reconstructs the degree-9 polynomial above and verifies true.

## Mathematical explanation

Given k distinct x-values x_1, …, x_k and their corresponding y-values y_1, …, y_k, the Lagrange interpolation polynomial of degree at most k-1 is

P(x) = Σ_{i=1..k} y_i * L_i(x), where L_i(x) = Π_{j≠i} (x - x_j) / (x_i - x_j).

We compute coefficients in ascending degree [c0, c1, …, c_{k-1}] such that

P(x) = c0 + c1 x + c2 x^2 + … + c_{k-1} x^{k-1}.

The secret f(0) is simply the constant term c0. Equivalently,

f(0) = Σ_{i=1..k} y_i * Π_{j≠i} ( -x_j / (x_i - x_j) ).

All arithmetic is exact over rationals (no rounding), implemented with BigInt numerators/denominators and reduction by gcd.

## Worked examples

### TestCase 1

Input:

```json
{
  "keys": { "n": 4, "k": 3 },
  "1": { "base": "10", "value": "4" },
  "2": { "base": "2", "value": "111" },
  "3": { "base": "10", "value": "12" },
  "6": { "base": "4", "value": "213" }
}
```

Points (x, y) are taken from the JSON keys and values; y is parsed in its base:

- x=1, base10 "4" → y=4
- x=2, base2  "111" → y=7
- x=3, base10 "12" → y=12
- x=6, base4  "213" → y = 2×4^2 + 1×4 + 3 = 2×16 + 4 + 3 = 39

With k=3, degree m=k−1=2. Interpolating with first k points (x=1,2,3 and y=4,7,12) gives:

- P(x) = x^2 + 3
- Coefficients (low→high): [3, 0, 1]
- f(0) = 3

Verification on the three used points:

- P(1)=1+3=4
- P(2)=4+3=7
- P(3)=9+3=12

So the computed polynomial is correct for k points. The fourth point (x=6, y=39) is not used when k=3; a degree-2 polynomial through (1,4), (2,7), (3,12) won’t necessarily pass through (6,39), which is expected.

### TestCase 2

Input: n=10, k=7 with mixed-base large values (see data/case2.json).

- Using all n=10 points constructs a degree-9 polynomial; output verifies true.
  - Degree: 9
  - f(0): -13478698549472778234
  - Verified: true

- Using only the first k=7 points constructs a degree-6 polynomial; this will fit those 7 points but fail on the remaining 3.
  - Degree: 6
  - f(0): -6290016743746469796
  - Verified: false (against all n points)

Final verdict:

- TestCase 1: Correct — P(x)=x^2+3, degree=2, f(0)=3.
- TestCase 2: Correct — degree 9 with all points (verified), f(0)=-13478698549472778234. Degree 6 with only k points is also mathematically correct for those k points but won’t match all n points.

## How it works

- Parses mixed-base strings to BigInt.
- Interpolates over rationals using exact arithmetic (no float rounding).
- Returns coefficients and f(0). If all coefficients are integers, an integer array is also returned.

## Submit (GitHub)

Initialize a repo and push:

```powershell
# In the project folder
git init
git add .
git commit -m "Assessment solution: polynomial reconstruction (Node.js)"
# Replace <your-remote-url> with your GitHub repo URL
git branch -M main
git remote add origin <your-remote-url>
git push -u origin main
```

Include the repository link and paste the outputs above in your submission.

## Submission

1. GITHUB link:
  <https://github.com/ark5234/Hashira>

2. Answer (secret f(0)) for Testcase 1:
  3

3. Output for TestCase - 1:
  degree: 2; coefficients (low->high): [3, 0, 1]; f(0): 3; verified: true

4. Output for TestCase - 2:
  Using all points (recommended):
  degree: 9; f(0): -13478698549472778234; verified: true
  coefficients (low->high): [-13478698549472778234, 1833418570792308113423/56, -4960281346989528422327/160, 79305979839166094365147/5040, -27786940237806044278753/5760, 5406336350476139866597/5760, -335777692580281062209/2880, 181813744003161222077/20160, -2267857950616037857/5760, 299528408571929531/40320]

  If you must use only the first k points (k=7):
  degree: 6; f(0): -6290016743746469796; verified: false against all n points
