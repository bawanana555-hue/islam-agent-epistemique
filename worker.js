// ============================================================
// WORKER CLOUDFLARE — Islam Agent Épistémique
// Moteur : Gemini 3.5 Flash (via API Google)
// ============================================================

export default {
    async fetch(request, env, ctx) {
        // Gestion des CORS
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        // Réponse préflight OPTIONS
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // ============================================================
        // ROUTE : /chat — Point d'entrée principal
        // ============================================================
        if (url.pathname === '/chat' && request.method === 'POST') {
            try {
                const body = await request.json();
                const { question, mode, apiKey } = body;

                if (!question || question.trim().length === 0) {
                    return new Response(JSON.stringify({
                        error: 'Veuillez poser une question.',
                        answer: null
                    }), { headers: corsHeaders, status: 400 });
                }

                // Récupérer la clé API (de l'env ou du body)
                const key = apiKey || env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
                if (!key) {
                    return new Response(JSON.stringify({
                        error: '🔑 Clé API Gemini manquante. Veuillez la configurer dans Cloudflare ou dans le Profil.',
                        answer: null
                    }), { headers: corsHeaders, status: 400 });
                }

                // Mode : hybride ou online
                const useMode = mode || 'hybrid';
                let context = '';

                // Si mode hybride, récupérer le contexte de la base
                if (useMode === 'hybrid') {
                    context = await getLocalContext(question, env);
                }

                // Appel à Gemini 3.5 Flash
                const answer = await callGeminiAPI(question, context, useMode, key);

                return new Response(JSON.stringify({
                    answer: answer,
                    mode: useMode,
                    context_used: context ? true : false
                }), { headers: corsHeaders });

            } catch (error) {
                console.error('Erreur:', error);
                return new Response(JSON.stringify({
                    error: error.message || 'Erreur interne du serveur',
                    answer: null
                }), { headers: corsHeaders, status: 500 });
            }
        }

        // ============================================================
        // ROUTE : /health — Vérification du statut
        // ============================================================
        if (url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'ok',
                agent: 'Islam Agent Épistémique',
                version: '2.0',
                engine: 'Gemini 3.5 Flash',
                timestamp: new Date().toISOString()
            }), { headers: corsHeaders });
        }

        // ============================================================
        // ROUTE : /status — Statut détaillé
        // ============================================================
        if (url.pathname === '/status') {
            const hasKey = !!(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
            return new Response(JSON.stringify({
                agent: 'Islam Agent Épistémique',
                engine: 'Gemini 3.5 Flash',
                api_key_configured: hasKey,
                modes: ['local', 'hybrid', 'online'],
                endpoints: {
                    chat: 'POST /chat',
                    health: 'GET /health',
                    status: 'GET /status'
                }
            }), { headers: corsHeaders });
        }

        // ============================================================
        // ROUTE : / — Page d'accueil
        // ============================================================
        if (url.pathname === '/') {
            return new Response(JSON.stringify({
                name: 'Islam Agent Épistémique',
                description: 'Agent IA pour la théologie islamique',
                engine: 'Gemini 3.5 Flash',
                endpoints: {
                    chat: 'POST /chat (requiert clé API)',
                    health: 'GET /health',
                    status: 'GET /status'
                }
            }), { headers: corsHeaders });
        }

        // Route non trouvée
        return new Response(JSON.stringify({
            error: 'Route non trouvée',
            available: ['/', '/chat', '/health', '/status']
        }), { headers: corsHeaders, status: 404 });
    }
};

