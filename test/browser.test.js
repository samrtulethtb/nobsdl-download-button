// Browser-level verification for nobsdl-download-button.user.js (v2,
// in-page downloads). Every page and every NoBsDL API answer is fulfilled
// in-process; no public site or NoBsDL endpoint is contacted. GM_xmlhttpRequest
// is provided by a small test polyfill on top of the intercepted network.
//
// Run (Playwright for Node installed anywhere outside the repo, e.g. a scratch dir):
//   npm install && CHROME_BIN=/path/to/chrome npm run test:browser
'use strict';

const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const ROOT = path.join(__dirname, '..');
const SCRIPT = fs.readFileSync(path.join(ROOT, 'nobsdl-download-button.user.js'), 'utf8');
const MB = 1024 * 1024;
let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) { console.log('[PASS] ' + name); passed += 1; }
  else { console.log('[FAIL] ' + name + (detail === undefined ? '' : '  (' + JSON.stringify(detail) + ')')); failed += 1; }
}

// Minimal GM_xmlhttpRequest on top of fetch (the userscript itself never calls fetch).
const GM_POLYFILL = `
  window.GM_xmlhttpRequest = function (opts) {
    fetch(opts.url, {method: opts.method || 'GET', headers: opts.headers || {}})
      .then(async (r) => opts.onload({status: r.status, responseText: await r.text()}))
      .catch(() => opts.onerror && opts.onerror({}));
  };
  window.__gmStore = {};
  window.GM_getValue = (k, d) => (k in window.__gmStore ? window.__gmStore[k] : d);
  window.GM_setValue = (k, v) => { window.__gmStore[k] = v; };
`;

const MOCK_PAGE = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main>Mock media page</main></body></html>';

function json(route, body, status) {
  return route.fulfill({status: status || 200, contentType: 'application/json', body: JSON.stringify(body)});
}

function shadow(page, selector) {
  return page.locator('#nobsdl-download-widget').locator(selector);
}

async function setup(browser, {viewport, gm = true, api}) {
  const context = await browser.newContext({viewport: viewport || {width: 1280, height: 800}, acceptDownloads: true});
  const calls = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'nobsdl.com' || url.hostname === 'dl.nobsdl.com') {
      calls.push(url.pathname + url.search);
      return api(route, url, calls);
    }
    if (request.isNavigationRequest()) return route.fulfill({contentType: 'text/html', body: MOCK_PAGE});
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  return {context, page, calls, errors, gm};
}

async function inject(page, gm) {
  if (gm) await page.addScriptTag({content: GM_POLYFILL});
  await page.addScriptTag({content: SCRIPT});
  await page.waitForTimeout(150);
}

const VIDEO_INFO = {
  title: 'Fixture <b>title</b>', duration: 212, is_supporter: false,
  youtube_video_choices: {
    free: [{choice_id: 'yt:135:140', height: 480, size_mb: 26.9, tier: 'free'}, {choice_id: 'yt:299:140', height: 1080, size_mb: 214.5, tier: 'free', fps: 60}],
    supporter: [{choice_id: 'yt:401:251', height: 2160, size_mb: 900, tier: 'supporter'}],
  },
  youtube_mp3_choices: [{choice_id: 'yt3:128', bitrate_kbps: 128, size_mb: 3.3, tier: 'free'}],
};

