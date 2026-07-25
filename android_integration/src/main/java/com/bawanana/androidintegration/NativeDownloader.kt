package com.bawanana.androidintegration

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest

/**
 * Simple native downloader that fetches a manifest JSON and downloads listed files.
 * Verifies SHA-256 when provided.
 * This is a minimal implementation intended as a starting point.
 */
class NativeDownloader(private val context: Context) {
    private val client = OkHttpClient()

    data class DownloadResult(val success: Boolean, val message: String)

    interface Callback {
        fun onProgress(fileIndex: Int, totalFiles: Int, percentForFile: Int)
        fun onFileDownloaded(path: String)
        fun onComplete(result: DownloadResult)
    }

    fun startDownload(manifestUrl: String, callback: Callback) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val manifestReq = Request.Builder().url(manifestUrl).build()
                client.newCall(manifestReq).execute().use { resp ->
                    if (!resp.isSuccessful) throw Exception("Manifest download failed: ${resp.code}")
                    val body = resp.body?.string() ?: throw Exception("Empty manifest")
                    val manifest = org.json.JSONObject(body)
                    val files = manifest.getJSONArray("files")
                    val packId = manifest.optString("pack_id", "pack")
                    val total = files.length()
                    for (i in 0 until total) {
                        val f = files.getJSONObject(i)
                        val url = f.getString("url")
                        val path = f.optString("path")
                        val sha = if (f.has("sha256")) f.getString("sha256") else null
                        // download file stream
                        val req = Request.Builder().url(url).build()
                        client.newCall(req).execute().use { fresp ->
                            if (!fresp.isSuccessful) throw Exception("File download failed: ${fresp.code} for $url")
                            val input = fresp.body?.byteStream() ?: throw Exception("Empty file body")
                            val outDir = File(context.filesDir, packId)
                            if (!outDir.exists()) outDir.mkdirs()
                            val outFile = if (path.isNotEmpty()) File(outDir, File(path).name) else File(outDir, "file_${i}")
                            val fos = FileOutputStream(outFile)
                            val buffer = ByteArray(8 * 1024)
                            var read: Int
                            val digest = MessageDigest.getInstance("SHA-256")
                            var totalRead = 0L
                            val contentLength = fresp.body?.contentLength() ?: -1L
                            while (input.read(buffer).also { read = it } != -1) {
                                fos.write(buffer, 0, read)
                                digest.update(buffer, 0, read)
                                totalRead += read
                                val percent = if (contentLength > 0) ((totalRead * 100) / contentLength).toInt() else -1
                                callback.onProgress(i + 1, total, if (percent >= 0) percent else 0)
                            }
                            fos.flush(); fos.close(); input.close()
                            val computed = digest.digest().joinToString("") { b -> String.format("%02x", b) }
                            Log.d("NativeDownloader", "Downloaded ${outFile.absolutePath} sha256=$computed")
                            if (!sha.isNullOrEmpty() && !sha.equals(computed, ignoreCase = true)) {
                                callback.onComplete(DownloadResult(false, "SHA mismatch for ${outFile.name}"))
                                return@launch
                            }
                            callback.onFileDownloaded(outFile.absolutePath)
                        }
                    }
                    callback.onComplete(DownloadResult(true, "All files downloaded"))
                }
            } catch (e: Exception) {
                Log.e("NativeDownloader", "error", e)
                callback.onComplete(DownloadResult(false, e.message ?: "unknown"))
            }
        }
    }
}
