import { parseBlob as metaParseBlob } from 'music-metadata-browser';
import iconv from 'iconv-lite';

import {
  GetCoverFromFile,
  GetImageFromURL,
  GetMetaFromFile,
  WriteMetaToFlac,
  WriteMetaToMp3,
  AudioMimeType,
} from '@/decrypt/utils';
import { queryAlbumCover } from '@/utils/api';

export async function extractQQMusicMeta(musicBlob: Blob, name: string, ext: string) {
  const musicMeta = await metaParseBlob(musicBlob);
  for (let metaIdx in musicMeta.native) {
    if (!musicMeta.native.hasOwnProperty(metaIdx)) continue;
    if (musicMeta.native[metaIdx].some((item) => item.id === 'TCON' && item.value === '(12)')) {
      console.warn('try using gbk encoding to decode meta');
      musicMeta.common.artist = iconv.decode(new Buffer(musicMeta.common.artist ?? ''), 'gbk');
      musicMeta.common.title = iconv.decode(new Buffer(musicMeta.common.title ?? ''), 'gbk');
      musicMeta.common.album = iconv.decode(new Buffer(musicMeta.common.album ?? ''), 'gbk');
    }
  }

  const info = GetMetaFromFile(name, musicMeta.common.title, musicMeta.common.artist);

  let imgUrl = GetCoverFromFile(musicMeta);
  if (!imgUrl) {
    imgUrl = await getCoverImage(info.title, info.artist, musicMeta.common.album);
    if (imgUrl) {
      const imageInfo = await GetImageFromURL(imgUrl);
      if (imageInfo) {
        imgUrl = imageInfo.url;
        try {
          const newMeta = { picture: imageInfo.buffer, title: info.title, artists: info.artist?.split(' _ ') };
          const buffer = Buffer.from(await musicBlob.arrayBuffer());
          const mime = AudioMimeType[ext] || AudioMimeType.mp3;
          if (ext === 'mp3') {
            musicBlob = new Blob([WriteMetaToMp3(buffer, newMeta, musicMeta)], { type: mime });
          } else if (ext === 'flac') {
            musicBlob = new Blob([WriteMetaToFlac(buffer, newMeta, musicMeta)], { type: mime });
          } else {
            console.info('writing metadata for ' + ext + ' is not being supported for now');
          }
        } catch (e) {
          console.warn('Error while appending cover image to file ' + e);
        }
      }
    }
  }

  return {
    title: info.title,
    artist: info.artist,
    album: musicMeta.common.album,
    imgUrl: imgUrl,
    blob: musicBlob,
  };
}

async function getCoverImage(title: string, artist?: string, album?: string): Promise<string> {
  const song_query_url = 'https://stats.ixarea.com/apis' + '/music/qq-cover';
  try {
    const data = await queryAlbumCover(title, artist, album);
    return `${song_query_url}/${data.Type}/${data.Id}`;
  } catch (e) {
    console.warn(e);
  }
  return '';
}
