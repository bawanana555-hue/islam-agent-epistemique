// =============================================
// BASE DE CONNAISSANCES
// =============================================
let knowledgeBase = [];

// =============================================
// FONCTIONS UTILITAIRES
// =============================================
function normalizeString(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "");
}

function getLocalResponse(question) {
    const normalizedQuestion = normalizeString(question);
    for (const category of knowledgeBase.categories) {
        for (const qa of category.questions) {
            const normalizedQ = normalizeString(qa.question);
            if (
                normalizedQ.includes(normalizedQuestion) ||
                normalizedQuestion.includes(normalizedQ) ||
                (qa.tags && qa.tags.some(tag => normalizedQuestion.includes(normalizeString(tag))))
            ) {
                return {
                    response: qa.response,
                    references: qa.references || [],
                    category: category.name,
                    tags: qa.tags || []
                };
            }
        }
    }
    return {
        response: "Désolé, je n'ai pas trouvé de réponse dans ma base de connaissances. Essayez de reformuler votre question.",
        references: [],
        category: null,
        tags: []
    };
}

async function getGeminiResponse(question, apiKey) {
    if (!apiKey) return getLocalResponse(question);
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Réponds à cette question sur l'islam en français : ${question}`
                        }]
                    }]
                })
            }
        );
        if (!response.ok) throw new Error(`Erreur API : ${response.status}`);
        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return {
                response: data.candidates[0].content.parts[0].text,
                references: ["Réponse générée par Google Gemini"],
                category: "IA Externe",
                tags: ["gemini"]
            };
        }
        throw new Error("Aucune réponse valide");
    } catch (error) {
        console.error("Erreur avec Google Gemini :", error);
        return getLocalResponse(question);
    }
}

// =============================================
// GESTION DE L'INTERFACE
// =============================================
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

    // Éléments du DOM
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const responseArea = document.getElementById('responseArea');
    const loadingDots = document.getElementById('loadingDots');

    // Gestion des modales
    const profileBtn = document.getElementById('profileBtn');
    const donsBtn = document.getElementById('donsBtn');
    const profileModal = document.getElementById('profileModal');
    const donsModal = document.getElementById('donsModal');
    const closeProfile = document.getElementById('closeProfile');
    const closeDons = document.getElementById('closeDons');

    const openModal = (modal) => modal.style.display = 'flex';
    const closeModal = (modal) => modal.style.display = 'none';

    profileBtn.addEventListener('click', () => openModal(profileModal));
    donsBtn.addEventListener('click', () => openModal(donsModal));
    closeProfile.addEventListener('click', () => closeModal(profileModal));
    closeDons.addEventListener('click', () => closeModal(donsModal));

    window.addEventListener('click', (e) => {
        if (e.target === profileModal) closeModal(profileModal);
        if (e.target === donsModal) closeModal(donsModal);
    });

    // Bouton Enregistrer la Clé API (CORRIGÉ)
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const freeApiKey = document.getElementById('freeApiKey').value.trim();
            const apiKey = document.getElementById('apiKey').value.trim();

            if (freeApiKey || apiKey) {
                localStorage.setItem('freeApiKey', freeApiKey);
                localStorage.setItem('apiKey', apiKey);
                alert('✅ Clé API enregistrée avec succès !');
                closeModal(profileModal);
            } else {
                alert('⚠️ Veuillez entrer une clé API.');
            }
        });
    }

    // Charger les clés API sauvegardées
    const savedFreeApiKey = localStorage.getItem('freeApiKey');
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedFreeApiKey) document.getElementById('freeApiKey').value = savedFreeApiKey;
    if (savedApiKey) document.getElementById('apiKey').value = savedApiKey;

    // Gestion du champ de saisie
    const handleSend = async () => {
        const question = userInput.value.trim();
        if (!question) return;

        responseArea.innerHTML += `<p><strong>Vous :</strong> ${question}</p>`;
        userInput.value = '';
        loadingDots.style.display = 'flex';

        const freeApiKey = document.getElementById('freeApiKey')?.value.trim() ||
                          localStorage.getItem('freeApiKey') ||
                          '';
        const apiKey = document.getElementById('apiKey')?.value.trim() ||
                      localStorage.getItem('apiKey') ||
                      '';

        let result = getLocalResponse(question);

        if (freeApiKey || apiKey) {
            try {
                const geminiResult = await getGeminiResponse(question, freeApiKey || apiKey);
                if (geminiResult.response !== result.response) {
                    result = geminiResult;
                }
            } catch (error) {
                console.error("Erreur Gemini :", error);
            }
        }

        loadingDots.style.display = 'none';
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

    // Gestion des formulaires de paiement
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const paymentType = btn.getAttribute('data-payment');
            const formId = `${paymentType}PaymentForm`;
            document.querySelectorAll('.payment-form').forEach(form => form.style.display = 'none');
            const form = document.getElementById(formId);
            if (form) form.style.display = 'block';
        });
    });

    // Redirection vers CinetPay
    document.getElementById('redirectToCinetPay')?.addEventListener('click', () => {
        window.open('https://www.cinetpay.com', '_blank');
    });

    // Bouton pour masquer/afficher les détails
    const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
    const beneficiaryDetails = document.getElementById('beneficiaryDetails');
    toggleDetailsBtn?.addEventListener('click', () => {
        if (beneficiaryDetails.style.display === 'none') {
            beneficiaryDetails.style.display = 'block';
            toggleDetailsBtn.textContent = 'Masquer les détails';
        } else {
            beneficiaryDetails.style.display = 'none';
            toggleDetailsBtn.textContent = 'Afficher les détails';
        }
    });

    // Téléchargement des images
    const logoUpload = document.getElementById('logoUpload');
    const photoUpload = document.getElementById('photoUpload');

    logoUpload?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.querySelector('.logo-placeholder').innerHTML =
                    `<img src="${event.target.result}" alt="Logo" style="width: 60px; height: 60px; border-radius: 50%;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    photoUpload?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.querySelector('.photo-placeholder').innerHTML =
                    `<img src="${event.target.result}" alt="Photo" style="width: 60px; height: 60px; border-radius: 50%;">`;
            };
            reader.readAsDataURL(file);
        }
    });
});
