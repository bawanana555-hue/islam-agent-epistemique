import os
import json
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
import uvicorn

from langchain_google_genai import GoogleGenAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# ============================================================
# CHARGEMENT DES VARIABLES D'ENVIRONNEMENT
# ============================================================
load_dotenv()

# Vérification de la clé API
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    print("⚠️ ATTENTION: GOOGLE_API_KEY non trouvée dans .env")
    print("💡 Créez un fichier .env avec: GOOGLE_API_KEY=votre_clé_ici")

# ============================================================
# CONFIGURATION FASTAPI
# ============================================================
app = FastAPI(
    title="Islam Agent Épistémique - API",
    description="Agent IA pour la théologie islamique avec RAG",
    version="2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MODÈLES DE DONNÉES
# ============================================================
class ChatRequest(BaseModel):
    question: str
    mode: str = "hybrid"  # "local", "hybrid", "online"

class ChatResponse(BaseModel):
    answer: str
    context_count: int = 0
    sources: list = []
    mode_used: str = "hybrid"

# ============================================================
# DÉTECTION AUTOMATIQUE DU CHEMIN DU FICHIER JSON
# ============================================================
def find_json_file(filename="knowledge_base_islam.json"):
    """Recherche le fichier JSON dans plusieurs emplacements"""
    
    # Liste des chemins possibles
    possible_paths = [
        # Chemin absolu du dossier courant
        Path.cwd() / filename,
        # Dossier du script
        Path(__file__).parent / filename,
        # Dossier parent
        Path(__file__).parent.parent / filename,
        # Dossier data
        Path.cwd() / "data" / filename,
        # Dossier assets
        Path.cwd() / "assets" / filename,
        # Dossier static
        Path.cwd() / "static" / filename,
        # Dossier public
        Path.cwd() / "public" / filename,
        # Chemin relatif
        Path("./") / filename,
        Path("../") / filename,
        Path("../../") / filename,
        # Chemin Android (si déployé sur Android)
        Path("/sdcard/") / filename,
        Path("/storage/emulated/0/") / filename,
        Path("/data/data/") / filename,
    ]
    
    # Ajouter le chemin depuis la variable d'environnement
    env_path = os.getenv("KNOWLEDGE_BASE_PATH")
    if env_path:
        possible_paths.append(Path(env_path) / filename)
    
    # Vérifier chaque chemin
    for path in possible_paths:
        try:
            if path.exists() and path.is_file():
                print(f"✅ Fichier trouvé : {path}")
                return str(path)
        except:
            continue
    
    # Si non trouvé, créer un fichier par défaut
    print(f"⚠️ Fichier {filename} introuvable. Création d'un fichier par défaut...")
    create_default_json(str(Path.cwd() / filename))
    return str(Path.cwd() / filename)

def create_default_json(filepath):
    """Crée un fichier JSON par défaut si aucun n'existe"""
    default_data = {
        "categories": [
            {
                "name": "Théologie islamique",
                "questions": [
                    {
                        "id": 1,
                        "question": "Qu'est-ce que le Tawḥīd ?",
                        "response": "Le Tawḥīd est l'unicité d'Allah. Il comprend trois aspects : l'unicité de la Seigneurie (Rubūbiyyah), l'unicité de l'Adoration (Ulūhiyyah), et l'unicité des Noms et Attributs (Asmāʾ wa Ṣifāt).",
                        "references": ["Coran 112", "Hadith"],
                        "tags": ["tawhid", "unicite", "allah"]
                    },
                    {
                        "id": 2,
                        "question": "Quels sont les piliers de la foi ?",
                        "response": "Les six piliers de la foi sont : 1) La croyance en Allah, 2) en Ses anges, 3) en Ses livres, 4) en Ses prophètes, 5) au Jour Dernier, et 6) au destin (qadar) avec son bien et son mal.",
                        "references": ["Coran 2:177", "Hadith de Jibril"],
                        "tags": ["piliers", "foi", "iman"]
                    },
                    {
                        "id": 3,
                        "question": "Qu'est-ce que la charia ?",
                        "response": "La charia est la loi islamique divine qui régit tous les aspects de la vie du musulman. Elle est basée sur le Coran, la Sunna, le consensus (Ijmāʿ) et le raisonnement analogique (Qiyās).",
                        "references": ["Coran 45:18"],
                        "tags": ["charia", "loi", "islamique"]
                    }
                ]
            },
            {
                "name": "Prophétologie",
                "questions": [
                    {
                        "id": 4,
                        "question": "Qui est le dernier prophète ?",
                        "response": "Le dernier prophète est Muhammad (paix et bénédictions sur lui), envoyé comme sceau des prophètes et messager pour toute l'humanité.",
                        "references": ["Coran 33:40"],
                        "tags": ["prophete", "muhammad", "dernier"]
                    }
                ]
            }
        ]
    }
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)
        print(f"✅ Fichier par défaut créé : {filepath}")
    except Exception as e:
        print(f"❌ Erreur création fichier par défaut : {e}")

