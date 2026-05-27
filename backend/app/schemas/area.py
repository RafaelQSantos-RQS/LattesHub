from pydantic import BaseModel
from typing import Optional


class SubAreaInfo(BaseModel):
    id: int
    nome: str


class AreaFiltro(BaseModel):
    nome: str
    subareas: list[SubAreaInfo]


class GrandeAreaFiltro(BaseModel):
    grande_area: str
    areas: list[AreaFiltro]
