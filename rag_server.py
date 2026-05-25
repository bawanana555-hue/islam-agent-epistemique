# rag_server.py
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

# 1. Liaison directe avec knowledge_base_islam.json
with open("knowledge_base_islam.json", "r", encoding="utf-8") as f:
    knowledge_base = json.load(f)

# Extraire toutes les réponses des catégories/questions
documents = [q["response"] for cat in knowledge_base["categories"] for q in cat["questions"]]

# 2. Créer les embeddings
embedder = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = embedder.encode(documents)

# 3. Initialiser le moteur IA
client = OpenAI(api_key="TA_CLE_API")  # Remplace TA_CLE_API par ta clé réelle

# 4. Initialiser FastAPI
app = FastAPI()

# Middleware CORS pour autoriser ton index.html (Android inclus)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Fonction de recherche dans la base
def retrieve(query, top_k=3):
    query_vec = embedder.encode([query])
    scores = cosine_similarity(query_vec, embeddings)[0]
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [documents[i] for i in top_indices]

# 6. Fonction de génération de réponse
def generate_answer(query):
    context = "\n".join(retrieve(query))
    prompt = f"Question: {query}\n\nContext:\n{context}\n\nRéponse:"
    response = client.chat.completions.create(
        model="gemini-1.5-flash",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

# 7. Route API /ask
@app.get("/ask")
def ask(query: str = Query(...)):
    answer = generate_answer(query)
    return {"question": query, "answer": answer}
