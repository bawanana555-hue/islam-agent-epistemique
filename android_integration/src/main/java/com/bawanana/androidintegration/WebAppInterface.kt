package com.bawanana.androidintegration

import android.app.Activity
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * Expose a simple bridge to WebView JavaScript.
 * The Web page calls AndroidApp.postMessage(jsonString)
 */
class WebAppInterface(private val activity: Activity, private val listener: WebAppListener) {
    @JavascriptInterface
    fun postMessage(json: String) {
        Log.d("WebAppInterface", "postMessage: $json")
        try {
            val obj = JSONObject(json)
            val type = obj.optString("type")
            if (type == "event") {
                val name = obj.optString("name")
                val data = obj.optJSONObject("data")
                when (name) {
                    "requestDownloadPack" -> {
                        val url = data?.optString("manifestUrl")
                        if (!url.isNullOrEmpty()) {
                            listener.onDownloadPackRequested(url)
                        }
                    }
                    else -> {
                        listener.onEventFromWeb(name, data)
                    }
                }
            } else {
                listener.onMessageFromWeb(obj)
            }
        } catch (e: Exception) {
            Log.e("WebAppInterface", "Invalid JSON from web: $e")
        }
    }

    interface WebAppListener {
        fun onDownloadPackRequested(manifestUrl: String)
        fun onEventFromWeb(name: String, data: JSONObject?)
        fun onMessageFromWeb(obj: JSONObject)
    }
}
