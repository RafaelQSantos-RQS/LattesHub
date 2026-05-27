from pydantic import BaseModel
from typing import Optional


class ProducaoDetalhe(BaseModel):
    id: int
    tipo_producao: str
    titulo: str
    ano: Optional[int] = None
    idioma: Optional[str] = None
    natureza: Optional[str] = None
    doi: Optional[str] = None
    revista: Optional[str] = None
    evento: Optional[str] = None
    issn: Optional[str] = None
    pesquisador_id: int
    pesquisador_nome: str


class ProducaoListResponse(BaseModel):
    total: int
    pagina: int
    tamanho_pagina: int
    resultados: list[ProducaoDetalhe]
