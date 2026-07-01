// ============================================================
// SERVEUR MCP — Islam Agent Épistémique
// ============================================================
// Ce serveur fournit un accès aux sources islamiques :
// - Coran (114 sourates, 6236 versets)
// - Hadiths authentiques (Bukhari, Muslim, etc.)
// - Tafsir Ibn Kathir
// ============================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// 1. CHARGEMENT DES DONNÉES
// ============================================================

// Chemin vers les fichiers de données
const DATA_DIR = path.join(__dirname, 'data');

// Structure des données en mémoire
let quranData = null;
let hadithData = null;
let tafsirData = null;

// Fonction pour charger les données
function loadData() {
    try {
        // Charger le Coran
        const quranPath = path.join(DATA_DIR, 'quran_fr.json');
        if (fs.existsSync(quranPath)) {
            quranData = JSON.parse(fs.readFileSync(quranPath, 'utf-8'));
            console.log('✅ Coran chargé :', quranData.sourates ? quranData.sourates.length : '0 sourates');
        } else {
            console.warn('⚠️ Fichier quran_fr.json introuvable. Utilisation des données par défaut.');
            quranData = getDefaultQuran();
        }

        // Charger les Hadiths
        const hadithPath = path.join(DATA_DIR, 'hadiths_fr.json');
        if (fs.existsSync(hadithPath)) {
            hadithData = JSON.parse(fs.readFileSync(hadithPath, 'utf-8'));
            console.log('✅ Hadiths chargés :', hadithData.hadiths ? hadithData.hadiths.length : '0 hadiths');
        } else {
            console.warn('⚠️ Fichier hadiths_fr.json introuvable.');
            hadithData = getDefaultHadiths();
        }

        // Charger le Tafsir
        const tafsirPath = path.join(DATA_DIR, 'tafsir_ibn_kathir_fr.json');
        if (fs.existsSync(tafsirPath)) {
            tafsirData = JSON.parse(fs.readFileSync(tafsirPath, 'utf-8'));
            console.log('✅ Tafsir chargé');
        } else {
            console.warn('⚠️ Fichier tafsir_ibn_kathir_fr.json introuvable.');
            tafsirData = getDefaultTafsir();
        }

        return true;
    } catch (error) {
        console.error('❌ Erreur chargement des données:', error);
        return false;
    }
}

// ============================================================
// 2. DONNÉES PAR DÉFAUT (Si les fichiers sont absents)
// ============================================================

function getDefaultQuran() {
    return {
        sourates: [
            { id: 1, nom: 'Al-Fatiha', versets: 7, traduction: 'L\'Ouvrante' },
            { id: 2, nom: 'Al-Baqarah', versets: 286, traduction: 'La Vache' },
            { id: 3, nom: 'Al-Imran', versets: 200, traduction: 'La Famille d\'Imran' },
            { id: 4, nom: 'An-Nisa', versets: 176, traduction: 'Les Femmes' },
            { id: 5, nom: 'Al-Ma\'idah', versets: 120, traduction: 'La Table Servie' }
        ],
        versets: {
            1: [
                { id: 1, texte_arabe: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', traduction: 'Au nom d\'Allah, le Tout Miséricordieux, le Très Miséricordieux.' },
                { id: 2, texte_arabe: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', traduction: 'Louange à Allah, Seigneur de l\'univers.' },
                { id: 3, texte_arabe: 'الرَّحْمَٰنِ الرَّحِيمِ', traduction: 'Le Tout Miséricordieux, le Très Miséricordieux.' },
                { id: 4, texte_arabe: 'مَالِكِ يَوْمِ الدِّينِ', traduction: 'Maître du Jour de la Rétribution.' },
                { id: 5, texte_arabe: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', traduction: 'C\'est Toi que nous adorons, et c\'est Toi dont nous implorons l\'aide.' }
            ]
        }
    };
}

function getDefaultHadiths() {
    return {
        hadiths: [
            { id: 1, source: 'Bukhari', texte: 'Les actions ne valent que par leurs intentions.', grade: 'Sahih' },
            { id: 2, source: 'Muslim', texte: 'Le meilleur d\'entre vous est celui qui est le meilleur envers sa famille.', grade: 'Sahih' },
            { id: 3, source: 'Bukhari', texte: 'La propreté est la moitié de la foi.', grade: 'Sahih' }
        ]
    };
}

