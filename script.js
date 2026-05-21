// --- Gestion du bouton "Enregistrer la Clé API" ---
document.addEventListener('DOMContentLoaded', () => {
    // Charger la base de connaissances
    fetch('knowledge_base.json')
        .then(response => {
            if (!response.ok) throw new Error(`Fichier introuvable. Code HTTP: ${response.status}`);
            return response.json();
        })
        .then(data => {
            knowledgeBase = data;
            console.log("✅ Base chargée :", knowledgeBase.categories.length, "catégories.");
        })
        .catch(error => {
            console.error("❌ Erreur :", error);
            document.getElementById('responseArea').innerHTML = `
                <div class="highlight" style="background-color: #ffebee; border-left: 4px solid #f44336;">
                    <p style="color: #d32f2f;">⚠️ Erreur : knowledge_base.json introuvable. Vérifiez le chemin.</p>
                </div>
            `;
        });

    // Charger les clés API sauvegardées
    const savedFreeApiKey = localStorage.getItem('freeApiKey');
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedFreeApiKey) document.getElementById('freeApiKey').value = savedFreeApiKey;
    if (savedApiKey) document.getElementById('apiKey').value = savedApiKey;

    // Bouton "Enregistrer la Clé API"
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', () => {
            const freeApiKey = document.getElementById('freeApiKey').value.trim();
            const apiKey = document.getElementById('apiKey').value.trim();

            if (freeApiKey || apiKey) {
                localStorage.setItem('freeApiKey', freeApiKey);
                localStorage.setItem('apiKey', apiKey);
                alert('✅ Clé API enregistrée avec succès ! Vous pouvez maintenant l\'utiliser.');
                closeModal(profileModal);
            } else {
                alert('⚠️ Veuillez entrer une clé API avant de l\'enregistrer.');
            }
        });
    }

    // Gestion du champ de saisie
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const responseArea = document.getElementById('responseArea');
    const loadingDots = document.getElementById('loadingDots');

    const handleSend = async () => {
        const question = userInput.value.trim();
        if (!question) return;

        responseArea.innerHTML += `<p><strong>Vous :</strong> ${question}</p>`;
        userInput.value = '';
        loadingDots.style.display = 'flex';

        // Récupérer les clés API (depuis les champs OU le localStorage)
        const freeApiKey = document.getElementById('freeApiKey')?.value.trim() ||
                          localStorage.getItem('freeApiKey') ||
                          '';
        const apiKey = document.getElementById('apiKey')?.value.trim() ||
                      localStorage.getItem('apiKey') ||
                      '';

        // Priorité 1 : Toujours utiliser la base locale d'abord
        let result = getLocalResponse(question);

        // Priorité 2 : Si une clé API est disponible, essayer Google Gemini
        if (freeApiKey || apiKey) {
            try {
                const geminiResult = await getGeminiResponse(question, freeApiKey || apiKey);
                // Si Gemini retourne une réponse différente de la base locale, l'utiliser
                if (geminiResult.response !== result.response) {
                    result = geminiResult;
                }
            } catch (error) {
                console.error("Erreur avec Google Gemini :", error);
                // On garde le résultat de la base locale
            }
        }

        loadingDots.style.display = 'none';

        // Afficher la réponse
        let responseHTML = `
            <h4>Réponse</h4>
            <div class="highlight">
                <p>${result.response}</p>
        `;
        if (result.references?.length) responseHTML += `<p><em>📚 Références : ${result.references.join(' | ')}</em></p>`;
        if (result.category) responseHTML += `<p><em>📂 Catégorie : ${result.category}</em></p>`;
        if (result.tags?.length) responseHTML += `<p><em>🏷️ Mots-clés : ${result.tags.join(', ')}</em></p>`;
        responseHTML += `</div>`;
        responseArea.innerHTML += responseHTML;
        responseArea.scrollTop = responseArea.scrollHeight;
    };

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});
