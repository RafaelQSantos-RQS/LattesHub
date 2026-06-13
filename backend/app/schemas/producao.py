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
    volume: Optional[str] = None
    fasciculo: Optional[str] = None
    pagina_inicial: Optional[str] = None
    pagina_final: Optional[str] = None
    pais_publicacao: Optional[str] = None
    titulo_ingles: Optional[str] = None
    palavras_chave: Optional[str] = None
    coautores: Optional[str] = None
    qualis_estrato: Optional[str] = None
    qualis_area_avaliacao: Optional[str] = None
    resumo: Optional[str] = None
    pesquisador_id: int
    pesquisador_nome: str


class ProducaoListResponse(BaseModel):
    total: int
    pagina: int
    tamanho_pagina: int
    resultados: list[ProducaoDetalhe]


class ProducaoTipoResumo(BaseModel):
    tipo_producao: str
    total: int


class ProducaoTiposResponse(BaseModel):
    resultados: list[ProducaoTipoResumo]
