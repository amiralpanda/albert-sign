/** Run work after HTTP response (Vercel waitUntil) or fire-and-forget locally. */
export function scheduleBackground(task: () => Promise<void>): void {
  void (async () => {
    try {
      if (process.env.VERCEL) {
        const { waitUntil } = await import('@vercel/functions')
        waitUntil(task())
        return
      }
      await task()
    } catch (err) {
      console.error('Background task failed:', err)
    }
  })()
}
