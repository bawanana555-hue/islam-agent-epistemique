# Android integration helper - README

This folder contains sample Kotlin code and resources to integrate the mini‑application (WebView) with native Android code.

What is included

- src/main/java/com/bawanana/androidintegration/MainActivity.kt
  - Example Activity that configures WebView, injects a JS bridge and calls the native downloader.

- src/main/java/com/bawanana/androidintegration/WebAppInterface.kt
  - The addJavascriptInterface bridge (AndroidApp.postMessage(jsonString)).

- src/main/java/com/bawanana/androidintegration/NativeDownloader.kt
  - Simple downloader (OkHttp) that fetches a manifest and downloads listed files with SHA-256 verification.

- src/main/res/xml/provider_paths.xml
  - FileProvider paths (if you integrate this code inside your Android app, reference this in the manifest).

- assets/webview_bridge.js
  - Small helper JS to be injected into the WebView (provides sendToNative and default onNativeMessage handler).

How to use (high level)

1) Copy the files into your Android app module (app/). Place the Kotlin files under the matching package path.
2) Add OkHttp dependency to your app build.gradle:
   implementation("com.squareup.okhttp3:okhttp:4.11.0")
   and Kotlin coroutines if not present.
3) Add the FileProvider entry to your AndroidManifest.xml inside <application>:

<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/provider_paths" />
</provider>

4) Add permissions in AndroidManifest.xml:
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />

5) In your Activity, after creating the WebView, you can inject the helper JS to make sendToNative available even if index.html does not define it:

val bridgeScript = context.assets.open("webview_bridge.js").bufferedReader().use { it.readText() }
webView.evaluateJavascript(bridgeScript, null)

6) When the web page calls sendToNative({ type:'event', name:'requestDownloadPack', data:{ manifestUrl: 'https://...' } }), the native bridge will start the download and will send progress/events back to the page through window.onNativeMessage.

Notes & limitations
- This code is a reference implementation. Adapt package names and error handling to your project needs.
- For production use consider resumable downloads, chunked hashing, and robust error handling.

