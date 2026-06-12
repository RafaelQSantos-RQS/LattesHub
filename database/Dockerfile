FROM pgvector/pgvector:pg17

COPY init.sql /docker-entrypoint-initdb.d/000_init.sql

COPY migrations/ /docker-entrypoint-initdb.d/

EXPOSE 5432