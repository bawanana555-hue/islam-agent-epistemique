// REMPLACEZ cette URL par celle que Render vous fournira après votre déploiement
const API_URL = "https://onrender.com";

const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatContainer = document.getElementById("chat-container");

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    ajouterMessage("Vous", message, "user-message");
    userInput.value = "";

    const loadingId = ajouterMessage("Agent", "Recherche en cours dans la base...", "agent-message loading");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message })
        });

        const data = await response.json();
        supprimerMessage(loadingId);
        ajouterMessage("Agent", data.reply, "agent-message");

    } catch (error) {
        supprimerMessage(loadingId);
        ajouterMessage("Système", "Erreur de connexion avec le serveur.", "error-message");
    }
});

function ajouterMessage(auteur, texte, classe) {
    const el = document.createElement("div");
    const id = "msg-" + Date.now();
    el.id = id;
    el.className = `message ${classe}`;
    el.innerHTML = `<strong>${auteur} :</strong> <span>${texte}</span>`;
    chatContainer.appendChild(el);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}

function supprimerMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}
