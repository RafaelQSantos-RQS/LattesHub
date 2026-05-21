from fastapi import APIRouter
from app.api.v1.endpoints import busca

# Se você já tiver o arquivo de pesquisadores com um 'router' definido, descomente a linha abaixo:
# from app.api.v1.endpoints import pesquisadores

api_router = APIRouter()

# Acoplamento do módulo de Inteligência Artificial / Busca Vetorial
api_router.include_router(busca.router, prefix="/busca", tags=["Busca Semântica"])

# Acoplamento de módulos futuros (ex: Pesquisadores, Instituições)
# À medida que criar os arquivos correspondentes, basta descomentar aqui:
# api_router.include_router(
#     pesquisadores.router,
#     prefix="/pesquisadores",
#     tags=["Pesquisadores"]
# )
