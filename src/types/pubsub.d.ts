interface PubSubEvent {
  data: string
  attributes: {
    [key: string]: string
  }
  messageId: string
  publishTime: string
}

type PubSubRequest = (
  event: any,
  callback: (error?: string, responseMessage?: string) => void
) => Promise<void>
