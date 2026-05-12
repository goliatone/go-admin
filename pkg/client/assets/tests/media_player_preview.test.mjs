import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function loadJSDOM() {
  try {
    return await import('jsdom');
  } catch (error) {
    return await import('../../../../../go-formgen/client/node_modules/jsdom/lib/api.js');
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_MEDIA_PATH = resolve(__dirname, '../dist/media/index.js');
const { JSDOM } = await loadJSDOM();
const { buildMediaPreview, inferMediaFamily, initMediaPages, mediaTypeFilterParam } = await import(pathToFileURL(DIST_MEDIA_PATH).href);

function setGlobals(win) {
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.Element = win.Element;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Event = win.Event;
}

function setupDOM() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  setGlobals(dom.window);
  return dom;
}

function media(overrides = {}) {
  return {
    id: 'media_1',
    name: 'Fixture media',
    url: '/uploads/media/fixture.bin',
    thumbnail: '',
    type: 'asset',
    mime_type: 'application/octet-stream',
    size: 1024,
    status: 'ready',
    created_at: '2026-05-06T12:00:00Z',
    metadata: {},
    ...overrides,
  };
}

function renderPreview(item, mode = 'detail') {
  setupDOM();
  return buildMediaPreview(item, mode);
}

test('inferMediaFamily keeps explicit preview types authoritative', () => {
  assert.equal(inferMediaFamily('image', 'application/octet-stream'), 'image');
  assert.equal(inferMediaFamily('vector', 'image/png'), 'vector');
  assert.equal(inferMediaFamily('video', 'application/octet-stream'), 'video');
  assert.equal(inferMediaFamily('audio', 'application/octet-stream'), 'audio');
});

test('inferMediaFamily upgrades empty and generic types from playable MIME values', () => {
  assert.equal(inferMediaFamily('', 'video/mp4'), 'video');
  assert.equal(inferMediaFamily('binary', 'audio/mpeg'), 'audio');
  assert.equal(inferMediaFamily('file', 'image/svg+xml'), 'vector');
  assert.equal(inferMediaFamily('document', 'audio/mpeg; charset=utf-8'), 'audio');
});

test('inferMediaFamily keeps non-playable assets on fallback families', () => {
  assert.equal(inferMediaFamily('document', 'application/pdf'), 'document');
  assert.equal(inferMediaFamily('text', 'text/plain'), 'text');
  assert.equal(inferMediaFamily('asset', 'application/octet-stream'), 'asset');
  assert.equal(inferMediaFamily('unknown', ''), 'asset');
});

test('detail image preview renders an image element', () => {
  const preview = renderPreview(media({
    name: 'Hero image',
    url: '/uploads/media/hero.png',
    type: 'image',
    mime_type: 'image/png',
  }));

  const image = preview.querySelector('img');
  assert.ok(image, 'expected image detail preview');
  assert.equal(image.getAttribute('src'), '/uploads/media/hero.png');
  assert.equal(image.getAttribute('alt'), 'Hero image');
});

test('detail video preview renders a native video player', () => {
  const preview = renderPreview(media({
    name: 'Demo video',
    url: '/uploads/media/demo.mp4',
    thumbnail: '/uploads/media/demo-poster.jpg',
    type: 'video',
    mime_type: 'video/mp4',
  }));

  const video = preview.querySelector('video');
  assert.ok(video, 'expected video detail preview');
  assert.equal(video.getAttribute('src'), '/uploads/media/demo.mp4');
  assert.equal(video.controls, true);
  assert.equal(video.preload, 'metadata');
  assert.match(video.poster, /\/uploads\/media\/demo-poster\.jpg$/);
  assert.equal(video.playsInline, true);
});

test('detail video preview prefers delivery stream and poster URLs', () => {
  const preview = renderPreview(media({
    name: 'Delivered video',
    url: 'https://provider.example/raw/video.mp4',
    asset_url: '/admin/api/media/delivery/video-1/asset',
    stream_url: '/admin/api/media/delivery/video-1/stream',
    poster_url: '/admin/api/media/delivery/video-1/poster',
    thumbnail: 'https://provider.example/raw/poster.jpg',
    type: 'video',
    mime_type: 'video/mp4',
  }));

  const video = preview.querySelector('video');
  assert.ok(video, 'expected video detail preview');
  assert.equal(video.getAttribute('src'), '/admin/api/media/delivery/video-1/stream');
  assert.match(video.poster, /\/admin\/api\/media\/delivery\/video-1\/poster$/);
});

test('detail image preview prefers delivery asset URLs over provider URLs', () => {
  const preview = renderPreview(media({
    name: 'Delivered image',
    url: 'https://provider.example/raw/image.png',
    asset_url: '/admin/api/media/delivery/image-1/asset',
    type: 'image',
    mime_type: 'image/png',
  }));

  const image = preview.querySelector('img');
  assert.ok(image, 'expected image preview');
  assert.equal(image.getAttribute('src'), '/admin/api/media/delivery/image-1/asset');
});

test('detail video preview renders native video for MIME-only video items', () => {
  const preview = renderPreview(media({
    name: 'MIME-only video',
    url: '/uploads/media/mime-only.mp4',
    type: '',
    mime_type: 'video/mp4',
  }));

  const video = preview.querySelector('video');
  assert.ok(video, 'expected MIME-only video item to render video controls in detail');
  assert.equal(video.controls, true);
  assert.equal(video.preload, 'metadata');
});

test('detail audio preview renders native audio for explicit audio type', () => {
  const preview = renderPreview(media({
    name: 'Theme audio',
    url: '/uploads/media/theme.mp3',
    type: 'audio',
    mime_type: 'audio/mpeg',
  }));

  const audio = preview.querySelector('audio');
  assert.ok(audio, 'expected audio detail preview');
  assert.equal(audio.getAttribute('src'), '/uploads/media/theme.mp3');
  assert.equal(audio.controls, true);
  assert.equal(audio.preload, 'metadata');
});

test('detail audio preview renders native audio for generic type with audio MIME', () => {
  const preview = renderPreview(media({
    name: 'Imported audio',
    url: '/uploads/media/imported.mp3',
    type: 'binary',
    mime_type: 'audio/mpeg',
  }));

  assert.ok(preview.querySelector('audio'), 'expected generic audio MIME to render audio controls in detail');
});

test('URL-less audio and video items render fallback previews', () => {
  const videoPreview = renderPreview(media({
    name: 'Missing video URL',
    url: '',
    type: 'video',
    mime_type: 'video/mp4',
  }));
  const audioPreview = renderPreview(media({
    name: 'Missing audio URL',
    url: '',
    type: 'audio',
    mime_type: 'audio/mpeg',
  }));

  assert.equal(videoPreview.querySelector('video'), null);
  assert.equal(audioPreview.querySelector('audio'), null);
  assert.ok(videoPreview.querySelector('.iconoir-video-camera'), 'expected video fallback icon');
  assert.ok(audioPreview.querySelector('.iconoir-music-note'), 'expected audio fallback icon');
});

test('media element failures stay contained around detail actions', () => {
  const dom = setupDOM();
  const shell = dom.window.document.createElement('div');
  const preview = buildMediaPreview(media({
    name: 'Remote video',
    url: '/uploads/media/remote.mp4',
    type: 'video',
    mime_type: 'video/mp4',
  }), 'detail');
  const action = dom.window.document.createElement('button');
  action.dataset.mediaCopyUrl = 'true';
  action.textContent = 'Copy URL';
  shell.appendChild(preview);
  shell.appendChild(action);
  dom.window.document.body.appendChild(shell);

  const video = preview.querySelector('video');
  assert.ok(video, 'expected video detail preview');
  video.dispatchEvent(new dom.window.Event('error', { bubbles: true }));

  assert.equal(shell.contains(action), true);
  assert.equal(preview.querySelector('video'), video);
});

test('grid and list previews do not instantiate active media controls', () => {
  const audioCard = renderPreview(media({
    name: 'Audio card',
    url: '/uploads/media/audio.mp3',
    type: 'audio',
    mime_type: 'audio/mpeg',
  }), 'card');
  const audioList = renderPreview(media({
    name: 'Audio row',
    url: '/uploads/media/audio.mp3',
    type: 'binary',
    mime_type: 'audio/mpeg',
  }), 'list');
  const videoCard = renderPreview(media({
    name: 'Video card',
    url: '/uploads/media/video.mp4',
    thumbnail: '/uploads/media/video.jpg',
    type: 'video',
    mime_type: 'video/mp4',
  }), 'card');
  const videoList = renderPreview(media({
    name: 'Video row',
    url: '/uploads/media/video.mp4',
    type: 'video',
    mime_type: 'video/mp4',
  }), 'list');

  for (const preview of [audioCard, audioList, videoCard, videoList]) {
    assert.equal(preview.querySelector('audio'), null);
    assert.equal(preview.querySelector('video'), null);
  }
  assert.ok(videoCard.querySelector('img'), 'expected video card to use thumbnail image');
  assert.ok(videoList.querySelector('.iconoir-video-camera'), 'expected video list without thumbnail to use fallback icon');
});

test('video previews ignore thumbnails copied from the playable media URL', () => {
  const copiedURL = '/uploads/media/video.mp4';
  const card = renderPreview(media({
    name: 'Copied thumbnail video',
    url: copiedURL,
    thumbnail: copiedURL,
    type: 'video',
    mime_type: 'video/mp4',
  }), 'card');
  const detail = renderPreview(media({
    name: 'Copied thumbnail video',
    url: copiedURL,
    thumbnail: copiedURL,
    type: 'video',
    mime_type: 'video/mp4',
  }), 'detail');

  assert.equal(card.querySelector('img'), null);
  assert.ok(card.querySelector('.iconoir-video-camera'), 'expected copied video URL thumbnail to use fallback icon');
  const video = detail.querySelector('video');
  assert.ok(video, 'expected playable detail video');
  assert.equal(video.getAttribute('poster'), null);
});

test('video previews keep distinct poster thumbnails and images can still use their URL directly', () => {
  const videoCard = renderPreview(media({
    name: 'Poster video',
    url: '/uploads/media/video.mp4',
    thumbnail: '/uploads/media/video-poster.jpg',
    type: 'video',
    mime_type: 'video/mp4',
  }), 'card');
  const imageCard = renderPreview(media({
    name: 'Image direct preview',
    url: '/uploads/media/image.png',
    thumbnail: '/uploads/media/image.png',
    type: 'image',
    mime_type: 'image/png',
  }), 'card');

  assert.equal(videoCard.querySelector('img')?.getAttribute('src'), '/uploads/media/video-poster.jpg');
  assert.equal(imageCard.querySelector('img')?.getAttribute('src'), '/uploads/media/image.png');
});

test('media page delivery templates do not synthesize posters for videos without real poster assets', async () => {
  const dom = setupDOM();
  dom.window.document.body.innerHTML = `
    <div
      data-media-page-root
      data-media-view="grid"
      data-media-library-path="/admin/api/media/assets"
      data-media-asset-url-template="/admin/api/media/delivery/:id/asset"
      data-media-stream-url-template="/admin/api/media/delivery/:id/stream"
      data-media-poster-url-template="/admin/api/media/delivery/:id/poster"
      data-media-download-url-template="/admin/api/media/delivery/:id/download"
    >
      <input data-media-search>
      <select data-media-type-filter></select>
      <select data-media-status-filter></select>
      <select data-media-sort></select>
      <div data-media-grid></div>
      <div data-media-detail-empty></div>
      <div data-media-detail>
        <div data-media-detail-preview></div>
        <h3 data-media-detail-name></h3>
        <p data-media-detail-url></p>
        <p data-media-detail-type></p>
        <p data-media-detail-status-label></p>
        <p data-media-detail-size></p>
        <p data-media-detail-date></p>
        <form data-media-detail-form>
          <input id="media-alt-text">
          <textarea id="media-caption"></textarea>
          <input id="media-tags">
          <button data-media-save-button></button>
        </form>
        <button data-media-copy-url></button>
        <button data-media-delete></button>
        <div data-media-detail-error></div>
        <div data-media-detail-feedback></div>
      </div>
      <div data-media-footer></div>
      <button data-media-load-more></button>
      <div data-media-count-label></div>
      <div data-media-loading></div>
      <div data-media-empty></div>
      <div data-media-no-results></div>
      <div data-media-error></div>
      <div data-media-status></div>
    </div>
  `;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/admin\/api\/media\/assets\?/);
    return new Response(JSON.stringify({
      items: [
        {
          id: 'drive-video-1',
          name: 'Drive video',
          url: 'https://drive.google.com/file/d/file-id/view',
          type: 'video',
          mime_type: 'video/mp4',
          delivery: { capabilities: ['stream', 'download', 'auth_required'] },
        },
        {
          id: 'image-1',
          name: 'Image asset',
          url: 'https://provider.example/image.jpg',
          type: 'image',
          mime_type: 'image/jpeg',
          delivery: { capabilities: ['poster', 'download'] },
        },
      ],
      total: 2,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await initMediaPages();
  } finally {
    globalThis.fetch = originalFetch;
  }

  const imageSources = Array.from(dom.window.document.querySelectorAll('img')).map((image) => image.getAttribute('src'));
  assert.ok(imageSources.includes('/admin/api/media/delivery/image-1/poster'), 'expected image item to keep poster template preview');
  assert.equal(imageSources.includes('/admin/api/media/delivery/drive-video-1/poster'), false);
  assert.ok(dom.window.document.querySelector('.iconoir-video-camera'), 'expected video without poster to render fallback preview');
  const detailVideo = dom.window.document.querySelector('[data-media-detail-preview] video');
  assert.ok(detailVideo, 'expected active Drive video to render the stream preview');
  assert.equal(detailVideo.getAttribute('src'), '/admin/api/media/delivery/drive-video-1/stream');
  assert.equal(detailVideo.getAttribute('poster'), null);
});

test('media type filter parameters use MIME family for preview-family filters', () => {
  assert.deepEqual(mediaTypeFilterParam('image'), { key: 'mime_family', value: 'image' });
  assert.deepEqual(mediaTypeFilterParam('vector'), { key: 'mime_family', value: 'vector' });
  assert.deepEqual(mediaTypeFilterParam('video'), { key: 'mime_family', value: 'video' });
  assert.deepEqual(mediaTypeFilterParam('audio'), { key: 'mime_family', value: 'audio' });
  assert.deepEqual(mediaTypeFilterParam('document'), { key: 'type', value: 'document' });
  assert.equal(mediaTypeFilterParam(''), null);
});
