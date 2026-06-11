import logging
from typing import NoReturn

from fastapi import HTTPException

INTERNAL_SERVER_ERROR_DETAIL = "Erro interno no servidor ao processar a requisi\u00e7\u00e3o."


def raise_internal_server_error(
    logger: logging.Logger,
    context: str,
    exc: Exception,
) -> NoReturn:
    logger.exception("%s: %s", context, exc)
    raise HTTPException(
        status_code=500,
        detail=INTERNAL_SERVER_ERROR_DETAIL,
    ) from exc
