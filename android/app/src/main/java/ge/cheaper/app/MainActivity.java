package ge.cheaper.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

// Without this, Android recreates MainActivity from scratch whenever the
// process is evicted while backgrounded (routine under memory pressure, e.g.
// switching to another app and back) — Capacitor then reloads server.url
// from the network, which looks like the whole app refreshing. Saving and
// restoring the WebView's navigation state across that recreation keeps the
// user on the same page instead.
public class MainActivity extends BridgeActivity {
    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (savedInstanceState != null && webView != null) {
            webView.restoreState(savedInstanceState);
        }
    }
}