function getDefaultTafsir() {
    return {
        versets: {
            '1:1': { auteur: 'Ibn Kathir', texte: 'Le nom d\'Allah est le plus grand des noms.' }
        }
    };
}

// ============================================================
// 3. FONCTIONS DE RECHERCHE
// ============================================================

// Recherche dans le Coran
function searchQuran(query, maxResults = 10) {
    const results = [];
    const qLower = query.toLowerCase();

    // Chercher dans les sourates
    if (quranData && quranData.sourates) {
        for (const sourate of quranData.sourates) {
            if (sourate.nom.toLowerCase().includes(qLower) || 
                sourate.traduction.toLowerCase().includes(qLower)) {
                results.push({
                    type: 'sourate',
                    sourate_id: sourate.id,
                    sourate_name: sourate.nom,
                    sourate_traduction: sourate.traduction,
                    versets: sourate.versets
                });
            }
        }
    }

    // Chercher dans les versets
    if (quranData && quranData.versets) {
        for (const [sourateId, versets] of Object.entries(quranData.versets)) {
            for (const verset of versets) {
                if (verset.traduction && verset.traduction.toLowerCase().includes(qLower)) {
                    results.push({
                        type: 'verset',
                        sourate_id: parseInt(sourateId),
                        sourate_name: getSourateName(parseInt(sourateId)),
                        verset_id: verset.id,
                        texte_arabe: verset.texte_arabe || '',
                        traduction: verset.traduction || ''
                    });
                }
            }
        }
    }

    // Limiter les résultats
    return results.slice(0, maxResults);
}

function getSourateName(id) {
    if (quranData && quranData.sourates) {
        const sourate = quranData.sourates.find(s => s.id === id);
        if (sourate) return sourate.nom;
    }
    return 'Sourate ' + id;
}

// Recherche dans les Hadiths
function searchHadiths(query, maxResults = 10) {
    const results = [];
    const qLower = query.toLowerCase();

    if (hadithData && hadithData.hadiths) {
        for (const hadith of hadithData.hadiths) {
            if (hadith.texte && hadith.texte.toLowerCase().includes(qLower)) {
                results.push({
                    type: 'hadith',
                    id: hadith.id,
                    source: hadith.source || 'Inconnue',
                    texte: hadith.texte,
                    grade: hadith.grade || 'Non vérifié'
                });
            }
        }
    }

    return results.slice(0, maxResults);
}

// Recherche dans le Tafsir
function searchTafsir(query, maxResults = 5) {
    const results = [];
    const qLower = query.toLowerCase();

    if (tafsirData && tafsirData.versets) {
        for (const [versetId, entry] of Object.entries(tafsirData.versets)) {
            if (entry.texte && entry.texte.toLowerCase().includes(qLower)) {
                results.push({
                    type: 'tafsir',
                    verset: versetId,
                    auteur: entry.auteur || 'Ibn Kathir',
                    texte: entry.texte
                });
            }
        }
    }

    return results.slice(0, maxResults);
}

// ============================================================
// 4. ROUTES DE L'API
// ============================================================

