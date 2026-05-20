// =============================================
// BASE DE CONNAISSANCES (Chargée depuis knowledge_base.json)
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

// =============================================
// GESTION DE L'INTERFACE
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    // Charger la base de connaissances
    fetch('knowledge_base.json')
        .then(response => response.json())
        .then(data => {
            knowledgeBase = data;
            console.log("✅ Base de connaissances chargée avec succès !");
        })
        .catch(error => {
            console.error("❌ Erreur de chargement :", error);
            alert("Erreur : Impossible de charger la base de connaissances. Vérifiez que le fichier 'knowledge_base.json' est dans le bon dossier.");
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

    // Fonctions pour les modales
    const openModal = (modal) => modal.style.display = 'flex';
    const closeModal = (modal) => modal.style.display = 'none';

    // Écouteurs pour les boutons (CORRIGÉ)
    profileBtn.addEventListener('click', () => openModal(profileModal));
    donsBtn.addEventListener('click', () => openModal(donsModal));
    closeProfile.addEventListener('click', () => closeModal(profileModal));
    closeDons.addEventListener('click', () => closeModal(donsModal));

    // Fermer les modales en cliquant à l'extérieur
    window.addEventListener('click', (e) => {
        if (e.target === profileModal) closeModal(profileModal);
        if (e.target === donsModal) closeModal(donsModal);
    });

    // Gestion du champ de saisie
    const handleSend = async () => {
        const question = userInput.value.trim();
        if (!question) return;

        responseArea.innerHTML += `<p><strong>Vous :</strong> ${question}</p>`;
        userInput.value = '';
        loadingDots.style.display = 'flex';

        // Utiliser la base locale
        const result = getLocalResponse(question);

        loadingDots.style.display = 'none';
        let responseHTML = `
            <h4>Réponse</h4>
            <div class="highlight">
                <p>${result.response}</p>
        `;
        if (result.references?.length) {
            responseHTML += `<p><em>📚 Références : ${result.references.join(' | ')}</em></p>`;
        }
        if (result.category) {
            responseHTML += `<p><em>📂 Catégorie : ${result.category}</em></p>`;
        }
        if (result.tags?.length) {
            responseHTML += `<p><em>🏷️ Mots-clés : ${result.tags.join(', ')}</em></p>`;
        }
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

    // Message initial
    responseArea.innerHTML = `
        <h4>Bienvenue !</h4>
        <div class="highlight">
            <p>Posez-moi une question sur l'islam, et je vous répondrai avec des références coraniques ou des hadiths.</p>
        </div>
        <div class="symbols">
            <span class="symbol">✧</span>
            <span class="symbol" style="color: #87CEEB;">★</span>
            <span class="symbol" style="color: #FFCC80;">☪</span>
        </div>
    `;
});
