// Définition des noms
const MODEL_NAME = "gpt-4o-mini";          // Moteur IA gratuit
const AGENT_NAME = "gemini-1.5-flash";     // Agent IA gratuit
const KNOWLEDGE_SOURCE = "knowledge_base_islam.json"; // Base de connaissances

// ⚠️ Clé API sécurisée
// Bonne pratique : stocker la clé dans un fichier .env côté serveur
// Exemple : process.env.MY_AI_API_KEY
const API_KEY = "___CLE_API_GRATUITE___"; 

// Fonction principale Q/R
async function askIA(question) {
  let response = "";

  // Mode 1 : Connexion directe au modèle
  response += "[Mode Direct] Réponse simulée par " + MODEL_NAME + "\n";

  // Mode 2 : Connexion via agent IA
  response += "[Mode Agent] Question relayée par " + AGENT_NAME + " vers " + MODEL_NAME + "\n";

  // Mode 3 : Connexion avec knowledge base
  try {
    const knowledgeData = await fetch(KNOWLEDGE_SOURCE);
    const knowledge = await knowledgeData.json();
    const answerFromKnowledge = knowledge[question] || "Pas trouvé dans la base.";
    response += "[Mode Knowledge] Réponse enrichie → " + answerFromKnowledge;
  } catch (error) {
    response += "[Mode Knowledge] Erreur de lecture du fichier knowledge.";
  }

  return response;
}

// Exemple d’utilisation
askIA("Explique-moi le rôle d’un agent IA").then(console.log);
