import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from google import genai

JSON_FILE = "knowledge_base_islam.json"
# Hugging Face nécessite d'écrire les fichiers dans le dossier temporaire /tmp
EMBEDDINGS_FILE = "/tmp/embeddings_cache.npy"

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
# REMPLACEZ "TA_CLE_API_GEMINI" PAR VOTRE CLÉ DANS LES GUILLEMETS
client = genai.Client(api_key="TA_CLE_API_GEMINI")

# 4. Configuration de FastAPI
app = FastAPI(title="RAG Cloud Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def retrieve(query: str, top_k: int = 3):
    if len(embeddings) == 0:
        return []
    query_vec = embedder.encode([query])
    scores = cosine_similarity(query_vec, embeddings)
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [documents[i] for i in top_indices]

async def generate_answer(query: str) -> str:
    context_docs = retrieve(query)
    context = "\n".join(context_docs) if context_docs else "Aucun contexte trouvé."
    prompt = f"Question: {query}\n\nContext:\n{context}\n\nRéponse:"
    
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
    return {"status": "Le serveur RAG fonctionne parfaitement"}

@app.get("/ask")
async def ask(query: str = Query(..., min_length=1)):
    answer = await generate_answer(query)
    return {"question": query, "answer": answer}
