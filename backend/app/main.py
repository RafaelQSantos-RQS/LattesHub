from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api_router import api_router

app = FastAPI(
    title="LattesHub API",
    version="1.0",
    description="API pública de dados abertos e descoberta científica apoiada por Inteligência Artificial.",
)

# Configuração de CORS (Cross-Origin Resource Sharing)
# Define quais origens (front-end) possuem permissão para consumir este backend
origins = [
    "http://localhost:4200",  # Angular dev server
    "http://127.0.0.1:4200",  # Angular dev server via loopback IP
    "http://localhost:3000",  # React / Next.js padrão
    "http://localhost:5173",  # Vite / React padrão
    "*",  # Permitir todas em ambiente de desenvolvimento (remover em produção estrita)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Integração do Roteador Central da v1
# Isola todo o ecossistema de endpoints sob o prefixo /api/v1 de forma hierárquica
app.include_router(api_router, prefix="/api/v1")


@app.get("/health-check")
def health_check():
    """Endpoint de Health Check para validação do status da API."""
    return {"message": "LattesHub API e AI Worker operacionais!"}
