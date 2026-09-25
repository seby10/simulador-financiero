# Despliegue en producción (Render + Vercel)

La API (NestJS) va en **Render**, el portal (Next.js) en **Vercel** y la base en
**Neon**. El navegador solo habla con el dominio de Vercel: Next reenvía `/api` y
`/uploads` a Render con los *rewrites* de `frontend/next.config.ts`. Gracias a eso
las cookies de sesión son del mismo sitio y no hace falta `SameSite=None`.

```
navegador ──► app.vercel.app ──(rewrite)──► api.onrender.com ──► Neon
```

---

## 1. Base de datos (Neon)

1. Crea el proyecto en [neon.tech] y copia las dos cadenas de conexión:
   - **`DATABASE_URL`**: la del host con `-pooler` (la usa la app).
   - **`DIRECT_URL`**: la del host **sin** `-pooler` (la usan las migraciones; el
     pooler no soporta los *advisory locks* que necesita `prisma migrate`).
2. No hace falta crear tablas a mano: las migraciones corren solas en cada
   despliegue de Render.
3. **Elige la región de Neon lo más cerca posible de la de Render.** Cada
   consulta es un viaje de ida y vuelta y los archivos subidos también viven en
   la base: con la API y la base en la misma región son milisegundos, y entre
   continentes se notan (~170 ms por consulta medidos desde Ecuador).

---

## 2. API en Render

### Opción A — Blueprint (recomendada)

El repositorio trae `render.yaml`. En Render: **New > Blueprint**, elige el repo y
completa los valores que pide (los marcados `sync: false`). Eso crea el servicio
con el build, el *start*, el *health check* y las variables ya configuradas.

### Opción B — a mano

**New > Web Service**, y:

| Campo | Valor |
| :--- | :--- |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build && npm run db:deploy` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/api/health` |

### Variables de entorno

| Variable | Valor | Por qué |
| :--- | :--- | :--- |
| `NODE_VERSION` | `24` | En Node 22 el CLI de Nest revienta al cargar `ora` 9 |
| `DATABASE_URL` | Neon con `-pooler` | Conexiones de la app |
| `DIRECT_URL` | Neon sin `-pooler` | Migraciones |
| `CORS_ORIGIN` | `https://<tu-app>.vercel.app` | CORS y comprobación de origen (CSRF) |
| `JWT_SECRET` | `openssl rand -hex 32` | Firma de los access tokens |
| `ADMIN_API_KEY` | `openssl rand -hex 32` | Cabecera `x-admin-key` |
| `COOKIE_SECURE` | `true` | Cookies solo por https |
| `TRUST_PROXY` | `1` | Render termina TLS en su balanceador |
| `NODE_OPTIONS` | `--max-old-space-size=460` | Evita que V8 reviente los 512 MB del plan gratuito |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | los tuyos | Administrador inicial |

> `PORT` lo inyecta Render: no la definas.

### Administrador inicial

Una sola vez, desde la **Shell** del servicio en Render:

```bash
npm run db:seed
```

Es idempotente: crea los catálogos y el administrador de `ADMIN_SEED_*`, y no
pisa la contraseña de una cuenta que ya exista.

---

## 3. Portal en Vercel

**Add New > Project**, elige el repo y:

| Campo | Valor |
| :--- | :--- |
| Root Directory | `frontend` |
| Framework | Next.js (se detecta solo) |

### Variables de entorno

| Variable | Valor |
| :--- | :--- |
| `BACKEND_URL` | `https://<tu-api>.onrender.com` |
| `INTERNAL_API_URL` | `https://<tu-api>.onrender.com/api` |

`BACKEND_URL` alimenta los *rewrites* (lo que llama el navegador) e
`INTERNAL_API_URL` las llamadas que hace el servidor de Next al renderizar. Si
faltan, el sitio compila igual pero todas las páginas dan error 500, porque
intentan hablar con `127.0.0.1:3001`.

> Añade también el dominio de Vercel a `CORS_ORIGIN` en Render, y vuelve a
> desplegar la API para que lo lea.

---

## 4. Comprobación

```bash
curl https://<tu-api>.onrender.com/api/health        # {"status":"ok",...}
curl https://<tu-api>.onrender.com/api/institution   # configuración de la marca
```

Y en el navegador: abre el dominio de Vercel, entra con el administrador del
seed y comprueba que `/admin` carga.

---

## Cosas que muerden

**El primer arranque tarda ~1 minuto.** El plan gratuito de Render duerme el
servicio tras 15 minutos sin tráfico, y al despertar además carga los modelos de
face-api. La primera petición puede agotar el tiempo de espera; la siguiente ya
va. Un ping periódico a `/api/health` lo mantiene despierto.

**Memoria en el plan gratuito.** face-api y TensorFlow entran justos en 512 MB.
Si ves reinicios por falta de memoria (`Out of memory` en los logs), pon
`BIOMETRIC_PROVIDER=simulated` para desactivar la comparación facial real, o sube
de plan.

**Los archivos subidos viven en Postgres**, no en el disco: el disco de Render se
borra en cada despliegue y ahí está la selfie con la que se recupera la
contraseña. Si vienes de una versión anterior, los archivos que estaban en
`backend/uploads/` no se migran solos: hay que volver a subir las imágenes de los
productos desde `/admin`, y los clientes que ya se habían verificado tendrán que
hacerlo otra vez.

**Las migraciones corren en el build.** Si una falla, el despliegue falla y sigue
en pie la versión anterior. Convivir varias instancias no da problema: `migrate
deploy` toma un *lock* en la base.
