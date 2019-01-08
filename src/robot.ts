import axios from 'axios'
import { MatchedChatMessage } from '.'

export interface Robot {
  reply(message: ReplyMessage): Promise<void>
}

interface ReplyMessage {
  text: string
}

export class RobotImpl implements Robot {
  private message: MatchedChatMessage

  constructor(message: MatchedChatMessage) {
    this.message = message
  }

  async reply(message: ReplyMessage): Promise<void> {
    await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel: this.message.channel,
        text: message.text
      },
      {
        headers: buildHeaders()
      }
    )
  }
}

function buildHeaders(): { [key: string]: string } {
  return {
    Authorization: `Bearer ${process.env.SLACK_TOKEN}`
  }
}
