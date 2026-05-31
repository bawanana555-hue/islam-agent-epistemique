import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from google import genai

JSON_FILE = "knowledge_base_islam.json"
# Hugging Face nécessite d'écrire les fichiers dans le dossier temporaire /tmp
EMBEDDINGS_FILE = "/tmp/embeddings_cache.npy"

# TOPICS INTERDITS (Non-islamiques)
FORBIDDEN_TOPICS = [
    "mathématiques", "maths", "algèbre", "géométrie", "calcul",
    "physique", "chimie", "biologie", "informatique",
    "programmation", "code", "python", "javascript"
]

# 1. Chargement de la base de connaissances
try:
    with open(JSON_FILE, "r", encoding="utf-8") as f:
        knowledge_base = json.load(f)
    documents = [q["response"] for cat in knowledge_base["categories"] for q in cat["questions"]]
except Exception as e:
    print(f"Erreur de lecture du JSON : {e}")
    documents = []

# 2. Gestion des Embeddings
embedder = SentenceTransformer("all-MiniLM-L6-v2")

if os.path.exists(EMBEDDINGS_FILE) and len(documents) > 0:
    embeddings = np.load(EMBEDDINGS_FILE)
    if len(embeddings) != len(documents):
        embeddings = embedder.encode(documents)
        np.save(EMBEDDINGS_FILE, embeddings)
else:
    if documents:
        embeddings = embedder.encode(documents)
        np.save(EMBEDDINGS_FILE, embeddings)
    else:
        embeddings = []

# 3. Initialisation Gemini
# ⚠️ REMPLACEZ "YOUR_GEMINI_API_KEY" PAR VOTRE CLÉ RÉELLE
# Retrouvez-la sur: https://aistudio.google.com/app/apikeys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")

if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY":
    print("⚠️  ALERTE: Clé API Gemini non configurée!")
    print("   Définissez la variable d'environnement GEMINI_API_KEY")
    client = None
else:
    client = genai.Client(api_key=GEMINI_API_KEY)

# 4. Configuration de FastAPI
app = FastAPI(title="RAG Cloud Server - Islam Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def is_forbidden_topic(query: str) -> bool:
    """Vérifie si la question contient des sujets interdits"""
    query_lower = query.lower()
    for topic in FORBIDDEN_TOPICS:
        if topic in query_lower:
            return True
    return False

def retrieve(query: str, top_k: int = 3):
    if len(embeddings) == 0:
        return []
    query_vec = embedder.encode([query])
    scores = cosine_similarity(query_vec, embeddings)
    top_indices = np.argsort(scores[0])[::-1][:top_k]
    return [documents[i] for i in top_indices]

async def generate_answer(query: str) -> str:
    # Vérification du sujet
    if is_forbidden_topic(query):
        return "Je suis spécialisé dans les valeurs et sciences islamiques. Je ne peux pas répondre aux questions concernant les mathématiques, la physique ou l'informatique. Posez-moi plutôt des questions sur l'Islam, la théologie, la jurisprudence (Fiqh), le Coran ou la Sunna."
    
    # Vérification de la disponibilité du client Gemini
    if client is None:
        return "Erreur: La clé API Gemini n'est pas configurée. Veuillez définir la variable d'environnement GEMINI_API_KEY."
    
    context_docs = retrieve(query)
    context = "\n".join(context_docs) if context_docs else "Aucun contexte trouvé dans la base de connaissances."
    prompt = f"Tu es un expert en sciences islamiques. Réponds en français.\n\nQuestion: {query}\n\nContext (Base de Connaissances Islamique):\n{context}\n\nRéponse complète et informative:"
    
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        return f"Erreur de connexion Gemini : {str(e)}"

# Route d'accueil pour tester rapidement si le serveur est en ligne
@app.get("/")
def home():
    status = "fonctionnel" if client is not None else "⚠️ API non configurée"
    return {
        "status": f"Le serveur RAG Islam fonctionne ({status})",
        "version": "1.0.1",
        "specialization": "Sciences et Valeurs Islamiques"
    }

@app.get("/ask")
async def ask(query: str = Query(..., min_length=1)):
    answer = await generate_answer(query)
    return {"question": query, "answer": answer}
