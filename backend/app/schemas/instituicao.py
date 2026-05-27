from pydantic import BaseModel
from typing import Optional


class InstituicaoResumo(BaseModel):
    id: int
    nome: str
    cidade: Optional[str] = None
    estado: Optional[str] = None
    pais: Optional[str] = None


class InstituicaoListResponse(BaseModel):
    total: int
    pagina: int
    tamanho_pagina: int
    resultados: list[InstituicaoResumo]

class PesquisadorDaInstituicao(BaseModel):
    id: int
    lattes_id: str
    nome: str
    resumo: Optional[str] = None

class InstituicaoPesquisadoresResponse(BaseModel):
    instituicao: InstituicaoResumo
    total: int
    pagina: int
    tamanho_pagina: int
    resultados: list[PesquisadorDaInstituicao]

class ProducaoDaInstituicao(BaseModel):
    id: int
    tipo_producao: str
    titulo: str
    ano: Optional[int] = None
    pesquisador_id: int
    pesquisador_nome: str

class InstituicaoProducoesResponse(BaseModel):
    instituicao: InstituicaoResumo
    total: int
    pagina: int
    tamanho_pagina: int
    resultados: list[ProducaoDaInstituicao]
