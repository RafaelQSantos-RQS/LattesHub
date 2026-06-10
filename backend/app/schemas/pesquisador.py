from pydantic import BaseModel, Field
from typing import Optional


class PesquisadorAreaResumo(BaseModel):
    id: int
    grande_area: str
    area: str
    sub_area: Optional[str] = None
    especialidade: Optional[str] = None


class PesquisadorResumo(BaseModel):
    id: int
    lattes_id: str
    nome: str
    resumo: Optional[str] = None
    instituicao_nome: Optional[str] = None
    areas: list[PesquisadorAreaResumo] = Field(default_factory=list)


class PesquisadorListResponse(BaseModel):
    total: int
    pagina: int
    tamanho_pagina: int
    resultados: list[PesquisadorResumo]

class ProducaoResumo(BaseModel):
    id: int
    tipo_producao: str
    titulo: str
    ano: Optional[int] = None
    revista: Optional[str] = None
    evento: Optional[str] = None
    natureza: Optional[str] = None
    doi: Optional[str] = None


class PesquisadorPerfilResponse(BaseModel):
    pesquisador: PesquisadorResumo
    producoes: list[ProducaoResumo]