# ============================================================
# CHARGEMENT DE LA BASE DE CONNAISSANCES
# ============================================================
JSON_FILE_PATH = find_json_file()
documents = []

def build_documents():
    """Construit les documents à partir du fichier JSON"""
    docs = []
    
    try:
        if not os.path.exists(JSON_FILE_PATH):
            print(f"❌ Fichier introuvable: {JSON_FILE_PATH}")
            return docs
        
        with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Vérification de la structure
        if not data:
            print("⚠️ Fichier JSON vide")
            return docs
        
        categories = data.get("categories", [])
        if not categories:
            print("⚠️ Aucune catégorie trouvée dans le JSON")
            # Essayer une structure alternative
            if "chapitres" in data:
                categories = data.get("chapitres", [])
        
        for categorie in categories:
            nom_categorie = categorie.get("name") or categorie.get("titre", "Général")
            liste_questions = categorie.get("questions", []) or categorie.get("contenu", [])
            
            # Si c'est une liste de textes simples
            if isinstance(liste_questions, list) and all(isinstance(item, str) for item in liste_questions):
                for idx, texte in enumerate(liste_questions):
                    text_content = f"Catégorie: {nom_categorie}\nContenu: {texte}"
                    docs.append(
                        Document(
                            page_content=text_content,
                            metadata={
                                "source": JSON_FILE_PATH,
                                "id": idx,
                                "categorie": nom_categorie,
                            },
                        )
                    )
            else:
                # Structure avec questions/réponses
                for item in liste_questions:
                    if isinstance(item, dict):
                        question = item.get("question", "")
                        reponse = item.get("response", "") or item.get("contenu", "")
                        references = ", ".join(item.get("references", []))
                        tags = ", ".join(item.get("tags", []))
                        
                        text_content = (
                            f"Catégorie: {nom_categorie}\n"
                            f"Question: {question}\n"
                            f"Réponse officielle: {reponse}\n"
                            f"Références textuelles: {references}\n"
                            f"Mots-clés: {tags}"
                        )
                        
                        docs.append(
                            Document(
                                page_content=text_content,
                                metadata={
                                    "source": JSON_FILE_PATH,
                                    "id": item.get("id"),
                                    "categorie": nom_categorie,
                                },
                            )
                        )
        
        print(f"✅ {len(docs)} documents chargés depuis {JSON_FILE_PATH}")
        
    except json.JSONDecodeError as e:
        print(f"❌ Erreur de parsing JSON: {e}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
    
    return docs

documents = build_documents()

# ============================================================
# INITIALISATION DU RAG
# ============================================================
retriever = None
rag_chain = None
embeddings = None
llm = None

def init_rag():
    global retriever, rag_chain, embeddings, llm
    
    if not documents:
        print("⚠️ Aucun document à indexer")
        return False
    
    try:
        # Vérification de la clé API
        if not API_KEY:
            print("❌ Clé API Google manquante")
            return False
        
        # Initialisation des embeddings
        print("🔄 Initialisation des embeddings...")
        embeddings = GoogleGenAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=API_KEY
        )
        
        # Initialisation du LLM (gemini-2.0-flash-exp ou fallback)
        print("🔄 Initialisation du modèle LLM...")
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp",
                temperature=0.3,
                google_api_key=API_KEY
            )
        except Exception as e:
            print(f"⚠️ gemini-2.0-flash-exp indisponible: {e}")
            print("🔄 Fallback vers gemini-1.5-flash...")
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                temperature=0.3,
                google_api_key=API_KEY
            )
        
        # Création du vector store
        print("🔄 Création du vector store...")
        vector_store = Chroma.from_documents(
            documents, 
            embeddings,
            persist_directory="./chroma_db"  # Persistance pour éviter de re-calculer
        )
        
        # Création du retriever
        retriever = vector_store.as_retriever(
            search_kwargs={"k": 5}  # Récupérer plus de contextes
        )
        
        # Prompt système amélioré
        system_prompt = (
            "Tu es Islam Agent Épistémique, un expert en théologie islamique.\n"
            "Utilise UNIQUEMENT les extraits de la base de connaissances fournis.\n"
            "Si l'information n'est pas dans les extraits, dis-le clairement.\n"
            "Ne mentionne pas que tu es une IA ou un modèle de langage.\n"
            "Ne dis pas 'voici une réponse' ou des phrases d'introduction.\n"
            "Commence directement par le contenu substantiel.\n\n"
            "Style académique, précis, documenté.\n"
            "Utilise ## pour les titres, ### pour les sous-titres.\n"
            "Mets en évidence les passages clés avec ** **.\n\n"
            "Base de connaissances:\n{context}"
        )
        
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        # Création des chaînes
        question_answer_chain = create_stuff_documents_chain(llm, prompt_template)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
        
        print("✅ RAG initialisé avec succès !")
        return True
        
    except Exception as e:
        print(f"❌ Erreur d'initialisation du RAG: {e}")
        return False

