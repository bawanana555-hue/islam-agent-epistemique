# Pull Request: Add Android WebView bridge + native downloader (fix/miniapp-integration)

Contexte
- Ajoute une intégration Android non intrusive pour la mini‑application Web (WebView).
- Respect strict : index.html n'a pas été modifié.
- Branche de travail : fix/miniapp-integration

Ce qui est inclus
- android_integration/src/main/java/com/bawanana555hue/islamagent/integration/
  - MainActivity.kt (exemple d’Activity pour WebView, injection du bridge et downloader)
  - WebAppInterface.kt (pont JS → Android : AndroidApp.postMessage(json))
  - NativeDownloader.kt (manifeste → téléchargement de fichiers, vérification SHA‑256, stockage dans filesDir/<packId>/)
- android_integration/src/main/res/xml/provider_paths.xml (FileProvider)
- android_integration/assets/webview_bridge.js (helper JS injecté pour sendToNative / onNativeMessage)
- android_integration/README.md (guide d’intégration & dépendances)

Comportement
- La page Web peut appeler:
    sendToNative({ type:'event', name:'requestDownloadPack', data:{ manifestUrl:'https://...' }})
  → le natif télécharge le manifest et les fichiers, vérifie SHA‑256, stocke et renvoie des events via window.onNativeMessage(...)

Instructions rapides de test (voir README pour le détail)
1) Copier les fichiers Kotlin dans app/src/main/java/... (ou intégrer le dossier android_integration).
2) Ajouter provider_paths.xml dans res/xml et webview_bridge.js dans assets.
3) Ajouter dépendances OkHttp et coroutines dans build.gradle.
4) Ajouter permissions INTERNET & RECORD_AUDIO et le provider dans AndroidManifest (authorities = com.bawanana555hue.islamagent.fileprovider).
5) Lancer l'app sur appareil réel et déclencher sendToNative(...) depuis la page (ou via UI).

Notes / limitations
- Downloader de base (non resumable). Peut être amélioré pour la reprise par Range request si le serveur le permet.
- SHA‑256 vérifié pendant l'écriture (flux) — adapté pour fichiers raisonnables.
