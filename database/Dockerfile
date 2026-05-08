FROM pgvector/pgvector:pg17

# Copia o script SQL para a pasta de inicialização automática
COPY init.sql /docker-entrypoint-initdb.d/init.sql

EXPOSE 5432