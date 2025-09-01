import java.io.*;
import java.math.BigInteger;
import java.nio.file.*;
import java.util.*;

public class PolynomialFromRoots {

    // Parse map-like JSON where keys are known: keys, and numeric string keys for points
    static class Testcase {
        int n;
        int k;
        static class Point { int x; int base; String value; }
        List<Point> points = new ArrayList<>();
    }

    // Very small parser tailored to the provided schema
    static Testcase parseTestcase(String json) {
        Testcase t = new Testcase();
        // Remove whitespace
        String s = json.replaceAll("\r?\n", " ").trim();
        // Extract n and k
        t.n = Integer.parseInt(extractNumber(s, "\"n\""));
        t.k = Integer.parseInt(extractNumber(s, "\"k\""));
        // Find all point entries: "<x>": { "base": "<b>", "value": "<v>" }
        int idx = 0;
        while (true) {
            int start = s.indexOf("\"", idx);
            if (start < 0) break;
            int end = s.indexOf("\"", start + 1);
            if (end < 0) break;
            String key = s.substring(start + 1, end);
            idx = end + 1;
            if (key.equals("keys")) continue;
            // after key, find the object starting with { and ending with }
            int brace = s.indexOf("{", idx);
            if (brace < 0) break;
            int close = findMatchingBrace(s, brace);
            if (close < 0) break;
            String obj = s.substring(brace, close + 1);
            String baseStr = extractString(obj, "\"base\"");
            String valueStr = extractString(obj, "\"value\"");
            if (baseStr != null && valueStr != null) {
                Testcase.Point p = new Testcase.Point();
                try { p.x = Integer.parseInt(key); } catch (NumberFormatException e) { continue; }
                p.base = Integer.parseInt(baseStr);
                p.value = valueStr;
                t.points.add(p);
            }
            idx = close + 1;
        }
        // Sort by x
        t.points.sort(Comparator.comparingInt(a -> a.x));
        return t;
    }

    static int findMatchingBrace(String s, int openIdx){
        int depth = 0;
        for (int i=openIdx;i<s.length();i++){
            char c = s.charAt(i);
            if (c=='{') depth++;
            else if (c=='}') { depth--; if (depth==0) return i; }
        }
        return -1;
    }
    static String extractNumber(String s, String key){
        int i = s.indexOf(key);
        if (i<0) return null;
        int colon = s.indexOf(":", i);
        int j = colon+1;
        while (j<s.length() && Character.isWhitespace(s.charAt(j))) j++;
        int k = j;
        while (k<s.length() && (Character.isDigit(s.charAt(k)))) k++;
        return s.substring(j, k);
    }
    static String extractString(String s, String key){
        int i = s.indexOf(key);
        if (i<0) return null;
        int colon = s.indexOf(":", i);
        int q1 = s.indexOf('"', colon+1);
        int q2 = s.indexOf('"', q1+1);
        if (q1<0 || q2<0) return null;
        return s.substring(q1+1, q2);
    }

    // Convert from base (<=36) string to BigInteger
    static BigInteger toBigInt(String value, int base){
        String digits = "0123456789abcdefghijklmnopqrstuvwxyz";
        BigInteger b = BigInteger.valueOf(base);
        BigInteger res = BigInteger.ZERO;
        for (char c : value.toLowerCase().toCharArray()){
            int d = digits.indexOf(c);
            if (d < 0 || d >= base) throw new IllegalArgumentException("Bad digit "+c+" for base "+base);
            res = res.multiply(b).add(BigInteger.valueOf(d));
        }
        return res;
    }

    // Rational with BigInteger
    static class Rational {
        BigInteger n, d; // n/d
        Rational(BigInteger n, BigInteger d){
            if (d.signum()==0) throw new ArithmeticException("zero denom");
            if (d.signum()<0){ n = n.negate(); d = d.negate(); }
            BigInteger g = n.gcd(d);
            this.n = n.divide(g);
            this.d = d.divide(g);
        }
        static Rational of(long v){ return new Rational(BigInteger.valueOf(v), BigInteger.ONE); }
        static Rational of(BigInteger v){ return new Rational(v, BigInteger.ONE); }
        Rational add(Rational b){ return new Rational(n.multiply(b.d).add(b.n.multiply(d)), d.multiply(b.d)); }
        Rational sub(Rational b){ return new Rational(n.multiply(b.d).subtract(b.n.multiply(d)), d.multiply(b.d)); }
        Rational mul(Rational b){ return new Rational(n.multiply(b.n), d.multiply(b.d)); }
        Rational div(Rational b){ if (b.n.signum()==0) throw new ArithmeticException("div0"); return new Rational(n.multiply(b.d), d.multiply(b.n)); }
        boolean isInteger(){ return d.equals(BigInteger.ONE); }
        public String toString(){ return isInteger() ? n.toString() : n+"/"+d; }
    }

