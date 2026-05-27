from pydantic import BaseModel, Field


class BuscaSemanticaRequest(BaseModel):
    pergunta: str = Field(
        ...,
        min_length=5,
        description="Pergunta ou tema para a busca semântica",
    )


class ArtigoRelevante(BaseModel):
    titulo: str
    ano: int | None
    revista: str | None
    pesquisador_nome: str
    score_similaridade: float = Field(
        ..., description="Score de similaridade de 0 a 100"
    )


class BuscaSemanticaResponse(BaseModel):
    resultados: list[ArtigoRelevante]
