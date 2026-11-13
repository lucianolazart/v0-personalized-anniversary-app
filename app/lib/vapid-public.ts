// Public VAPID key. It is not secret, but it must be the pair of VAPID_PRIVATE_KEY on the
// server. Set it in the hosting env vars (generate a pair with `npx web-push generate-vapid-keys`).
export const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim()
