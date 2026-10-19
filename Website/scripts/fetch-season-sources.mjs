/** Download the owner's selected free Blendkit source scenes, outside public/. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../Assets and working files/seasons/', import.meta.url));
const scenes = {
  spring: 'a14302f7-af57-42d2-a489-594cbcc51a6c',
  summer: '842ce837-9d3f-4b68-9049-45cd0ee92777',
  autumn: '0eacf36c-28e3-4ee9-8489-797c6df77d83',
  winter: 'aeab2470-9a94-45b1-a810-c1e213190dcf',
};
await fs.mkdir(path.join(root, 'sources'), { recursive: true });
const sceneUuid = randomUUID();
const results = await Promise.allSettled(Object.entries(scenes).map(async ([season, id]) => {
  const response = await fetch('https://www.blendkit.com/api/v1/search/?query=' + encodeURIComponent(`asset_base_id:${id} asset_type:scene`) + '&page_size=1');
  if (!response.ok) throw new Error(`${season}: search HTTP ${response.status}`);
  const asset = (await response.json()).results?.[0];
  if (!asset || asset.assetBaseId !== id || !asset.isFree || !asset.canDownload) throw new Error(`${season}: source is not freely downloadable`);
  const file = asset.files.find(f => f.fileType === (season === 'autumn' ? 'resolution_1K' : 'blend'));
  const metadata = { season, assetBaseId: id, versionId: asset.id, name: asset.displayName, description: asset.description, author: asset.author.displayName, license: asset.license, source: `https://www.blendkit.com/asset-gallery-detail/${id}/`, sourceAppVersion: asset.sourceAppVersion, fileBytes: file.fileUploadSize, parameters: asset.dictParameters };
  await fs.writeFile(path.join(root, `${season}-source.json`), JSON.stringify(metadata, null, 2) + '\n');
  const destination = path.join(root, 'sources', `${season}.blend`);
  const existing = await fs.stat(destination).catch(() => null);
  if (existing?.size === file.fileUploadSize) return { season, cached: true, bytes: existing.size };
  const endpoint = new URL(file.downloadUrl);
  endpoint.searchParams.set('scene_uuid', sceneUuid);
  const access = await fetch(endpoint);
  const info = await access.json();
  if (!access.ok || !info.filePath) throw new Error(`${season}: download access HTTP ${access.status}: ${info.detail || 'missing file'}`);
  // Bounded ranges avoid long, stalled CDN responses and can retry independently.
  const handle = await fs.open(destination + '.partial', 'w');
  const chunkSize = 4 * 1024 * 1024;
  let next = 0, complete = 0;
  try {
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < file.fileUploadSize) {
        const start = next; next += chunkSize;
        const end = Math.min(file.fileUploadSize - 1, start + chunkSize - 1);
        let bytes;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const download = await fetch(info.filePath, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(45000) });
            if (download.status !== 206) throw new Error(`range HTTP ${download.status}`);
            if (download.headers.get('content-range') !== `bytes ${start}-${end}/${file.fileUploadSize}`) throw new Error('wrong range');
            bytes = Buffer.from(await download.arrayBuffer());
            if (bytes.length !== end - start + 1) throw new Error('incomplete range');
            break;
          } catch (error) { if (attempt === 2) throw error; }
        }
        for (let written = 0; written < bytes.length;) {
          const result = await handle.write(bytes, written, bytes.length - written, start + written);
          if (!result.bytesWritten) throw new Error('source write stopped');
          written += result.bytesWritten;
        }
        complete += bytes.length;
        if (complete % (chunkSize * 16) === 0) console.log(season, Math.round(complete / file.fileUploadSize * 100) + '%');
      }
    }));
  } finally { await handle.close(); }
  const stat = await fs.stat(destination + '.partial');
  if (file.fileUploadSize && stat.size !== file.fileUploadSize) throw new Error(`${season}: incomplete source file`);
  await fs.rename(destination + '.partial', destination);
  return { season, bytes: stat.size };
}));
for (const [i, result] of results.entries()) console.log(Object.keys(scenes)[i], result.status === 'fulfilled' ? result.value : result.reason.message);
if (results.some(r => r.status === 'rejected')) process.exitCode = 1;
