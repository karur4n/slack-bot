import axios from 'axios'
import querystring from 'querystring'
import { buildFirestore } from '../../firestore'

export async function getCurrentlyPlayingTrack(): Promise<
  PlaylistTrack | undefined
> {
  const db = buildFirestore()
  const tokenRef = await db.collection('token').doc('token')

  const tokenDoc = await (async () => {
    const doc = await tokenRef.get()

    if (!doc.exists) {
      return undefined
    }

    return doc.data()
  })()

  if (tokenDoc == null) {
    throw new Error('Firestore にトークンのドキュメントが存在しない')
  }

  const response = await axios.get<SpotifyApiCurrentlyPlayingTrack>(
    'https://api.spotify.com/v1/me/player/currently-playing',
    {
      headers: {
        'Accept-Language': 'ja;q=1',
        Authorization: `Bearer ${tokenDoc.accessToken}`
      }
    }
  )

  const contextType = response.data.context.type
  const track = response.data.item

  if (track == null) {
    return undefined
  }

  console.log('コンテクストタイプ', response.data.context)

  if (contextType !== 'playlist') {
    return undefined
  }

  const playlistId = getPlaylistIdByContext(response.data.context)

  console.log('プレイリスト ID です', playlistId)

  const playlistTracks = await getPlaylistTracks(playlistId)

  const playlistTrack = playlistTracks.find((t) => t.track.id === track.id)

  if (playlistTrack == null) {
    return undefined
  }

  const user = await getUser(playlistTrack.added_by.id)

  return {
    ...track,
    addedBy: {
      displayName: user.display_name
    }
  }
}

export async function refreshToken(): Promise<void> {
  const db = buildFirestore()

  const tokenRef = await db.collection('token').doc('token')

  const tokenDoc = await (async () => {
    const doc = await tokenRef.get()

    if (!doc.exists) {
      return undefined
    }

    return doc.data()
  })()

  if (tokenDoc == null) {
    throw new Error('Firestore にトークンのドキュメントが存在しない')
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokenDoc.refreshToken
      }),
      {
        headers: {
          Authorization:
            'Basic ' +
            new Buffer(clientId + ':' + clientSecret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    const newAccessToken = response.data.access_token

    await tokenRef.set({
      accessToken: newAccessToken,
      refreshToken: tokenDoc.refreshToken
    })
  } catch (e) {
    console.log(e.response.data)

    throw e
  }
}

async function getPlaylistTracks(
  playlistId: string
): Promise<ReadonlyArray<SpotifyApiPlaylistTrack>> {
  let shouldNext = true
  let pageIndex = 0

  let result: Array<SpotifyApiPlaylistTrack> = []

  const db = buildFirestore()
  const tokenRef = await db.collection('token').doc('token')

  const tokenDoc = await (async () => {
    const doc = await tokenRef.get()

    if (!doc.exists) {
      return undefined
    }

    return doc.data()
  })()

  while (shouldNext) {
    const offset = pageIndex * 100

    const r = (await axios.get<SpotifyApiPlaylistTracks>(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${tokenDoc!.accessToken}`
        },
        params: {
          offset: offset
        }
      }
    )).data

    console.log('tracks のレスポンスです', r)

    result = [...result, ...r.items]

    shouldNext = r.items.length >= 100
    pageIndex += 1
  }

  return result
}

function getPlaylistIdByContext(context: SpotifyApiContext) {
  // `https://api.spotify.com/v1/users/spotify/playlists/49znshcYJROspEqBoHg3Sv` から
  // `49znshcYJROspEqBoHg3Sv` にマッチさせる
  const matched = context.href.match(/.*\/(.*)$/)!

  return matched[1]
}

async function getUser(userId: string): Promise<SpotifyApiUser> {
  const db = buildFirestore()
  const tokenRef = await db.collection('token').doc('token')

  const tokenDoc = await (async () => {
    const doc = await tokenRef.get()

    if (!doc.exists) {
      return undefined
    }

    return doc.data()
  })()

  if (tokenDoc == null) {
    throw new Error('Firestore にトークンのドキュメントが存在しない')
  }

  return (await axios.get<SpotifyApiUser>(
    `https://api.spotify.com/v1/users/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${tokenDoc.accessToken}`
      }
    }
  )).data
}

interface SpotifyApiCurrentlyPlayingTrack {
  item?: SpotifyApiTrack
  context: SpotifyApiContext
}

interface SpotifyApiContext {
  type: 'album' | 'artist' | 'playlist'
  href: string
}

interface PlaylistTrack {}

interface SpotifyApiUser {
  display_name: string
  id: string
}

type SpotifyApiPlaylistTracks = {
  items: ReadonlyArray<SpotifyApiPlaylistTrack>
}

interface SpotifyApiPlaylistTrack {
  added_by: SpotifyApiUser
  track: SpotifyApiTrack
}

interface SpotifyApiTrack {
  id: string
  artists: Array<{ name: string }>
  name: string
  album: {
    images: Array<{ height: number; url: string; width: number }>
  }
}

interface SpotifyApiUser {
  display_name: string
}

interface PlaylistTrack {
  artists: Array<{ name: string }>
  name: string
  album: {
    images: Array<{ height: number; url: string; width: number }>
  }
  addedBy: {
    displayName: string
  }
}
