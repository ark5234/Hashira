# Polynomial Reconstruction (Non-Python)

This solution reads testcases in the specified JSON format, converts mixed-base y-values, and reconstructs the minimal-degree polynomial using Lagrange interpolation over rationals (BigInt-safe). It also reports the secret f(0).

- Language/Runtime: Node.js (>= 18)
- Input: Path to a JSON testcase file
- Output: JSON including degree, coefficients (as rationals), and f(0)

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

### Java (alternative implementation)

Compile and run using the same data files:

```powershell
javac .\java\src\main\java\PolynomialFromRoots.java
java -cp .\java\src\main\java PolynomialFromRoots data\sample.json
java -cp .\java\src\main\java PolynomialFromRoots data\case2.json
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
  "degree": 6,
  "coefficients": [
    "-6290016743746469796",
    "263287321821700164753/20",
    "-1176819016069423221523/120",
    "21267399969085604485/6",
    "-2695332236994289795/4",
    "3901652238294748211/60",
    "-274832148322104827/120"
  ],
  "f0": "-6290016743746469796",
  "f0_int": "-6290016743746469796"
}
```

Notes:

- coefficients are reported lowest degree first: [c0, c1, ..., cm]
- f(0) is the constant term c0 (the "secret").

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