// Statut du serveur
app.get('/', (req, res) => {
    res.json({
        name: 'Serveur MCP - Islam Agent Épistémique',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            mcp: 'POST /mcp',
            quran: 'GET /quran/search?q=...',
            hadiths: 'GET /hadiths/search?q=...',
            tafsir: 'GET /tafsir/search?q=...',
            health: 'GET /health'
        },
        data_loaded: {
            quran: quranData !== null,
            hadiths: hadithData !== null,
            tafsir: tafsirData !== null
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// ROUTE PRINCIPALE : /mcp — Interface MCP
// ============================================================
app.post('/mcp', async (req, res) => {
    try {
        const { tool, params } = req.body;
        
        if (!tool) {
            return res.status(400).json({ error: 'Paramètre "tool" requis' });
        }

        let results = [];
        let source = '';

        switch (tool) {
            case 'search_quran':
                results = searchQuran(params.query || '', params.max_results || 10);
                source = 'Coran';
                break;

            case 'search_hadiths':
                results = searchHadiths(params.query || '', params.max_results || 10);
                source = 'Hadiths';
                break;

            case 'search_tafsir':
                results = searchTafsir(params.query || '', params.max_results || 5);
                source = 'Tafsir';
                break;

            case 'get_sourate':
                const sourateId = parseInt(params.id);
                if (quranData && quranData.sourates) {
                    const sourate = quranData.sourates.find(s => s.id === sourateId);
                    if (sourate) {
                        results = [{
                            type: 'sourate',
                            sourate_id: sourate.id,
                            sourate_name: sourate.nom,
                            sourate_traduction: sourate.traduction,
                            versets: sourate.versets,
                            contenu: quranData.versets ? quranData.versets[sourateId] : []
                        }];
                        source = 'Coran';
                    }
                }
                break;

            case 'get_verset':
                const vSourate = parseInt(params.sourate);
                const vNumero = parseInt(params.verset);
                if (quranData && quranData.versets && quranData.versets[vSourate]) {
                    const verset = quranData.versets[vSourate].find(v => v.id === vNumero);
                    if (verset) {
                        results = [{
                            type: 'verset',
                            sourate_id: vSourate,
                            sourate_name: getSourateName(vSourate),
                            verset_id: vNumero,
                            texte_arabe: verset.texte_arabe || '',
                            traduction: verset.traduction || ''
                        }];
                        source = 'Coran';
                    }
                }
                break;

            default:
                return res.status(400).json({ 
                    error: `Outil non reconnu : "${tool}"`,
                    available_tools: ['search_quran', 'search_hadiths', 'search_tafsir', 'get_sourate', 'get_verset']
                });
        }

        // Réponse
        res.json({
            tool: tool,
            source: source,
            query: params.query || '',
            count: results.length,
            results: results
        });

    } catch (error) {
        console.error('Erreur MCP:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
});

// ============================================================
// ROUTES DIRECTES (pour test)
// ============================================================

// Recherche Coran
app.get('/quran/search', (req, res) => {
    const query = req.query.q || '';
    const maxResults = parseInt(req.query.limit) || 10;
    const results = searchQuran(query, maxResults);
    res.json({
        query: query,
        count: results.length,
        results: results
    });
});

// Recherche Hadiths
app.get('/hadiths/search', (req, res) => {
    const query = req.query.q || '';
    const maxResults = parseInt(req.query.limit) || 10;
    const results = searchHadiths(query, maxResults);
    res.json({
        query: query,
        count: results.length,
        results: results
    });
});

// Recherche Tafsir
app.get('/tafsir/search', (req, res) => {
    const query = req.query.q || '';
    const maxResults = parseInt(req.query.limit) || 5;
    const results = searchTafsir(query, maxResults);
    res.json({
        query: query,
        count: results.length,
        results: results
    });
});

// ============================================================
// 5. CRÉATION DES DOSSIERS DE DONNÉES
// ============================================================

function ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('📁 Dossier "data" créé');
    }
}

function createDefaultDataFiles() {
    // Créer le fichier Coran par défaut
    const quranPath = path.join(DATA_DIR, 'quran_fr.json');
    if (!fs.existsSync(quranPath)) {
        fs.writeFileSync(quranPath, JSON.stringify(getDefaultQuran(), null, 2), 'utf-8');
        console.log('📄 Fichier quran_fr.json créé');
    }

    // Créer le fichier Hadiths par défaut
    const hadithPath = path.join(DATA_DIR, 'hadiths_fr.json');
    if (!fs.existsSync(hadithPath)) {
        fs.writeFileSync(hadithPath, JSON.stringify(getDefaultHadiths(), null, 2), 'utf-8');
        console.log('📄 Fichier hadiths_fr.json créé');
    }

    // Créer le fichier Tafsir par défaut
    const tafsirPath = path.join(DATA_DIR, 'tafsir_ibn_kathir_fr.json');
    if (!fs.existsSync(tafsirPath)) {
        fs.writeFileSync(tafsirPath, JSON.stringify(getDefaultTafsir(), null, 2), 'utf-8');
        console.log('📄 Fichier tafsir_ibn_kathir_fr.json créé');
    }
}

// ============================================================
// 6. LANCEMENT DU SERVEUR
// ============================================================

// Initialisation
ensureDataDirectory();
createDefaultDataFiles();
loadData();

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🕌 Serveur MCP — Islam Agent Épistémique');
    console.log('='.repeat(60));
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📖 Endpoints:`);
    console.log(`   POST /mcp  — Interface MCP principale`);
    console.log(`   GET  /quran/search?q=...`);
    console.log(`   GET  /hadiths/search?q=...`);
    console.log(`   GET  /tafsir/search?q=...`);
    console.log(`   GET  /health`);
    console.log('='.repeat(60));
    console.log('✅ Serveur prêt à recevoir des requêtes');
    console.log('='.repeat(60));
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non capturée:', error);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    process.exit(0);
});
