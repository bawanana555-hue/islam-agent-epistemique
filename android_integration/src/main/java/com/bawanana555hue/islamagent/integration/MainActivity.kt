package com.bawanana555hue.islamagent.integration

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File

/**
 * Example MainActivity integrating the WebView and the native downloader.
 * This file is a sample integration and should be adapted to your app package and project structure.
 */
class MainActivity : AppCompatActivity(), WebAppInterface.WebAppListener {
    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var downloader: NativeDownloader

    private val pickFileLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val callback = filePathCallback ?: return@registerForActivityResult
        val results: Array<Uri>? = when {
            result.resultCode != Activity.RESULT_OK -> null
            result.data == null -> null
            else -> {
                val clip = result.data!!.clipData
                if (clip != null) {
                    Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                } else result.data!!.data?.let { arrayOf(it) }
            }
        }
        callback.onReceiveValue(results)
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)
        downloader = NativeDownloader(this)

        // request record audio permission early
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 1001)
        }

        val ws: WebSettings = webView.settings
        ws.javaScriptEnabled = true
        ws.domStorageEnabled = true
        ws.allowFileAccess = true
        ws.allowContentAccess = true
        ws.mediaPlaybackRequiresUserGesture = false

        // inject bridge object
        val bridge = WebAppInterface(this, this)
        webView.addJavascriptInterface(bridge, "AndroidApp")

        // inject helper JS from assets if present
        try {
            val bridgeScript = assets.open("webview_bridge.js").bufferedReader().use { it.readText() }
            webView.evaluateJavascript(bridgeScript, null)
        } catch (e: Exception) {
            Log.w("MainActivity", "No webview_bridge.js in assets to inject: ${e.message}")
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: android.webkit.PermissionRequest) {
                // grant permissions for camera/microphone requests from WebView
                request.grant(request.resources)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback = filePathCallback
                val intent = Intent(Intent.ACTION_GET_CONTENT)
                intent.addCategory(Intent.CATEGORY_OPENABLE)
                intent.type = "*/*"
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                pickFileLauncher.launch(Intent.createChooser(intent, "Choisir un fichier"))
                return true
            }
        }

        webView.webViewClient = WebViewClient()
        webView.loadUrl("file:///android_asset/index.html")
    }

    // WebAppInterface.WebAppListener impl
    override fun onDownloadPackRequested(manifestUrl: String) {
        Log.d("MainActivity", "Download requested: $manifestUrl")
        downloader.startDownload(manifestUrl, object : NativeDownloader.Callback {
            override fun onProgress(fileIndex: Int, totalFiles: Int, percentForFile: Int) {
                // relay to web (optional)
                val status = JSONObject()
                status.put("type", "progress")
                val data = JSONObject()
                data.put("fileIndex", fileIndex)
                data.put("totalFiles", totalFiles)
                data.put("percent", percentForFile)
                status.put("data", data)
                sendToWeb(status)
            }

            override fun onFileDownloaded(path: String) {
                try {
                    val file = File(path)
                    val uri = FileProvider.getUriForFile(this@MainActivity, "com.bawanana555hue.islamagent.fileprovider", file)
                    // grant temporary read permission if needed (for other apps/components)
                    try { grantUriPermission(packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) } catch (_: Exception) {}

                    // send content URI to web so the page can set audio.src = content://...
                    val evt = JSONObject()
                    evt.put("type", "command")
                    evt.put("action", "loadAudioUri")
                    val data = JSONObject(); data.put("audioUri", uri.toString()); evt.put("data", data)
                    sendToWeb(evt)

                } catch (e: Exception) {
                    Log.e("MainActivity", "onFileDownloaded error", e)
                    // fallback: send file path if URI creation fails
                    val evt = JSONObject()
                    evt.put("type", "event")
                    evt.put("name", "fileDownloaded")
                    val data = JSONObject(); data.put("path", path); evt.put("data", data)
                    sendToWeb(evt)
                }
            }

            override fun onComplete(result: NativeDownloader.DownloadResult) {
                val evt = JSONObject(); evt.put("type", "event"); evt.put("name", "downloadComplete"); val data = JSONObject(); data.put("success", result.success); data.put("message", result.message); evt.put("data", data)
                sendToWeb(evt)
            }
        })
    }

    override fun onEventFromWeb(name: String, data: org.json.JSONObject?) {
        Log.d("MainActivity", "Event from web: $name => $data")
        // handle other events if needed
    }

    override fun onMessageFromWeb(obj: org.json.JSONObject) { Log.d("MainActivity", "Message from web: $obj") }

    // helper to send JSON to web page as window.onNativeMessage
    private fun sendToWeb(obj: JSONObject) {
        val script = "window.onNativeMessage && window.onNativeMessage(${obj.toString()});"
        runOnUiThread { webView.evaluateJavascript(script, null) }
    }
}