# Initialiser le RAG
rag_initialized = init_rag()

# ============================================================
# ENDPOINTS API
# ============================================================
@app.get("/")
def home():
    return {
        "status": "ok",
        "name": "Islam Agent Épistémique API",
        "version": "2.0",
        "docs_count": len(documents),
        "rag_ready": rag_initialized
    }

@app.get("/health")
def health():
    return {
        "health": "good",
        "docs": len(documents),
        "rag_ready": rag_initialized,
        "json_path": JSON_FILE_PATH
    }

@app.get("/status")
def status():
    """Statut détaillé de l'agent"""
    return {
        "agent": "Islam Agent Épistémique",
        "json_file": JSON_FILE_PATH,
        "documents_count": len(documents),
        "rag_initialized": rag_initialized,
        "api_key_present": bool(API_KEY),
        "models": {
            "embedding": "models/text-embedding-004",
            "llm": llm.model if llm else "Non initialisé"
        }
    }

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Endpoint principal de chat avec RAG"""
    
    if not rag_chain or not rag_initialized:
        # Mode dégradé : recherche simple dans le JSON
        return {
            "answer": "⚠️ RAG non disponible. Utilisation du mode dégradé.\n\n" + search_json_simple(req.question),
            "context_count": 0,
            "sources": [],
            "mode_used": "degraded"
        }
    
    try:
        # Exécution de la requête RAG
        result = rag_chain.invoke({"input": req.question})
        
        answer = result.get("answer", "")
        
        # Nettoyer la réponse
        answer = clean_response(answer)
        
        # Récupérer les sources
        sources = []
        for doc in result.get("context", []):
            if hasattr(doc, 'metadata'):
                sources.append({
                    "source": doc.metadata.get("source", "inconnue"),
                    "categorie": doc.metadata.get("categorie", "général")
                })
        
        return ChatResponse(
            answer=answer,
            context_count=len(result.get("context", [])),
            sources=sources,
            mode_used="hybrid"
        )
        
    except Exception as e:
        print(f"❌ Erreur lors du chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def search_json_simple(query):
    """Recherche simple dans le JSON (fallback)"""
    try:
        with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        results = []
        query_lower = query.lower()
        
        categories = data.get("categories", [])
        for categorie in categories:
            nom = categorie.get("name", "")
            questions = categorie.get("questions", [])
            
            for item in questions:
                question = item.get("question", "")
                reponse = item.get("response", "")
                
                if query_lower in question.lower() or query_lower in reponse.lower():
                    results.append(f"📌 {question}\n{reponse}")
        
        if results:
            return "\n\n---\n\n".join(results[:3])
        else:
            return "Je n'ai pas trouvé de correspondance dans la base. Veuillez reformuler votre question."
            
    except Exception as e:
        return f"Erreur de recherche: {e}"

def clean_response(text):
    """Nettoie la réponse des expressions parasites"""
    patterns = [
        r'^Voici une réponse[.\s]*',
        r'^Je vais vous répondre[.\s]*',
        r'^D\'après ma compréhension[.\s]*',
        r'^En tant qu\'assistant[.\s]*',
        r'^Je suis un modèle de langage[.\s]*',
        r'^Je peux vous aider avec[.\s]*',
        r'^Voici ce que je peux vous dire[.\s]*',
        r'^Permettez-moi de vous expliquer[.\s]*',
        r'^Je vais essayer de répondre[.\s]*',
        r'^Voilà une réponse[.\s]*',
        r'^Je comprends votre question[.\s]*',
        r'^En tant qu\'IA[.\s]*',
    ]
    
    for pattern in patterns:
        import re
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Supprimer les références à l'IA
    text = re.sub(r'Je suis (un )?assistant IA[^.]*\.', '', text, flags=re.IGNORECASE)
    text = re.sub(r'En tant qu\'(IA|intelligence artificielle)[^.]*\.', '', text, flags=re.IGNORECASE)
    
    return text.strip()

# ============================================================
# SERVEUR STATIQUE POUR LE FRONTEND
# ============================================================
# Servir les fichiers statiques si le dossier existe
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# ============================================================
# LANCEMENT DU SERVEUR
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("🕌 Islam Agent Épistémique - Serveur")
    print("=" * 60)
    print(f"📁 Base de données: {JSON_FILE_PATH}")
    print(f"📄 Documents chargés: {len(documents)}")
    print(f"🔑 Clé API: {'✅ Présente' if API_KEY else '❌ Manquante'}")
    print(f"🧠 RAG: {'✅ Initialisé' if rag_initialized else '❌ Non disponible'}")
    print("=" * 60)
    print("🌐 Serveur démarré sur http://localhost:8000")
    print("📖 Documentation: http://localhost:8000/docs")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
