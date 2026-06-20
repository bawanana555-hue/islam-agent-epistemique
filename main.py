import os
import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_google_genai import GoogleGenAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.documents import Document
from langchain_chroma import Chroma
from langchain.chains import crète_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str

JSON_FILE_PATH = "knowledge_base_islam.json"
documents = []

def build_documents():
    docs = []
    if not os.path.exists(JSON_FILE_PATH):
        print(f"⚠️ Fichier introuvable: {JSON_FILE_PATH}")
        return docs

    with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    categories = data.get("categories", [])
    for categorie in categories:
        nom_categorie = categorie.get("name", "Général")
        liste_questions = categorie.get("questions", [])

        for item in liste_questions:
            question = item.get("question", "")
            reponse = item.get("response", "")
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

    print(f"✅ {len(docs)} questions chargées")
    return docs


documents = build_documents()

retriever = None
rag_chain = None

if documents:
    embeddings = GoogleGenAIEmbeddings(model="models/text-embedding-004")
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.3)

    vector_store = Chroma.from_documents(documents, embeddings)
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    system_prompt = (
        "Tu es un assistant virtuel bienveillant.\n"
        "Utilise uniquement les extraits fournis pour répondre.\n"
        "Si info absente, dis que tu ne la possèdes pas dans ta base.\n\n"
        "Base de connaissances:\n{context}"
    )

    prompt_template = ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            ("human", "{input}"),
        ]
    )

    question_answer_chain = create_stuff_documents_chain(llm, prompt_template)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)

@app.get("/")
def home():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"health": "good", "docs": len(documents)}

@app.post("/chat")
def chat(req: ChatRequest):
    if rag_chain is None:
        return {"answer": "Base vide ou RAG non initialisé."}

    result = rag_chain.invoke({"input": req.question})
    return {
        "answer": result.get("answer", ""),
        "context_count": len(result.get("context", [])),
    }
