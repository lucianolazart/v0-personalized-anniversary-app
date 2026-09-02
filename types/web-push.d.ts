declare module "web-push" {
  interface PushSubscription {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }

  interface SendResult {
    statusCode: number
    body: string
    headers: Record<string, string>
  }

  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void
    sendNotification(
      subscription: PushSubscription,
      payload?: string | Buffer | null,
      options?: object
    ): Promise<SendResult>
  }

  export default webpush
}
