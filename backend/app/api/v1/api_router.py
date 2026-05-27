from app.api.v1.endpoints import instituicoes
from fastapi import APIRouter
from app.api.v1.endpoints import busca, pesquisadores, producoes, areas

api_router = APIRouter()

# Acoplamento do módulo de Inteligência Artificial / Busca Vetorial
api_router.include_router(busca.router, prefix="/busca", tags=["Busca Semântica"])

api_router.include_router(
    pesquisadores.router, prefix="/pesquisadores", tags=["Pesquisadores"]
)

api_router.include_router(
    instituicoes.router, prefix="/instituicoes", tags=["Instituições"]
)

api_router.include_router(
    producoes.router, prefix="/producoes", tags=["Produções Científicas"]
)

api_router.include_router(areas.router, prefix="/areas", tags=["Áreas de Conhecimento"])
