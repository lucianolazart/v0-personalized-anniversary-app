# Personalized anniversary app

## Notificaciones push (movie nights y planes)

Cómo funciona:

1. El celular (PWA instalada) registra `public/service-worker.js`, se suscribe con la clave VAPID pública y guarda la suscripción en Firestore (`pushSubscriptions`).
2. El cron de `vercel.json` llama todos los días a `/api/movie-night/reminders` a las 13:00 UTC (10:00 en Argentina) y manda un aviso la víspera y otro el mismo día de cada movie night o plan.
3. El botón **Send test** de la app llama a `/api/movie-night/test-push` y manda un push solo al dispositivo que lo tocó.

Variables de entorno (en Vercel → Settings → Environment Variables, nunca en el repo):

| Variable | Qué es |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave VAPID pública. La usan el cliente y el servidor. |
| `VAPID_PRIVATE_KEY` | Clave VAPID privada. Secreta, solo para el servidor. |
| `VAPID_SUBJECT` | Opcional. `mailto:tu@mail` o una URL `https://`. |
| `CRON_SECRET` | Opcional pero recomendada. Si está definida, Vercel la manda en el cron y el endpoint rechaza llamadas sin ella. |

Para generar el par de claves VAPID, corré `npx web-push generate-vapid-keys`. Después de cambiar las variables, hay que volver a desplegar.
