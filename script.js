// Script client amélioré : attache les listeners après DOMContentLoaded,
// gère le focus pour éviter que le clavier ne masque le champ,
// et préfiltre les sujets non autorisés (maths, programmation, médecine, politique).

(function(){
  'use strict';

  // Liste de motifs interdits (mots-clés). Ajoutez ou retirez selon besoin.
  const forbiddenPatterns = [
    /\bsolve\b/i,
    /\bderivative\b|\bintegral\b|\bcalculus\b/i,
    /\bequation\b|\bsimplify\b|\bmatrix\b/i,
    /\bmath\b|\bgeometry\b|\balgebra\b|\btrigonometry\b/i,
    /\bprogramming\b|\bcode\b|\bcompile\b|\bpython\b|\bjava\b|\bjavascript\b/i,
    /\bmedical\b|\bdiagnosis\b|\bmedicine\b|\bdoctor\b|\btreatment\b/i,
    /\bpolitics\b|\bpresident\b|\belection\b|\bparty\b/i,
    /[0-9]{2,}/ // phrases contenant chiffres longs (probablement calculs) — tolérer si besoin
  ];

  function isAllowedTopic(text){
    if(!text || typeof text !== 'string') return false;
    // nettoie le texte
    const t = text.trim();
    if(t.length === 0) return false;
    // Check explicit allow: if contains words islamic-related, allow directly
    const islamicAllow = /\b(coran|quran|sourate|hadith|priere|prayer|salat|imam|islam|adhan|azan|tajwid|tajweed|arabic)\b/i;
    if(islamicAllow.test(t)) return true;
    // If any forbidden pattern matches, disallow
    for(const p of forbiddenPatterns){
      if(p.test(t)) return false;
    }
    // Otherwise allow by default
    return true;
  }

  function showSystemMessage(text){
    try{
      ajouterMessage('Système', text, 'error-message');
    }catch(e){ console.warn('showSystemMessage error', e); }
  }

  window.addEventListener('DOMContentLoaded', () => {
    try{
      // éléments existants
      const chatForm = document.getElementById('chat-form');
      const userInput = document.getElementById('user-input');
      const chatContainer = document.getElementById('chat-container');
      if(!chatForm || !userInput || !chatContainer){
        console.warn('Elements chat non trouvés — abort attaching handlers.');
        return;
      }

      // Comportement pour éviter que le clavier masque le champ sur mobiles
      // Quand l'input reçoit le focus, scrollIntoView après un petit délai
      userInput.addEventListener('focus', () => {
        try{
          setTimeout(()=>{
            try{
              userInput.scrollIntoView({behavior:'smooth', block:'center'});
              // for some WebViews, a resize helps
              if(window.visualViewport){
                const vh = window.visualViewport.height;
                // nothing destructive: minor CSS tweak to ensure container can resize
                chatContainer.style.maxHeight = (vh - 120) + 'px';
              }
            }catch(e){ console.debug('scrollIntoView failed', e); }
          }, 300);
        }catch(e){ console.warn(e); }
      });

      // Also handle focusin on the document to ensure input is visible
      document.addEventListener('focusin', (ev) => {
        if(ev.target === userInput){
          setTimeout(()=>{ try{ userInput.scrollIntoView({behavior:'smooth', block:'center'}); }catch(e){} }, 300);
        }
      });

      // Form submission with topic filtering and robust error handling
      chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try{
          const message = userInput.value.trim();
          if(!message) return;

          // Prefilter topics
          if(!isAllowedTopic(message)){
            showSystemMessage("Désolé — cet agent ne traite que des sujets liés aux valeurs et sciences islamiques. Votre question semble hors‑sujet.");
            return;
          }

          ajouterMessage('Vous', message, 'user-message');
          userInput.value = '';

          const loadingId = ajouterMessage('Agent', 'Recherche en cours dans la base...', 'agent-message loading');

          try{
            const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: message })
            });

            const data = await response.json();
            supprimerMessage(loadingId);
            ajouterMessage('Agent', data.reply, 'agent-message');
          }catch(error){
            console.error('Fetch error:', error);
            supprimerMessage(loadingId);
            ajouterMessage('Système', 'Erreur de connexion avec le serveur.', 'error-message');
          }

        }catch(err){
          console.error('submit handler error', err);
          showSystemMessage('Une erreur interne est survenue.');
        }
      });

      // ensure helper functions exist (in case they are defined later in other scripts)
      window.ajouterMessage = window.ajouterMessage || function(a,b,c){
        try{
          const el = document.createElement('div');
          el.className = `message ${c || ''}`;
          el.innerHTML = `<strong>${a} :</strong> <span>${b}</span>`;
          chatContainer.appendChild(el);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }catch(e){ console.warn('fallback ajouterMessage failed', e); }
      };

      window.supprimerMessage = window.supprimerMessage || function(id){
        try{ const el = document.getElementById(id); if(el) el.remove(); }catch(e){}
      };

    }catch(e){
      console.error('DOMContentLoaded handler failed', e);
    }
  });

})();
