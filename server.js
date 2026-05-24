require('dotenv').config();
const express = require('express');
const fs = require('fs');
const app = express();

const API_KEY = process.env.MY_AI_API_KEY; // Clé sécurisée

// Charger le fichier knowledge
const knowledgeData = fs.readFileSync('./knowledge/knowledge_base_islam.json', 'utf8');
const knowledge = JSON.parse(knowledgeData);

// Route principale Q/R
app.get('/ask', (req, res) => {
  const question = req.query.q;

  // Mode 1 : Connexion directe au modèle
  let response = "[Mode Direct] Réponse simulée par ___NOM_MODELE_GRATUIT___\n";

  // Mode 2 : Connexion via agent IA
  response += "[Mode Agent] Question relayée par ___NOM_AGENT_GRATUIT___\n";

  // Mode 3 : Connexion avec knowledge base
  const answerFromKnowledge = knowledge[question] || "Pas trouvé dans la base.";
  response += "[Mode Knowledge] Réponse enrichie → " + answerFromKnowledge;

  res.json({ answer: response });
});

app.listen(3000, () => console.log("Serveur IA en marche sur http://localhost:3000"));