function happyApi(script) {
  const polls = script || [
    {status: 'processing', phase: 'queued'},
    {status: 'processing', phase: 'connecting'},
    {status: 'processing', phase: 'downloading', progress: {downloaded_bytes: 50 * MB, total_bytes: 200 * MB, fraction: 0.25, speed_bps: 5 * MB, eta_seconds: 30}},
    {status: 'processing', phase: 'merging', progress: {fraction: 1}},
    {status: 'ready', direct_url: '/api/free-download/file/fixturejob1'},
  ];
  let poll = 0;
  return (route, url) => {
    if (url.pathname === '/api/video-info') return json(route, VIDEO_INFO);
    if (url.pathname === '/download') return json(route, {ok: true, status: 'processing', status_url: '/api/free-download/status/fixturejob1'});
    if (url.pathname === '/api/free-download/status/fixturejob1') return json(route, polls[Math.min(poll++, polls.length - 1)]);
    // Production answers with a 302 to dl.nobsdl.com/d/<token>; Playwright
    // cannot follow a fulfilled redirect on a navigation, so the attachment is
    // served here directly. The real redirect is covered by the live E2E check.
    if (url.pathname === '/api/free-download/file/fixturejob1') {
      return route.fulfill({status: 200, headers: {'Content-Type': 'video/mp4', 'Content-Disposition': 'attachment; filename="fixture.mp4"'}, body: 'mp4-bytes'});
    }
    return route.fulfill({contentType: 'text/html', body: '<h1>NoBsDL page</h1>'});
  };
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', args: ['--no-sandbox']});

  // 1. Full in-page flow on a YouTube video.
  {
    const {context, page, calls, errors} = await setup(browser, {api: happyApi()});
    await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await inject(page, true);
    check('nothing is requested before the user opens the panel', calls.length === 0, calls);
    check('dock offers one in-page Download button', (await shadow(page, '.dock .btn-primary').textContent()) === 'Download');

    await shadow(page, '.dock .btn-primary').click();
    await shadow(page, '.card').first().waitFor();
    check('opening lists formats via /api/video-info only', calls.length === 1 && calls[0].startsWith('/api/video-info?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&intent=mp4'), calls);
    check('untrusted title is rendered as text, never markup', (await shadow(page, '.title').textContent()) === 'Fixture <b>title</b>' && (await shadow(page, '.title b').count()) === 0);
    const cards = await shadow(page, '.card').evaluateAll((els) => els.map((e) => [e.querySelector('.q').textContent, e.classList.contains('locked')]));
    check('real choices with the Supporter one locked', JSON.stringify(cards) === JSON.stringify([['480p', false], ['1080p', false], ['2160p', true], ['128 kbps', false]]), cards);
    check('locked choice is explained honestly', (await shadow(page, '.note').textContent()).includes('Locked qualities need a paid'));

    const popupPromise = context.waitForEvent('page');
    await shadow(page, '.card.locked').click();
    const popup = await popupPromise;
    check('a locked choice opens the Supporter page and starts no job', popup.url() === 'https://nobsdl.com/supporter' && !calls.some((c) => c.startsWith('/download')), {url: popup.url(), calls});
    await popup.close();

    const downloadPromise = page.waitForEvent('download');
    await shadow(page, '.card:not(.locked)').nth(1).click();
    await page.waitForFunction(() => {
      const t = document.getElementById('nobsdl-download-widget').shadowRoot.querySelector('.status-line');
      return t && t.textContent.startsWith('25%');
    });
    check('measured download progress is shown', (await shadow(page, '.status-line').textContent()) === '25% · 50.0 MB of 200 MB · 5.0 MB/s · ~30s left');
    // Close mid-job: the job keeps going and the dock shows progress.
    await shadow(page, '.head .btn-icon').click();
    const download = await downloadPromise;
    check('the finished file is saved as a browser download', download.suggestedFilename() === 'fixture.mp4');
    check('the media page itself stays in place', page.url() === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', page.url());
    const job = calls.find((c) => c.startsWith('/download?'));
    check('job uses the exact chosen YouTube choice, async', /format=mp4&async=1&yt_choice=yt%3A299%3A140$/.test(job || ''), job);
    await page.waitForFunction(() => document.getElementById('nobsdl-download-widget').shadowRoot.querySelector('.dock .btn-primary').textContent === '✓ Saved');
    check('closing the panel did not cancel the download; dock shows it saved', true);
    await shadow(page, '.dock .btn-primary').click();
    check('reopening keeps the result view', (await shadow(page, '.result-ok').count()) === 1);
    check('finished bar is full and plain (no result-box styling)', await shadow(page, '.bar').evaluate((n) => n.className === 'bar done' && getComputedStyle(n).paddingTop === '0px'));
    check('no page errors', errors.length === 0, errors);
    await context.close();
  }

  // 2. Stale format: backend asks to choose again -> Refresh formats, no blind retry.
  {
    const api = (route, url) => {
      if (url.pathname === '/api/video-info') return json(route, VIDEO_INFO);
      if (url.pathname === '/download') return json(route, {error: 'format_unavailable', detail: 'This exact format is not available anymore. Please choose another quality.', suggested_action: 'choose_another_quality', supporter_cta: false}, 409);
      return route.fulfill({status: 404, body: ''});
    };
    const {context, page, calls} = await setup(browser, {api});
    await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await inject(page, true);
    await shadow(page, '.dock .btn-primary').click();
    await shadow(page, '.card').first().click();
    await shadow(page, '.error').waitFor();
    check('backend error message is shown', (await shadow(page, '.error').textContent()).includes('not available anymore'));
    check('stale format offers Refresh formats', (await shadow(page, '.row .btn-primary').textContent()) === 'Refresh formats');
    check('no Supporter CTA when the backend says supporter_cta=false', (await shadow(page, 'a[href="https://nobsdl.com/supporter"]').count()) === 0);
    await shadow(page, '.row .btn-primary').click();
    await shadow(page, '.card').first().waitFor();
    check('refresh re-reads formats instead of resubmitting the same job', calls.filter((c) => c.startsWith('/api/video-info')).length === 2 && calls.filter((c) => c.startsWith('/download')).length === 1, calls);
    await context.close();
  }

  // 3. No GM transport -> v1 behaviour: plain MP4/MP3 links, no requests.
  {
    const {context, page, calls} = await setup(browser, {api: happyApi()});
    await page.goto('https://www.tiktok.com/@user/video/123456789');
    await inject(page, false);
    const links = await shadow(page, 'a.action').evaluateAll((els) => els.map((a) => [a.textContent, a.href, a.rel]));
    check('fallback shows MP4/MP3 links to the intent-specific page', links.length === 2 && links[0][1].startsWith('https://nobsdl.com/tiktok-downloader?url=') && links[1][1].endsWith('prefer=mp3') && links.every((l) => l[2] === 'noopener noreferrer'), links);
    check('fallback makes no network requests', calls.length === 0, calls);
    await context.close();
  }

  // 4. Playlist keeps the separate playlist workflow link.
  {
    const {context, page} = await setup(browser, {api: happyApi()});
    await page.goto('https://www.youtube.com/playlist?list=PL1234567890AB');
    await inject(page, true);
    const links = await shadow(page, 'a.action').evaluateAll((els) => els.map((a) => a.textContent));
    check('playlist shows Open playlist, not an in-page single download', JSON.stringify(links) === '["Open playlist"]', links);
    await context.close();
  }

  // 5. Mobile: dock and panel stay inside the viewport; minimize is remembered.
  {
    const {context, page} = await setup(browser, {viewport: {width: 360, height: 740}, api: happyApi()});
    await page.goto('https://www.instagram.com/reel/ABC_123/');
    await inject(page, true);
    await shadow(page, '.dock .btn-primary').click();
    await shadow(page, '.card').first().waitFor();
    const fits = await page.evaluate(() => {
      const root = document.getElementById('nobsdl-download-widget').shadowRoot;
      return [root.querySelector('.dock'), root.querySelector('.panel')].every((node) => {
        const r = node.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      }) && document.documentElement.scrollWidth <= innerWidth + 1;
    });
    check('dock and panel fit a 360px phone without horizontal scroll', fits);
    await page.keyboard.press('Escape');
    check('Escape closes the panel', await shadow(page, '.panel').evaluate((n) => n.hidden));
    await shadow(page, '.dock button[aria-label="Minimize the NoBsDL button"]').click();
    check('minimize collapses to a small round button and is stored', (await shadow(page, '.collapsed-pill').count()) === 1 && await page.evaluate(() => window.__gmStore.collapsed === true));
    await context.close();
  }

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((error) => { console.error(error); process.exit(1); });
