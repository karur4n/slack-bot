import { Handler } from '../../routes'
import { Robot } from '../../robot'
import { getCurrentlyPlayingTrack } from './spotify'
import { MatchedChatMessage } from '../..'

export const handleNowPlaying: Handler = async (
  _: MatchedChatMessage,
  robot: Robot
): Promise<void> => {
  const track = await getCurrentlyPlayingTrack()

  console.log('トラック', track)

  if (track == null) {
    return undefined
  }

  const artistsName = track.artists.map((a) => a.name).join(', ')

  const text = [
    `${track.name} / ${artistsName}`,
    `追加したユーザ： ${track.addedBy.displayName}`,
    track.album.images[0].url
  ].join('\n')

  await robot.reply({ text: text })
}
