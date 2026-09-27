// Browser-level verification for nobsdl-download-button.user.js.
// All pages and destinations are fulfilled in-process; no public site or
// NoBsDL extraction endpoint is contacted.
// Run: npm run test:browser
'use strict';

const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const ROOT = path.join(__dirname, '..');
const SCRIPT = fs.readFileSync(path.join(ROOT, 'nobsdl-download-button.user.js'), 'utf8');
let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log('[PASS] ' + name);
    passed += 1;
  } else {
    console.log('[FAIL] ' + name + (detail === undefined ? '' : '  (' + JSON.stringify(detail) + ')'));
    failed += 1;
  }
}

async function widgetState(page) {
  return page.evaluate(() => {
    const host = document.getElementById('nobsdl-download-widget');
    if (!host || !host.shadowRoot) return null;
    const dock = host.shadowRoot.querySelector('.dock');
    const links = Array.from(host.shadowRoot.querySelectorAll('a')).map((a) => ({
      text: a.textContent,
      href: a.href,
      rel: a.rel,
      referrerPolicy: a.referrerPolicy,
      height: a.getBoundingClientRect().height,
    }));
    const rect = dock.getBoundingClientRect();
    return {
      platform: host.getAttribute('data-platform'),
      label: dock.getAttribute('aria-label'),
      links,
      rect: {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom},
      viewport: {width: innerWidth, height: innerHeight},
    };
  });
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const outbound = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'nobsdl.com') {
      outbound.push({url: request.url(), headers: request.headers()});
      return route.fulfill({contentType: 'text/html', body: '<!doctype html><title>NoBsDL target</title>'});
    }
    if (request.isNavigationRequest()) {
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main>Mock media page</main></body></html>',
      });
    }
    return route.abort();
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const requestsBefore = outbound.length;
  await page.addScriptTag({content: SCRIPT});
  await page.waitForTimeout(100);

  let state = await widgetState(page);
  check('widget mounts inside an open shadow root on a YouTube video', !!state && state.platform === 'youtube', state);
  check('video page exposes exactly MP4 and MP3 actions', state && state.links.map((link) => link.text).join(',') === 'MP4,MP3', state && state.links);
  check('actions target the two intent-specific YouTube routes', state &&
    new URL(state.links[0].href).pathname === '/youtube-downloader' &&
    new URL(state.links[1].href).pathname === '/youtube-to-mp3', state && state.links);
  check('every action uses noopener+noreferrer and no-referrer', state && state.links.every((link) =>
    link.rel === 'noopener noreferrer' && link.referrerPolicy === 'no-referrer'), state && state.links);
  check('userscript makes no background request before an action', outbound.length === requestsBefore, outbound);
  check('mobile widget remains inside the viewport', state && state.rect.left >= 0 && state.rect.right <= state.viewport.width && state.rect.bottom <= state.viewport.height, state);
  check('mobile actions meet the 44px touch-target floor', state && state.links.every((link) => link.height >= 44), state && state.links);

  const popupPromise = page.waitForEvent('popup');
  await page.locator('#nobsdl-download-widget .action-mp4').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  const opened = new URL(popup.url());
  check('MP4 click opens the expected NoBsDL route', opened.origin === 'https://nobsdl.com' && opened.pathname === '/youtube-downloader', opened.href);
  check('MP4 click passes the exact current media URL through ?url=', opened.searchParams.get('url') === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', opened.searchParams.get('url'));
  check('navigation sends no Referer header', outbound.length === 1 && !outbound[0].headers.referer, outbound);
  await popup.close();

  await page.evaluate(() => history.pushState({}, '', '/@creator'));
  await page.waitForTimeout(850);
  check('SPA navigation to a non-media page removes the widget', (await widgetState(page)) === null);

  await page.evaluate(() => history.pushState({}, '', '/watch?v=abc123'));
  await page.waitForTimeout(850);
  check('SPA navigation back to a media page restores the widget', !!(await widgetState(page)));

  await page.evaluate(() => document.getElementById('nobsdl-download-widget').remove());
  check('test page removed the widget', (await widgetState(page)) === null);
  await page.waitForTimeout(850);
  check('same-URL site rerender cannot permanently remove the widget', !!(await widgetState(page)));

  const soundcloud = await context.newPage();
  await soundcloud.goto('https://soundcloud.com/artist/track');
  await soundcloud.addScriptTag({content: SCRIPT});
  const soundcloudState = await widgetState(soundcloud);
  check('SoundCloud exposes MP3 only', soundcloudState && soundcloudState.links.length === 1 && soundcloudState.links[0].text === 'MP3', soundcloudState);
  check('SoundCloud action uses the audio-only route without ?prefer=', soundcloudState &&
    new URL(soundcloudState.links[0].href).pathname === '/soundcloud-to-mp3' &&
    !new URL(soundcloudState.links[0].href).searchParams.has('prefer'), soundcloudState && soundcloudState.links);

  check('browser run produced no console errors', consoleErrors.length === 0, consoleErrors);
  await soundcloud.close();
  await page.close();
  await context.close();
  await browser.close();

  console.log('------------------------------------------------------------');
  console.log(passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('[FAIL] unhandled browser-test error', error);
  process.exit(1);
});
