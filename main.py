import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Imports LangChain et Gemini
from langchain_google_genai import GoogleGenAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# 1. Chargement de la clé API depuis le fichier .env
load_dotenv()

app = FastAPI()

# Activation du CORS pour que votre interface HTML/JS puisse parler à cette API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production avec l'URL de votre site
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# INITIALISATION DU RAG (S'exécute une seule fois au démarrage du serveur)
# -------------------------------------------------------------------------

# A. Initialisation des modèles Gemini
# text-embedding-004 transforme votre texte JSON en données mathématiques vectorielles
embeddings = GoogleGenAIEmbeddings(model="models/text-embedding-004")
# gemini-1.5-flash sert de moteur de réflexion pour rédiger les réponses
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.3)

# B. Chargement et lecture de la base de connaissances JSON
JSON_FILE_PATH = "knowledge_base_islam.json"
documents = []

if os.path.exists(JSON_FILE_PATH): with open(JSON_FILE_PATH, "r", encoding="utf-8") as f: data = json.load(f) # On va chercher le tableau des catégories categories = data.get("categories", []) for categorie in categories: nom_categorie = categorie.get("name", "Général") liste_questions = categorie.get("questions", []) for item in liste_questions: # Extraction propre de vos données selon votre structure exacte question = item.get("question", "") reponse = item.get("response", "") # Attention, dans votre JSON c'est écrit 'response' (en anglais) references = ", ".join(item.get("references", [])) tags = ", ".join(item.get("tags", [])) # Création d'un bloc de texte ultra-complet pour l'IA text_content = ( f"Catégorie: {nom_categorie}\n" f"Question: {question}\n" f"Réponse officielle: {reponse}\n" f"Références textuelles: {references}\n" f"Mots-clés: {tags}" ) # Encapsulation dans le Document LangChain doc = Document( page_content=text_content, metadata={ "source": JSON_FILE_PATH, "id": item.get("id"), "categorie": nom_categorie } ) documents.append(doc) print(f"✅ RAG activé avec succès ! {len(documents)} questions chargées depuis la base.") else: print(f"⚠️ Attention : Le fichier {JSON_FILE_PATH} est introuvable. Base RAG vide.")

# C. Création de la base de données vectorielle (Chroma en mémoire vive)
if documents:
    vector_store = Chroma.from_documents(documents, embeddings)
    # Le retriever sélectionnera les 3 extraits les plus proches de la question
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})
else:
    retriever = None

# D. Configuration du Prompt Système (Les consignes strictes de l'IA)
system_prompt = (
    "Tu es un agent IA spécialisé et un assistant virtuel bienveillant.\n"
    "Utilise uniquement les extraits de la base de connaissances fournis ci-dessous pour répondre à la question.\n"
    "Si tu ne trouves pas la réponse dans les documents fournis, dis gentiment que tu ne possèdes pas cette information "
    "dans ta base actuelle, sans essayer d'inventer une réponse.\n\n"
    "Base de connaissances :\n"
    "{context}"
)

prompt_template = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

# E. Assemblage final de la chaîne de traitement (Pipeline RAG)
if retriever:
    question_answer_chain = create_stuff_documents_chain(llm, prompt_template)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
else:
    rag_chain = None

# -------------------------------------------------------------------------
# POINT D'ENTRÉE (ENDPOINT) POUR VOTRE INTERFACE WEB
# -------------------------------------------------------------------------

class UserMessage(BaseModel):
    text: str

@app.post("/chat")
if __name__ == "__main__":
    import uvicorn
    # Koyeb va donner un port automatique via la variable d'environnement PORT
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
async def chat_endpoint(message: UserMessage):
    user_query = message.text
    
    # Sécurité si le fichier JSON n'a pas pu être chargé
    if not rag_chain:
        return {"reply": "Désolé, la base de connaissances ou le système RAG n'est pas prêt."}
    
    try:
        # Envoi de la question au pipeline LangChain
        response = rag_chain.invoke({"input": user_query})
        # Extraction du texte final généré par Gemini
        ai_reply = response.get("answer", "Je n'ai pas pu générer de réponse.")
        return {"reply": ai_reply}
        
    except Exception as e:
        return {"reply": f"Une erreur technique est survenue : {str(e)}"}
# À mettre tout à la fin de votre fichier main.py
if __name__ == "__main__":
    import uvicorn
    import os
    # Koyeb donne un port automatiquement via la variable PORT, sinon on prend 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
# Pour lancer le serveur localement, tapez dans votre terminal :
# uvicorn main:app --reload
