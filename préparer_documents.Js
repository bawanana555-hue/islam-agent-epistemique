// ============================================================
// SCRIPT DE PRÉPARATION ET D'INGESTION DE DOCUMENTS EXTERNES
// ============================================================
const fs = require('fs');
const path = require('path');

// Dossier contenant vos fichiers textes bruts
const DOSSIER_BRUT = path.join(__dirname, 'documents_bruts');
// Fichier final structuré
const FICHIER_SORTIE = path.join(__dirname, 'data', 'connaissances_externes.json');

function nettoyerTexte(texte) {
    return texte
        .replace(/\s+/g, ' ') // Enlever les espaces multiples et retours à la ligne excessifs
        .trim();
}

function genererMotsCles(texte) {
    // Extrait les mots importants (plus de 4 lettres) pour accélérer la recherche
    const mots = texte.toLowerCase().match(/\b[a-zàâäéèêëîïôöùûüç]{5,}\b/gi) || [];
    return Array.from(new Set(mots)).slice(0, 10); // Garder 10 mots-clés uniques
}

function traiterDocuments() {
    console.log('🔄 Analyse des documents externes...');
    
    if (!fs.existsSync(DOSSIER_BRUT)) {
        fs.mkdirSync(DOSSIER_BRUT, { recursive: true });
        console.log(`📁 Dossier créé : "${DOSSIER_BRUT}". Placez vos fichiers .txt dedans.`);
        return;
    }

    const fichiers = fs.readdirSync(DOSSIER_BRUT);
    const baseDeConnaissances = [];
    let compteur = 1;

    fichiers.forEach((fichier) => {
        if (fichier.endsWith('.txt')) {
            const cheminFichier = path.join(DOSSIER_BRUT, fichier);
            const contenuBrut = fs.readFileSync(cheminFichier, 'utf-8');
            const textePropre = nettoyerTexte(contenuBrut);

            // Découpage en blocs de 500 caractères si le document est très long (Chunking RAG)
            const TAILLE_BLOC = 500;
            for (let i = 0; i < textePropre.length; i += TAILLE_BLOC) {
                const extrait = textePropre.substring(i, i + TAILLE_BLOC);
                
                baseDeConnaissances.push({
                    id: `ext_doc_${String(compteur).padStart(4, '0')}`,
                    titre: fichier.replace('.txt', ''),
                    categorie: 'Document Externe',
                    mots_cles: genererMotsCles(extrait),
                    texte: extrait
                });
                compteur++;
            }
        }
    });

    // Enregistrer le fichier structuré
    const dossierData = path.dirname(FICHIER_SORTIE);
    if (!fs.existsSync(dossierData)) fs.mkdirSync(dossierData, { recursive: true });

    fs.writeFileSync(FICHIER_SORTIE, JSON.stringify(baseDeConnaissances, null, 2), 'utf-8');
    console.log(`✅ ${baseDeConnaissances.length} extrait(s) préparé(s) et sauvegardé(s) dans "${FICHIER_SORTIE}".`);
}

traiterDocuments();
