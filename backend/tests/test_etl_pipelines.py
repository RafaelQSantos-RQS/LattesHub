from pathlib import Path
import xml.etree.ElementTree as ET

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
PIPELINES_DIR = REPO_ROOT / "database" / "apache_hop" / "metadata" / "pipelines"
WORKFLOW_PATH = (
    REPO_ROOT / "database" / "apache_hop" / "metadata" / "workflows" / "workflow_master.hwf"
)

pytestmark = pytest.mark.skipif(
    not PIPELINES_DIR.exists(),
    reason="Apache Hop metadata is outside the backend-only Docker image",
)


EXPECTED_PRODUCTION_PIPELINES = {
    "pipeline_producoes_artigos.hpl": (
        "ARTIGO PUBLICADO",
        "/CURRICULO-VITAE/PRODUCAO-BIBLIOGRAFICA/ARTIGOS-PUBLICADOS/ARTIGO-PUBLICADO",
    ),
    "pipeline_producoes_eventos.hpl": (
        "TRABALHO EM EVENTOS",
        "/CURRICULO-VITAE/PRODUCAO-BIBLIOGRAFICA/TRABALHOS-EM-EVENTOS/TRABALHO-EM-EVENTOS",
    ),
    "pipeline_producoes_livros.hpl": (
        "LIVRO PUBLICADO",
        "/CURRICULO-VITAE/PRODUCAO-BIBLIOGRAFICA/LIVROS-E-CAPITULOS/LIVROS-PUBLICADOS-OU-ORGANIZADOS/LIVRO-PUBLICADO-OU-ORGANIZADO",
    ),
    "pipeline_producoes_capitulos.hpl": (
        "CAPITULO DE LIVRO",
        "/CURRICULO-VITAE/PRODUCAO-BIBLIOGRAFICA/LIVROS-E-CAPITULOS/CAPITULOS-DE-LIVROS-PUBLICADOS/CAPITULO-DE-LIVRO-PUBLICADO",
    ),
}


def _transform(root, name):
    for transform in root.findall("transform"):
        if transform.findtext("name") == name:
            return transform
    raise AssertionError(f"Transform nao encontrado: {name}")


def test_pipelines_de_producoes_importam_tipos_esperados():
    for filename, (tipo_producao, loopxpath) in EXPECTED_PRODUCTION_PIPELINES.items():
        root = ET.parse(PIPELINES_DIR / filename).getroot()

        constants = _transform(root, "Add constants - tipo_producao").find("fields")
        assert constants.find("field/nullif").text == tipo_producao

        xml_transform = _transform(root, "Get data from XML")
        assert xml_transform.findtext("loopxpath") == loopxpath
        field_names = {
            field.findtext("name")
            for field in xml_transform.find("fields").findall("field")
        }
        assert {"lattes_id", "titulo", "ano_str", "natureza", "doi"}.issubset(
            field_names
        )

        insert_update = _transform(root, "Insert / update - producoes")
        lookup_keys = [
            key.findtext("name")
            for key in insert_update.find("lookup").findall("key")
        ]
        assert lookup_keys == ["pesquisador_id", "tipo_producao", "titulo"]


def test_workflow_master_encadeia_todos_pipelines_de_producao():
    root = ET.parse(WORKFLOW_PATH).getroot()
    filenames = {
        action.findtext("filename")
        for action in root.findall("actions/action")
        if action.findtext("type") == "PIPELINE"
    }

    for filename in EXPECTED_PRODUCTION_PIPELINES:
        assert f"${{PROJECT_HOME}}/metadata/pipelines/{filename}" in filenames

    hops = [
        (hop.findtext("from"), hop.findtext("to"))
        for hop in root.findall("hops/hop")
        if hop.findtext("evaluation") == "Y"
    ]
    assert ("Executar Artigos", "Executar Eventos") in hops
    assert ("Executar Eventos", "Executar Livros") in hops
    assert ("Executar Livros", "Executar Capitulos") in hops
    assert ("Executar Capitulos", "Success") in hops
