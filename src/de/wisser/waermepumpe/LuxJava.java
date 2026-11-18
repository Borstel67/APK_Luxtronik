package de.wisser.waermepumpe;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * Luxtronik 2 binary protocol exactly as used by the original Java applet (wp.jar,
 * communication.Connect): big-endian int32 over TCP port 8888 (fallback 8889).
 *
 * 3003 -> cmd, len, int[len]          parameters
 * 3004 -> cmd, status, len, int[len]  calculated values
 * 3005 -> cmd, len, byte[len]         visibilities
 * 3002, id, value -> cmd, id          store one parameter
 *
 * Pure java.net so it can be unit-tested on a desktop JVM.
 */
public final class LuxJava {

    private LuxJava() { }

    private static Socket open(String host, int port) throws Exception {
        Socket s = new Socket();
        s.connect(new InetSocketAddress(host, port), 4000);
        s.setSoTimeout(8000);
        return s;
    }

    /** Reads parameters, calculated values and visibilities. Returns JSON. */
    public static String readAll(String host) throws Exception {
        Exception last = null;
        for (int port : new int[]{8888, 8889}) {
            try { return readAll(host, port); } catch (Exception e) { last = e; }
        }
        throw last;
    }

    public static String readAll(String host, int port) throws Exception {
        Socket sock = open(host, port);
        try {
            DataInputStream in = new DataInputStream(sock.getInputStream());
            DataOutputStream out = new DataOutputStream(sock.getOutputStream());
            StringBuilder sb = new StringBuilder("{\"port\":").append(port);

            out.writeInt(3003); out.writeInt(0); out.flush();
            if (in.readInt() != 3003) throw new Exception("3003: unerwartete Antwort");
            int len = in.readInt();
            check(len);
            sb.append(",\"params\":[");
            for (int i = 0; i < len; i++) { if (i > 0) sb.append(','); sb.append(in.readInt()); }
            sb.append(']');

            out.writeInt(3004); out.writeInt(0); out.flush();
            if (in.readInt() != 3004) throw new Exception("3004: unerwartete Antwort");
            in.readInt(); // status
            len = in.readInt();
            check(len);
            sb.append(",\"calc\":[");
            for (int i = 0; i < len; i++) { if (i > 0) sb.append(','); sb.append(in.readInt()); }
            sb.append(']');

            out.writeInt(3005); out.writeInt(0); out.flush();
            if (in.readInt() != 3005) throw new Exception("3005: unerwartete Antwort");
            len = in.readInt();
            check(len);
            sb.append(",\"visi\":[");
            for (int i = 0; i < len; i++) { if (i > 0) sb.append(','); sb.append(in.readByte()); }
            sb.append("]}");
            return sb.toString();
        } finally {
            try { sock.close(); } catch (Exception ignored) { }
        }
    }

    /**
     * Stores parameters one by one (like Connect.storeParameter). Input: flat int array
     * [id0, value0, id1, value1, ...]. Each write is confirmed by the controller echoing
     * 3002 and the id; on the first failure the remaining writes are not sent.
     * Returns JSON {"ok":n,"error":"..."}.
     */
    public static String write(String host, int port, int[] pairs) {
        int ok = 0;
        String err = null;
        Socket sock = null;
        try {
            sock = open(host, port);
            DataInputStream in = new DataInputStream(sock.getInputStream());
            DataOutputStream out = new DataOutputStream(sock.getOutputStream());
            for (int i = 0; i + 1 < pairs.length; i += 2) {
                int id = pairs[i], val = pairs[i + 1];
                if (id < 0 || id > 5000) throw new Exception("Parameter " + id + " ungültig");
                out.writeInt(3002); out.writeInt(id); out.writeInt(val); out.flush();
                if (in.readInt() != 3002) throw new Exception("3002: unerwartete Antwort bei " + id);
                if (in.readInt() != id) throw new Exception("3002: falsche ID bei " + id);
                ok++;
            }
        } catch (Exception e) {
            err = String.valueOf(e.getMessage());
        } finally {
            try { if (sock != null) sock.close(); } catch (Exception ignored) { }
        }
        return "{\"ok\":" + ok + (err == null ? "" : ",\"error\":\"" + err.replace("\\", "/").replace("\"", "'") + "\"") + "}";
    }

    private static void check(int len) throws Exception {
        if (len < 0 || len > 5000) throw new Exception("Ungültige Länge " + len);
    }

    /** Parses "[1,2,3]" or "1,2,3" into int[]. */
    public static int[] parseInts(String s) {
        s = s.replace("[", "").replace("]", "").trim();
        if (s.isEmpty()) return new int[0];
        String[] p = s.split(",");
        int[] r = new int[p.length];
        for (int i = 0; i < p.length; i++) r[i] = Integer.parseInt(p[i].trim());
        return r;
    }
}