    // Polynomial ops over Q: coefficients low->high degree
    static List<Rational> polyAdd(List<Rational> a, List<Rational> b){
        int n = Math.max(a.size(), b.size());
        List<Rational> out = new ArrayList<>(Collections.nCopies(n, Rational.of(0)));
        for (int i=0;i<n;i++){
            Rational ai = i<a.size()?a.get(i):Rational.of(0);
            Rational bi = i<b.size()?b.get(i):Rational.of(0);
            out.set(i, ai.add(bi));
        }
        trim(out);
        return out;
    }
    static List<Rational> polyScale(List<Rational> p, Rational s){
        List<Rational> out = new ArrayList<>(p.size());
        for (Rational c : p) out.add(c.mul(s));
        return out;
    }
    static List<Rational> polyMulLinear(List<Rational> p, Rational c){
        List<Rational> out = new ArrayList<>(Collections.nCopies(p.size()+1, Rational.of(0)));
        for (int i=p.size()-1;i>=0;i--){
            out.set(i, out.get(i).add(p.get(i).mul(new Rational(c.n.negate(), c.d))));
            out.set(i+1, out.get(i+1).add(p.get(i)));
        }
        return out;
    }
    static void trim(List<Rational> p){
        int i = p.size()-1;
        while (i>0){
            Rational c = p.get(i);
            if (c.n.signum()==0) p.remove(i--); else break;
        }
    }

    // Lagrange polynomial from k points
    static List<Rational> lagrange(List<BigInteger> xs, List<BigInteger> ys){
        int k = xs.size();
        List<Rational> P = new ArrayList<>();
        P.add(Rational.of(0));
        for (int i=0;i<k;i++){
            Rational xi = Rational.of(xs.get(i));
            Rational yi = Rational.of(ys.get(i));
            List<Rational> numer = new ArrayList<>(); numer.add(Rational.of(1)); // 1
            Rational denom = Rational.of(1);
            for (int j=0;j<k;j++) if (j!=i){
                Rational xj = Rational.of(xs.get(j));
                numer = polyMulLinear(numer, xj);        // multiply by (x - xj)
                denom = denom.mul(xi.sub(xj));           // multiply by (xi - xj)
            }
            List<Rational> Li = polyScale(numer, new Rational(BigInteger.ONE, BigInteger.ONE).div(denom));
            List<Rational> term = polyScale(Li, yi);
            P = polyAdd(P, term);
        }
        return P;
    }

    static Rational polyEval(List<Rational> P, Rational x){
        Rational acc = Rational.of(0);
        for (int i=P.size()-1;i>=0;i--){
            acc = P.get(i).add(acc.mul(x));
        }
        return acc;
    }

    public static void main(String[] args) throws Exception {
        String input = args.length>0 ? args[0] : "data/sample.json";
        String json = Files.readString(Paths.get(input));
        Testcase t = parseTestcase(json);

        if (t.points.size() != t.n) System.err.println("Warning: expected n="+t.n+" points, got "+t.points.size());
        if (t.k < 1 || t.k > t.points.size()) throw new IllegalArgumentException("Invalid k");
        // Map to (x, y) as BigInteger
        List<BigInteger> xsAll = new ArrayList<>();
        List<BigInteger> ysAll = new ArrayList<>();
        for (Testcase.Point p : t.points){
            xsAll.add(BigInteger.valueOf(p.x));
            ysAll.add(toBigInt(p.value, p.base));
        }
        // Use first k points by default; if --use-all is provided, use all
        boolean useAll = Arrays.stream(args).anyMatch(a -> a.equals("--use-all"));
        int kUse = useAll ? xsAll.size() : t.k;
        List<BigInteger> xs = xsAll.subList(0, kUse);
        List<BigInteger> ys = ysAll.subList(0, kUse);

        List<Rational> P = lagrange(xs, ys);
        // Verify against all provided points
        boolean ok = true;
        List<String> mismatches = new ArrayList<>();
        for (int i=0;i<t.points.size();i++){
            Rational y = polyEval(P, Rational.of(xsAll.get(i)));
            boolean intOk = y.d.equals(BigInteger.ONE);
            if (!intOk || !y.n.equals(ysAll.get(i))){
                ok = false;
                mismatches.add("x="+xsAll.get(i)+" expected="+ysAll.get(i)+" got="+y);
            }
        }
        // Output
        System.out.println("degree: " + (P.size()-1));
        System.out.print("coefficients (low->high): ");
        for (int i=0;i<P.size();i++){
            if (i>0) System.out.print(", ");
            System.out.print(P.get(i));
        }
        System.out.println();
        System.out.println("f(0): " + P.get(0));
        System.out.println("verified: " + ok);
        if (!ok){
            System.out.println("mismatches: ");
            for (String m : mismatches) System.out.println("  " + m);
        }
    }
}
