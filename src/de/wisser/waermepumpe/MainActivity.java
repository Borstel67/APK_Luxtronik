package de.wisser.waermepumpe;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Hosts the Luxtronik UI (assets/index.html) in a WebView.
 * The page is loaded with the heat pump's own address as base URL so the
 * WebSocket handshake to port 8214 carries the same Origin as the original
 * web interface of the controller.
 */
public class MainActivity extends Activity {

    private WebView web;
    private SharedPreferences prefs;
    private String html;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("lux", Context.MODE_PRIVATE);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);

        html = readAsset("index.html");
        loadPage();
    }

    private void loadPage() {
        String host = prefs.getString("host", "192.168.178.120").trim();
        if (host.isEmpty()) host = "192.168.178.120";
        web.loadDataWithBaseURL("http://" + host + "/", html, "text/html", "utf-8", null);
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return "<h1>Fehler beim Laden</h1><pre>" + e + "</pre>";
        }
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.app ? app.back() : false", new android.webkit.ValueCallback<String>() {
            @Override public void onReceiveValue(String value) {
                if (!"true".equals(value)) finish();
            }
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.app && app.pause()", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.evaluateJavascript("window.app && app.resume()", null);
    }

    @Override
    public void onConfigurationChanged(Configuration c) {
        super.onConfigurationChanged(c);
        web.evaluateJavascript("window.app && app.applyTheme()", null);
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    /** Small key/value bridge so settings survive app updates and host changes. */
    public class Bridge {
        @JavascriptInterface
        public String get(String key, String def) {
            return prefs.getString(key, def);
        }

        @JavascriptInterface
        public void set(String key, String value) {
            prefs.edit().putString(key, value).apply();
        }

        @JavascriptInterface
        public boolean isNight() {
            int m = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
            return m == Configuration.UI_MODE_NIGHT_YES;
        }

        @JavascriptInterface
        public void setBarColor(final String hex) {
            runOnUiThread(new Runnable() { @Override public void run() {
                try {
                    int c = android.graphics.Color.parseColor(hex);
                    Window w = getWindow();
                    w.setStatusBarColor(c);
                    w.setNavigationBarColor(c);
                    int flags = w.getDecorView().getSystemUiVisibility();
                    boolean light = (android.graphics.Color.red(c) * 299 + android.graphics.Color.green(c) * 587
                            + android.graphics.Color.blue(c) * 114) / 1000 > 160;
                    if (light) flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    else flags &= ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                    w.getDecorView().setSystemUiVisibility(flags);
                } catch (Exception ignored) { }
            }});
        }

        /** Async read of 3003/3004/3005 via LuxJava; result goes to app.onJava(reqId, json). */
        @JavascriptInterface
        public void javaRead(final String host, final int reqId) {
            new Thread(new Runnable() { @Override public void run() {
                String json;
                try { json = LuxJava.readAll(host); }
                catch (Exception e) { json = "{\"error\":\"" + String.valueOf(e.getMessage()).replace("\"", "'") + "\"}"; }
                deliver(reqId, json);
            }}).start();
        }

        /** Async 3002 writes. pairs = "[id,val,id,val,...]"; result to app.onJava(reqId, json). */
        @JavascriptInterface
        public void javaWrite(final String host, final int port, final String pairs, final int reqId) {
            new Thread(new Runnable() { @Override public void run() {
                String json;
                try { json = LuxJava.write(host, port, LuxJava.parseInts(pairs)); }
                catch (Exception e) { json = "{\"ok\":0,\"error\":\"" + String.valueOf(e.getMessage()).replace("\"", "'") + "\"}"; }
                deliver(reqId, json);
            }}).start();
        }

        private void deliver(int reqId, String json) {
            final String js = "window.app && app.onJava(" + reqId + "," + json + ")";
            runOnUiThread(new Runnable() { @Override public void run() { web.evaluateJavascript(js, null); } });
        }

        /** Reload the page so the base URL (origin) follows a changed host. */
        @JavascriptInterface
        public void reload() {
            runOnUiThread(new Runnable() { @Override public void run() { loadPage(); } });
        }
    }
}