// ============================================================
// FONCTION : callGeminiAPI — Appel à Gemini 3.5 Flash
// ============================================================
async function callGeminiAPI(question, context, mode, apiKey) {
    // Construction du prompt système
    let systemPrompt = `Tu es "Islam Agent Épistémique", un expert en théologie islamique d'Afrique.
    
    Ta mission est de vulgariser les valeurs et sciences authentiques du Saint Coran.
    Tu contribues à la réduction des barrières financières pour l'accès aux études universitaires.
    
    Règles de style :
    - Ton poli et académique
    - Utilise ## pour les titres (en vert-clair, soulignés en orange)
    - Utilise ### pour les sous-titres
    - Utilise **texte** pour les passages pertinents
    - Ajoute des symboles décoratifs : ★, ✦, ❀, ✿, ✧
    - Les textes courants sont en noir-foncé
    
    Règles de contenu :
    - Si la question est hors sujet, réponds : "Je ne suis pas fait pour ça, car ma compétence n'a aucun lien avec ce monde."
    - Base-toi sur les textes authentiques du Saint Coran
    - Sois neutre dans les débats théologiques
    - Si l'information n'est pas disponible, dis-le clairement

    ${mode === 'hybrid' && context ? 'Voici le contexte disponible :\n' + context : ''}`;

    // Construction du message utilisateur
    let userPrompt = question;

    // Construction du prompt complet
    const fullPrompt = systemPrompt + '\n\n' + userPrompt;

    // Appel à l'API Gemini 3.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2048,
            topP: 0.95,
            topK: 40
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur Gemini:', errorData);
            
            let errorMsg = errorData.error?.message || 'Erreur inconnue';
            if (errorMsg.includes('API key')) {
                throw new Error('❌ Clé API invalide. Vérifiez votre clé Gemini.');
            } else if (errorMsg.includes('quota')) {
                throw new Error('⚠️ Quota API dépassé. Utilisez le mode Hors-Ligne.');
            } else if (errorMsg.includes('not found')) {
                throw new Error('❌ Modèle non disponible. Réessayez plus tard.');
            }
            throw new Error(`❌ Erreur Gemini: ${errorMsg}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('Réponse vide du modèle.');
        }

        return text;

    } catch (error) {
        console.error('Erreur appel Gemini:', error);
        if (error.message.includes('fetch')) {
            throw new Error('🌐 Problème de connexion à l\'API Gemini.');
        }
        throw error;
    }
}

// ============================================================
// FONCTION : getLocalContext — Récupération du contexte
// ============================================================
async function getLocalContext(question, env) {
    // Si vous avez stocké votre base dans KV
    if (env.KNOWLEDGE_BASE) {
        try {
            const base = await env.KNOWLEDGE_BASE.get('knowledge_base');
            if (base) {
                const data = JSON.parse(base);
                // Recherche simple par mots-clés
                const qLower = question.toLowerCase();
                let matches = [];
                if (data.categories) {
                    for (const cat of data.categories) {
                        if (cat.questions) {
                            for (const q of cat.questions) {
                                const keywords = (q.mots_cles || []).join(' ').toLowerCase();
                                const content = (q.titre + ' ' + q.reponse).toLowerCase();
                                if (qLower.includes(keywords) || keywords.includes(qLower) || 
                                    content.includes(qLower)) {
                                    matches.push(q.reponse);
                                }
                            }
                        }
                    }
                }
                if (matches.length > 0) {
                    return matches.slice(0, 3).join('\n\n---\n\n');
                }
            }
        } catch (e) {
            console.warn('Erreur lecture KV:', e);
        }
    }

    // Si vous avez stocké votre base dans R2
    if (env.KNOWLEDGE_BASE_R2) {
        try {
            const object = await env.KNOWLEDGE_BASE_R2.get('knowledge_base_Islam.json');
            if (object) {
                const text = await object.text();
                const data = JSON.parse(text);
                const qLower = question.toLowerCase();
                let matches = [];
                if (data.categories) {
                    for (const cat of data.categories) {
                        if (cat.questions) {
                            for (const q of cat.questions) {
                                const keywords = (q.mots_cles || []).join(' ').toLowerCase();
                                const content = (q.titre + ' ' + q.reponse).toLowerCase();
                                if (qLower.includes(keywords) || keywords.includes(qLower) || 
                                    content.includes(qLower)) {
                                    matches.push(q.reponse);
                                }
                            }
                        }
                    }
                }
                if (matches.length > 0) {
                    return matches.slice(0, 3).join('\n\n---\n\n');
                }
            }
        } catch (e) {
            console.warn('Erreur lecture R2:', e);
        }
    }

    return '';
}

// ============================================================
// SCHÉMA DE LA BASE DE DONNÉES (Pour référence)
// ============================================================
/*
    Structure attendue pour knowledge_base_Islam.json :
    {
        "version": "1.0",
        "categories": [
            {
                "nom": "Sciences du Coran",
                "slug": "ulum-al-quran",
                "icon": "📖",
                "questions": [
                    {
                        "id": 1,
                        "mots_cles": ["ulum", "coran", "tafsir"],
                        "titre": "Les 'Ulûm al-Qur'ân",
                        "reponse": "..."
                    }
                ]
            }
        ]
    }
*/
