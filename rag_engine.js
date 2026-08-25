// rag_engine.js - Moteur de recherche et d'extraction RAG local

async function processLocalRAGQuery(userQuery) {
    // 1. Lire la base IndexedDB via db.js
    const docs = await getAllDocuments();
    
    if (!docs || docs.length === 0) {
        return "⚠️ **La base de données locale IndexedDB est vide.**\n Assurez-vous que le fichier `islam_data.json` est bien présent dans le même dossier.";
    }

    // 2. Nettoyer les mots de la question
    const cleanQuery = userQuery.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/gi, '');
        
    const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 2);

    if (queryWords.length === 0) {
        return "💡 Veuillez poser une question plus précise.";
    }

    // 3. Calculer un score de pertinence pour chaque document de la base
    const scoredDocs = docs.map(doc => {
        let score = 0;
        const fullText = (doc.titre + " " + doc.contenu + " " + (doc.mots_cles ? doc.mots_cles.join(' ') : ''))
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        queryWords.forEach(word => {
            if (doc.titre.toLowerCase().includes(word)) score += 5; // Fort poids sur le titre
            if (fullText.includes(word)) score += 2;
        });

        return { doc, score };
    });

    // 4. Filtrer les résultats pertinents
    const results = scoredDocs
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Garder les 3 meilleures réponses

    // 5. Formater la réponse RAG
    if (results.length === 0) {
        return "📚 **Aucun résultat trouvé dans la base locale.**\n\n💡 Essayez de reformuler votre question ou vérifiez l'orthographe des mots-clés.";
    }

    let response = "📖 **[Réponse de la base locale IndexedDB]**\n\n";
    results.forEach((item, index) => {
        response += `### ${item.doc.titre} *(${item.doc.categorie})*\n`;
        response += `${item.doc.contenu}\n\n`;
    });

    return response;
}
