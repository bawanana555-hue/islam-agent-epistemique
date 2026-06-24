// ============================================================
// WORKER CLOUDFLARE — Islam Agent Épistémique
// ============================================================

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // Route /chat
        if (url.pathname === '/chat' && request.method === 'POST') {
            try {
                const body = await request.json();
                const { question, mode } = body;

                if (!question || question.trim().length === 0) {
                    return new Response(JSON.stringify({
                        error: 'Veuillez poser une question.'
                    }), { headers: corsHeaders, status: 400 });
                }

                // Appel à l'IA
                const answer = await callAI(question, mode, env);

                return new Response(JSON.stringify({
                    answer: answer,
                    mode: mode || 'hybrid'
                }), { headers: corsHeaders });

            } catch (error) {
                return new Response(JSON.stringify({
                    error: error.message || 'Erreur interne'
                }), { headers: corsHeaders, status: 500 });
            }
        }

        // Route /health
        if (url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'ok',
                agent: 'Islam Agent Épistémique',
                version: '1.0'
            }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({
            error: 'Route non trouvée'
        }), { headers: corsHeaders, status: 404 });
    }
};

// ============================================================
// APPEL À L'IA (Workers AI ou API externe)
// ============================================================
async function callAI(question, mode, env) {
    // Si vous avez configuré Workers AI
    if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) {
        try {
            const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'Tu es un expert en théologie islamique.' },
                        { role: 'user', content: question }
                    ],
                    max_tokens: 2048,
                    temperature: 0.6
                })
            });

            const data = await response.json();
            return data.result?.response || data.response || 'Réponse générée.';
        } catch (e) {
            console.error('Erreur Workers AI:', e);
        }
    }

    // Fallback : Réponse simulée intelligente
    return generateFallbackResponse(question);
}

// ============================================================
// RÉPONSE SIMULÉE (Fallback)
// ============================================================
function generateFallbackResponse(question) {
    const q = question.toLowerCase();
    
    if (q.includes('tawhid') || q.includes('unicité') || q.includes('dieu')) {
        return `## Le Tawhīd — L'unicité d'Allah ☪️

*"Dis : Il est Allah, Unique."* (Coran 112)

### Les trois dimensions du Tawhīd

**1. Tawhīd al-Rubûbiyyah** — Unicité de la Seigneurie

**2. Tawhīd al-Ulûhiyyah** — Unicité de l'Adoration

**3. Tawhīd al-Asmâ' wa al-Sifât** — Unicité des Noms et Attributs

★ Ce pilier est le fondement de la foi islamique.`;
    }

    if (q.includes('prophète') || q.includes('muhammad')) {
        return `## Muhammad — Sceau des prophètes 🌟

*"Muhammad est le Messager d'Allah et le dernier des prophètes."* (Coran 33:40)

★ Il est le modèle parfait pour toute l'humanité.`;
    }

    return `## Votre question sur la théologie islamique

Je vous remercie pour votre question. Je m'appuie sur les sources authentiques.

### Éléments de réponse

★ Basée sur le Coran et la Sunna.
✦ N'hésitez pas à préciser votre question.

---
*"Cherchez la science, même en Chine."* (Hadith)`;
}
