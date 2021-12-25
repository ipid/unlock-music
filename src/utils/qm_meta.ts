import { IAudioMetadata, parseBlob as metaParseBlob } from 'music-metadata-browser';
import iconv from 'iconv-lite';

import {
  GetCoverFromFile,
  GetImageFromURL,
  GetMetaFromFile,
  WriteMetaToFlac,
  WriteMetaToMp3,
  AudioMimeType,
} from '@/decrypt/utils';
import { getQMImageURLFromPMID, queryAlbumCover, querySongInfoById } from '@/utils/api';

interface MetaResult {
  title: string;
  artist: string;
  album: string;
  imgUrl: string;
  blob: Blob;
}

/**
 *
 * @param musicBlob 音乐文件（解密后）
 * @param name 文件名
 * @param ext 原始后缀名
 * @param id 曲目 ID（<code>number</code>类型或纯数字组成的字符串）
 * @returns Promise
 */
export async function extractQQMusicMeta(
  musicBlob: Blob,
  name: string,
  ext: string,
  id?: number | string,
): Promise<MetaResult> {
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

  if (id) {
    try {
      return fetchMetadataFromSongId(id, ext, musicMeta, musicBlob);
    } catch (e) {
      console.warn('在线获取曲目信息失败，回退到本地 meta 提取', e);
    }
  }

  const info = GetMetaFromFile(name, musicMeta.common.title, musicMeta.common.artist);
  info.artist = info.artist || '';

  let imageURL = GetCoverFromFile(musicMeta);
  if (!imageURL) {
    imageURL = await getCoverImage(info.title, info.artist, musicMeta.common.album);
  }

  return {
    title: info.title,
    artist: info.artist || '',
    album: musicMeta.common.album || '',
    imgUrl: imageURL,
    blob: await writeMetaToAudioFile({
      title: info.title,
      artists: info.artist.split(' _ '),
      ext,
      imageURL,
      musicMeta,
      blob: musicBlob,
    }),
  };
}

async function fetchMetadataFromSongId(
  id: number | string,
  ext: string,
  musicMeta: IAudioMetadata,
  blob: Blob,
): Promise<MetaResult> {
  const info = await querySongInfoById(id);
  const imageURL = getQMImageURLFromPMID(info.track_info.album.pmid);
  const artists = info.track_info.singer.map((singer) => singer.name);

  return {
    title: info.track_info.title,
    artist: artists.join('、'),
    album: info.track_info.album.name,
    imgUrl: imageURL,

    blob: await writeMetaToAudioFile({
      title: info.track_info.title,
      artists,
      ext,
      imageURL,
      musicMeta,
      blob,
    }),
  };
}

async function getCoverImage(title: string, artist?: string, album?: string): Promise<string> {
  try {
    const data = await queryAlbumCover(title, artist, album);
    return getQMImageURLFromPMID(data.Id, data.Type);
  } catch (e) {
    console.warn(e);
  }
  return '';
}

interface NewAudioMeta {
  title: string;
  artists: string[];
  ext: string;

  musicMeta: IAudioMetadata;

  blob: Blob;
  imageURL: string;
}

async function writeMetaToAudioFile(info: NewAudioMeta): Promise<Blob> {
  try {
    const imageInfo = await GetImageFromURL(info.imageURL);
    if (!imageInfo) {
      console.warn('获取图像失败');
    }
    const newMeta = { picture: imageInfo?.buffer, title: info.title, artists: info.artists };
    const buffer = Buffer.from(await info.blob.arrayBuffer());
    const mime = AudioMimeType[info.ext] || AudioMimeType.mp3;
    if (info.ext === 'mp3') {
      return new Blob([WriteMetaToMp3(buffer, newMeta, info.musicMeta)], { type: mime });
    } else if (info.ext === 'flac') {
      return new Blob([WriteMetaToFlac(buffer, newMeta, info.musicMeta)], { type: mime });
    } else {
      console.info('writing metadata for ' + info.ext + ' is not being supported for now');
    }
  } catch (e) {
    console.warn('Error while appending cover image to file ' + e);
  }
  return info.blob;
}
