### Para realizar uma pausa no banco no momento em que ele se encontra:

**Para pausar o banco:**

```bash
docker pause latteshub_db
```

**Para despausar o banco:**

```bash
docker unpause latteshub_db
```

### Para realizar um stop do banco:

**Para parar o banco:**

```bash
docker stop latteshub_db
```

**Para ligar novamente:**

```bash
docker start latteshub_db
```

### Parar via docker compose:

**Parar e manter os containers criados:**

```bash
docker compose stop
```

_(Isso apenas desliga os serviços, mas mantém tudo pronto para um `docker compose start` rápido)._
