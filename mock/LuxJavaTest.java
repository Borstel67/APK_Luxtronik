import de.wisser.waermepumpe.LuxJava;

/** Desktop test of the app's protocol class against mock_8888.py. */
public class LuxJavaTest {
    public static void main(String[] a) throws Exception {
        String r = LuxJava.readAll("127.0.0.1");
        int p = r.indexOf("\"params\":["), c = r.indexOf("\"calc\":["), v = r.indexOf("\"visi\":[");
        System.out.println("read ok, json bytes=" + r.length() + " params@" + p + " calc@" + c + " visi@" + v);
        String calc = r.substring(c + 8, r.indexOf(']', c));
        String[] cv = calc.split(",");
        System.out.println("calc[10] Vorlauf=" + Integer.parseInt(cv[10]) / 10.0 + "  calc[15] Aussen=" + Integer.parseInt(cv[15]) / 10.0);
        System.out.println("write -> " + LuxJava.write("127.0.0.1", 8888, LuxJava.parseInts("[2,480,105,480]")));
        String r2 = LuxJava.readAll("127.0.0.1");
        String params = r2.substring(r2.indexOf("\"params\":[") + 10, r2.indexOf(']', r2.indexOf("\"params\":[")));
        String[] pv = params.split(",");
        System.out.println("after write: param2=" + pv[2] + " param105=" + pv[105]);
        System.out.println("bad id -> " + LuxJava.write("127.0.0.1", 8888, new int[]{9999, 1}));
    }
}
