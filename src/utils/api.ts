export const IXAREA_API_ENDPOINT = 'https://um-api.ixarea.com';

export interface UpdateInfo {
  Found: boolean;
  HttpsFound: boolean;
  Version: string;
  URL: string;
  Detail: string;
}

export async function checkUpdate(version: string): Promise<UpdateInfo> {
  const resp = await fetch(IXAREA_API_ENDPOINT + '/music/app-version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Version: version }),
  });
  return await resp.json();
}

export interface CoverInfo {
  Id: string;
  Type: number;
}

export async function queryAlbumCover(title: string, artist?: string, album?: string): Promise<CoverInfo> {
  const endpoint = IXAREA_API_ENDPOINT + '/music/qq-cover';
  const params = new URLSearchParams([
    ['Title', title],
    ['Artist', artist ?? ''],
    ['Album', album ?? ''],
  ]);
  const resp = await fetch(`${endpoint}?${params.toString()}`);
  return await resp.json();
}
