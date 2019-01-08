import { routes } from './routes'
import { RobotImpl } from './robot'
import { refreshToken } from './handlers/spotifyNowPlayingHandler/spotify'
const { PubSub } = require('@google-cloud/pubsub')

enum SlackEventRequestType {
  EventCallback = 'event_callback',
  UrlVerification = 'url_verification'
}

export type SlackEventRequest =
  | SlackVerificationEventRequest
  | SlackCallBackEventRequest

interface SlackVerificationEventRequest {
  body: {
    challenge: string
    type: SlackEventRequestType.UrlVerification
  }
}

interface SlackCallBackEventRequest {
  body: {
    type: SlackEventRequestType.EventCallback
    event: {
      type: SlackEventType
      text: string
      channel: string
      subtype?: string
    }
  }
}

enum SlackEventType {
  AppMention = 'app_mention',
  DirectMessage = 'message'
}

interface ChatMessage {
  text: string
  channel: string
  user: string
}

export interface MatchedChatMessage {
  matched: ReadonlyArray<string>
  text: string
  channel: string
  user: string
}

/**
 * Google Cloud Pub/Sub にあげる方
 */
export const handleByBot: PubSubRequest = async (
  message: any
): Promise<void> => {
  const chatMessage: ChatMessage | undefined = (() => {
    const { data } = message

    if (data == null && data == '') {
      return undefined
    }

    return JSON.parse(Buffer.from(data, 'base64').toString()) as ChatMessage
  })()

  if (chatMessage == null) {
    return undefined
  }

  for (const r of routes) {
    const matched = chatMessage.text.match(r.pattern)

    if (matched != null) {
      const matchedMessage = {
        ...chatMessage,
        matched: matched
      }

      await r.handler(matchedMessage, new RobotImpl(matchedMessage))

      return undefined
    }
  }
}

/**
 * Cloud Functions にあげる方
 */
export async function handleSlackEventRequest(
  request: SlackEventRequest,
  response: any
) {
  const body = request.body

  switch (body.type) {
    case SlackEventRequestType.UrlVerification:
      return verifySlackChallenge(
        request as SlackVerificationEventRequest,
        response
      )
    case SlackEventRequestType.EventCallback:
      return handleEventCallBack(request as SlackCallBackEventRequest, response)
  }
}

async function handleEventCallBack(
  request: SlackCallBackEventRequest,
  response: any
) {
  const { body } = request
  const postedByNotUser =
    body.event.type === SlackEventType.DirectMessage &&
    body.event.subtype != null

  if (postedByNotUser) {
    return response.status(200).send()
  }

  const requestText = (() => {
    const { event } = body

    switch (event.type) {
      case SlackEventType.AppMention:
        // `bot nowplaying` みたいに届く
        return event.text
          .split(' ')
          .slice(1)
          .join(' ')
      case SlackEventType.DirectMessage:
        if (body.event.subtype != null) {
          throw new Error('無視するメッセージです')
        }
        // DM なので `nowplaying` みたいに届く
        return event.text
    }
  })()

  const pubSubClient = new PubSub({
    projectId: process.env.GCP_PROJECT
  })

  const data = {
    channel: body.event.channel,
    text: requestText
  }

  const dataBuffer = Buffer.from(JSON.stringify(data))

  const messageId = await pubSubClient
    .topic('my-topic')
    .publisher()
    .publish(dataBuffer)

  console.log(`${messageId} をパブリッシュしました`)

  return response.status(200).send(`${messageId} をパブリッシュしました`)
}

// https://api.slack.com/events/url_verification
function verifySlackChallenge(
  request: SlackVerificationEventRequest,
  response: any
) {
  const body = request.body
  return response.send(body.challenge)
}

/**
 * Cloud Functions にあげる方
 */
export const refreshSpotifyToken = async (_: any, response: any) => {
  await refreshToken()

  return response.send()
}
