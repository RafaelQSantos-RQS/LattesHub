from pydantic import BaseModel
from typing import Optional


class PesquisadorResumo(BaseModel):
    id: int
    lattes_id: str
    nome: str
    resumo: Optional[str] = None
    instituicao_nome: Optional[str] = None


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
