# 🗄️ Base de Datos Local (Docker PostgreSQL)

Este directorio contiene la configuración de Docker Compose para levantar una instancia local de PostgreSQL para el **Simulador Financiero**.

---

## 🚀 Cómo Iniciar la Base de Datos

Ejecuta el siguiente comando dentro de esta carpeta (`/bd`):

```bash
docker compose up -d
```

O desde la raíz del proyecto:

```bash
docker compose -f bd/docker-compose.yml up -d
```

---

## ⚙️ Configuración por Defecto

Son los valores por defecto de `docker-compose.yml`. Para cambiarlos crea un `bd/.env`
(no se versiona) con `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` o `POSTGRES_PORT`.

- **Host**: `localhost`
- **Puerto**: `5433` (mapeado al puerto `5432` interno)
- **Usuario**: `postgres`
- **Contraseña**: `postgrespassword`
- **Base de datos**: `simulador_financiero`
- **URL de Conexión (Prisma)**:
  `postgresql://postgres:postgrespassword@localhost:5433/simulador_financiero?schema=public`

---

## 🛠️ Comandos Útiles

- **Ver el estado del contenedor**:

  ```bash
  docker compose ps
  ```

- **Ver los logs de la base de datos**:

  ```bash
  docker compose logs -f
  ```

- **Detener la base de datos**:

  ```bash
  docker compose down
  ```

- **Detener y eliminar los datos de la base de datos (Reset)**:

  ```bash
  docker compose down -v
  ```

---

## 🔄 Migraciones y Seed (Prisma)

Una vez iniciado el contenedor con `docker compose up -d`, navega a la carpeta `backend` para aplicar las migraciones y sembrar los datos iniciales:

```bash
cd ../backend
npx prisma migrate deploy   # aplica las migraciones versionadas
npx prisma db seed          # datos iniciales y administrador
```

> No uses `prisma db push`: cambia la base sin crear una migración y el resto del
> equipo (y el servidor) se queda con un esquema distinto.
