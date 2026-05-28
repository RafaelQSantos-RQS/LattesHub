from pydantic import BaseModel, Field
from typing import Optional


class BuscaSemanticaRequest(BaseModel):
    pergunta: str = Field(
        ...,
        min_length=5,
        description="Pergunta ou tema para a busca semântica",
    )
    tipo_producao: Optional[str] = Field(
        None,
        description="Filtra por tipo de produção",
    )
    ano: Optional[int] = Field(None, description="Filtra por ano específico")
    instituicao_id: Optional[int] = Field(
        None,
        description="Filtra por instituição do pesquisador",
    )
    areas: Optional[list[int]] = Field(
        None,
        description="Filtra por múltiplos IDs de áreas de conhecimento",
    )


class ArtigoRelevante(BaseModel):
    id: int
    titulo: str
    tipo_producao: str
    ano: int | None
    pesquisador_nome: str
    score: float = Field(..., description="Score de similaridade de 0 a 100")


class BuscaSemanticaResponse(BaseModel):
    resultados: list[ArtigoRelevante]
