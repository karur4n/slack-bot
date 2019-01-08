import { Robot } from './robot'
import { handleNowPlaying } from './handlers/spotifyNowPlayingHandler/spotifyNowPlayingHandler'
import { MatchedChatMessage } from '.'

export interface Route {
  pattern: RegExp
  handler: Handler
}

export type Handler = (
  message: MatchedChatMessage,
  robot: Robot
) => Promise<void>

export const routes: Route[] = [
  {
    pattern: /^nowplaying$/,
    handler: handleNowPlaying
  }
]
