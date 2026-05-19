# Utilizando a imagem do Python 3.12 (Estável, Rápida e com Binários Prontos)
FROM python:3.12-slim

# Evita que o Python grave arquivos .pyc e força o log a aparecer no terminal sem buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Instala apenas a dependência de sistema necessária para o PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala as dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código do backend
COPY ./app ./app

# Expõe a porta do FastAPI
EXPOSE 8000

# Comando padrão para rodar a API (o script rodaremos via terminal/cron)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]