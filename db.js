// db.js - Constructeur et gestionnaire d'IndexedDB

const DB_NAME = 'IslamRAG_DB';
const DB_VERSION = 1;
const STORE_NAME = 'knowledge_base';

// 1. Ouverture de la base de données IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Se déclenche si la base n'existe pas encore sur le téléphone/PC
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('titre', 'titre', { unique: false });
                store.createIndex('categorie', 'categorie', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Erreur lors de l'ouverture d'IndexedDB");
    });
}

// 2. Initialisation automatique et importation du JSON
async function initDatabase() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const countRequest = store.count();

        countRequest.onsuccess = async () => {
            // Si la base locale est vide, on télécharge le fichier islam_data.json
            if (countRequest.result === 0) {
                console.log("📥 Première installation : Chargement de islam_data.json dans IndexedDB...");
                try {
                    const response = await fetch('./islam_data.json');
                    const data = await response.json();

                    const writeTx = db.transaction(STORE_NAME, 'readwrite');
                    const writeStore = writeTx.objectStore(STORE_NAME);
                    
                    data.forEach(item => writeStore.put(item));

                    writeTx.oncomplete = () => {
                        console.log("✅ Base IndexedDB construite avec succès ! (" + data.length + " entrées)");
                        if (typeof showToast === 'function') showToast("🗄️ Base de données locale installée !");
                    };
                } catch (err) {
                    console.error("❌ Erreur de lecture de islam_data.json :", err);
                }
            } else {
                console.log("🗄️ Base IndexedDB déjà opérationnelle (" + countRequest.result + " éléments)");
            }
        };
    } catch (err) {
        console.error("❌ Impossible de construire IndexedDB :", err);
    }
}

// 3. Fonction pour extraire tous les documents pour la recherche RAG
async function getAllDocuments() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject("Erreur lors de la lecture des documents");
        });
    } catch (err) {
        console.error("Erreur d'accès à la base :", err);
        return [];
    }
}
