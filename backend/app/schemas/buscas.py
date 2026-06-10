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
    qualis_estrato: Optional[str] = Field(
        None,
        description="Filtra por estrato Qualis do periódico, como A1, A2, B1 ou B2",
    )


class ArtigoRelevante(BaseModel):
    id: int
    titulo: str
    tipo_producao: str
    ano: int | None
    pesquisador_nome: str
    score: float = Field(..., description="Score de similaridade de 0 a 100")
    qualis_estrato: str | None = None
    qualis_area_avaliacao: str | None = None
    qualis_titulo: str | None = None


class BuscaSemanticaResponse(BaseModel):
    resultados: list[ArtigoRelevante]
