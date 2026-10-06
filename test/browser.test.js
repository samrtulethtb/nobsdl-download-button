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

async function setup(browser, {viewport, gm = true, api, html, contextOptions}) {
  const context = await browser.newContext(Object.assign({viewport: viewport || {width: 1280, height: 800}, acceptDownloads: true}, contextOptions || {}));
  const calls = [];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'nobsdl.com' || url.hostname === 'dl.nobsdl.com') {
      calls.push(url.pathname + url.search);
      return api(route, url, calls);
    }
    if (request.isNavigationRequest()) return route.fulfill({contentType: 'text/html', body: html || MOCK_PAGE});
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

  // 5. Phone: round button, bottom sheet inside the viewport, Escape closes.
  {
    const {context, page} = await setup(browser, {viewport: {width: 360, height: 740}, api: happyApi(), contextOptions: {hasTouch: true, isMobile: true}});
    await page.goto('https://www.instagram.com/reel/ABC_123/');
    await inject(page, true);
    check('phone layout shows one round button', (await shadow(page, '.dock .fab').count()) === 1 && (await shadow(page, '.brand').count()) === 0);
    const fab = await shadow(page, '.fab').boundingBox();
    check('round button is a comfortable touch target above the bottom bars', fab.width >= 48 && fab.height >= 48 && 740 - (fab.y + fab.height) >= 90, fab);
    await shadow(page, '.fab').click();
    await shadow(page, '.card').first().waitFor();
    const sheet = await page.evaluate(() => {
      const root = document.getElementById('nobsdl-download-widget').shadowRoot;
      const r = root.querySelector('.panel').getBoundingClientRect();
      return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, scrim: !root.querySelector('.scrim').hidden,
        fabHidden: getComputedStyle(root.querySelector('.dock')).display === 'none', overflow: document.documentElement.scrollWidth > innerWidth + 1};
    });
    check('panel is a full-width bottom sheet inside the viewport', sheet.left === 0 && sheet.right === 360 && Math.round(sheet.bottom) === 740 && sheet.top >= 0 && !sheet.overflow, sheet);
    check('sheet has a backdrop and the round button does not cover it', sheet.scrim && sheet.fabHidden, sheet);
    await page.keyboard.press('Escape');
    check('Escape closes the sheet', await shadow(page, '.panel').evaluate((n) => n.hidden));
    // Drag the button up and to the left: it moves, is remembered, and does not open the panel.
    const box = await shadow(page, '.fab').boundingBox();
    await page.mouse.move(box.x + 28, box.y + 28);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 28 - i * 25, box.y + 28 - i * 20);
    await page.mouse.up();
    const moved = await shadow(page, '.fab').boundingBox();
    const stored = await page.evaluate(() => window.__gmStore.dock && window.__gmStore.dock.compact);
    check('dragging moves the button to the other side and remembers it', moved.x < 60 && moved.y < box.y - 150 && stored && stored.side === 'left' && stored.bottom > 250, {moved, stored});
    check('a drag is not a tap: the panel stays closed', await shadow(page, '.panel').evaluate((n) => n.hidden));
    await context.close();
  }

  // 6. Desktop: minimize is remembered.
  {
    const {context, page} = await setup(browser, {api: happyApi()});
    await page.goto('https://www.instagram.com/reel/ABC_123/');
    await inject(page, true);
    await shadow(page, '.dock button[aria-label="Minimize the NoBsDL button"]').click();
    check('minimize collapses to a small round button and is stored', (await shadow(page, '.collapsed-pill').count()) === 1 && await page.evaluate(() => window.__gmStore.collapsed === true));
    await context.close();
  }

  // 7. TikTok For You feed (desktop): the URL never changes while scrolling.
  // The fixture copies the live structure seen on 2026-10-06: each clip is an
  // article with div#xgwrapper-<n>-<videoId> around the <video> and an
  // a[data-e2e=video-author-avatar] link, and no per-clip link at all.
  {
    const clip = (n, id, author) => `<article data-e2e="recommend-list-item-container" style="height:820px"><section data-e2e="feed-video"><div><div id="xgwrapper-0-${id}"><div><video style="display:block;width:460px;height:800px"></video></div></div></div></section>
      <a data-e2e="video-author-avatar" href="/@${author}">avatar</a></article>`;
    const html = `<!doctype html><html><body style="margin:0"><main>${clip(0, '7000000000000000001', 'alice')}${clip(1, '7000000000000000002', 'bob.b')}</main></body></html>`;
    const {context, page, calls} = await setup(browser, {api: happyApi(), html});
    await page.goto('https://www.tiktok.com/foryou');
    await inject(page, true);
    await page.waitForTimeout(900);
    check('feed with a clip on screen shows the button', await page.evaluate(() => document.getElementById('nobsdl-download-widget')?.dataset.workflow === 'feed'));
    check('scrolling a feed sends nothing', calls.length === 0, calls);
    await shadow(page, '.dock .btn-primary').click();
    await shadow(page, '.card').first().waitFor();
    check('click lists the clip on screen, built from its id and author', calls[0] === '/api/video-info?url=' + encodeURIComponent('https://www.tiktok.com/@alice/video/7000000000000000001') + '&intent=mp4', calls);
    check('the chosen clip is briefly outlined', await shadow(page, '.hl').evaluate((n) => n.classList.contains('on')));
    await shadow(page, '.head .btn-icon').click();
    await page.evaluate(() => window.scrollTo(0, 820));
    await shadow(page, '.dock .btn-primary').click();
    await page.waitForTimeout(400);
    check('after scrolling, the next clip is used', calls[calls.length - 1] === '/api/video-info?url=' + encodeURIComponent('https://www.tiktok.com/@bob.b/video/7000000000000000002') + '&intent=mp4', calls);
    await context.close();
  }

  // 8. TikTok mobile web hides the clip id from isolated userscripts: ask for the link.
  {
    const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div data-e2e="video-slide-active"><video style="display:block;width:360px;height:700px"></video><a href="/@carol">carol</a></div></body></html>';
    const {context, page, calls} = await setup(browser, {viewport: {width: 360, height: 740}, api: happyApi(), html, contextOptions: {hasTouch: true, isMobile: true}});
    await page.goto('https://www.tiktok.com/foryou');
    await inject(page, true);
    await page.waitForTimeout(900);
    await shadow(page, '.fab').click();
    check('unreadable clip asks for its link instead of guessing', (await shadow(page, '.paste input').count()) === 1 && calls.length === 0, calls);
    await shadow(page, '.paste input').fill('https://example.com/not-a-video');
    await shadow(page, '.paste .btn-primary').click();
    check('an unsupported link is refused with a message', (await shadow(page, '.hint[role=status]').textContent()).includes('isn’t a supported') && calls.length === 0);
    await shadow(page, '.paste input').fill('https://vm.tiktok.com/ZM6abc123/');
    await shadow(page, '.paste .btn-primary').click();
    await shadow(page, '.card').first().waitFor();
    check('a pasted link is listed like any other', calls[0] === '/api/video-info?url=' + encodeURIComponent('https://vm.tiktok.com/ZM6abc123/') + '&intent=mp4', calls);
    await context.close();
  }

  // 9. X timeline: permalink of the post around the video; ambiguous containers are never guessed.
  {
    const post = (id, extra) => `<article style="display:block;height:600px"><a href="/user${id}/status/${id}"><time>now</time></a><a href="/user${id}/status/${id}/analytics">stats</a>${extra || ''}<div><div><video style="display:block;width:500px;height:300px"></video></div></div></article>`;
    const html = `<!doctype html><html><body style="margin:0">${post('111')}<section><a href="/a/status/1">a</a><a href="/b/status/2">b</a><div><video style="display:block;width:500px;height:300px"></video></div></section><div style="height:900px"></div></body></html>`;
    const {context, page, calls} = await setup(browser, {api: happyApi(), html});
    await page.goto('https://x.com/home');
    await inject(page, true);
    await page.waitForTimeout(900);
    await shadow(page, '.dock .btn-primary').click();
    await page.waitForTimeout(400);
    check('X: the video\'s own post is used (duplicate links to it count once)', calls[0] === '/api/video-info?url=' + encodeURIComponent('https://x.com/user111/status/111') + '&intent=mp4', calls);
    await shadow(page, '.head .btn-icon').click();
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(3300);
    check('a video whose container links to two posts gets no button', await page.evaluate(() => !document.getElementById('nobsdl-download-widget')));
    await context.close();
  }

  // 10. Reddit: the player is a web component; the post's permalink attribute is used.
  {
    const html = '<!doctype html><html><body style="margin:0"><shreddit-post permalink="/r/videos/comments/abc123/a_title/"><shreddit-player style="display:block;width:640px;height:360px"></shreddit-player></shreddit-post></body></html>';
    const {context, page, calls} = await setup(browser, {api: happyApi(), html});
    await page.goto('https://www.reddit.com/r/videos/');
    await inject(page, true);
    await page.waitForTimeout(900);
    await shadow(page, '.dock .btn-primary').click();
    await page.waitForTimeout(400);
    check('Reddit: shreddit-post permalink is used', calls[0] === '/api/video-info?url=' + encodeURIComponent('https://www.reddit.com/r/videos/comments/abc123/a_title') + '&intent=mp4', calls);
    await context.close();
  }

  // 11. Phone: a running download shows real progress on the round button; keyboard works too.
  {
    const {context, page} = await setup(browser, {viewport: {width: 390, height: 664}, api: happyApi(), contextOptions: {hasTouch: true, isMobile: true}});
    await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await inject(page, true);
    await shadow(page, '.fab').focus();
    await page.keyboard.press('Enter');
    await shadow(page, '.card').first().waitFor();
    check('the round button also opens from the keyboard', !(await shadow(page, '.panel').evaluate((n) => n.hidden)));
    const downloadPromise = page.waitForEvent('download');
    await shadow(page, '.card:not(.locked)').nth(1).click();
    await shadow(page, '.head .btn-icon').click();
    await page.waitForFunction(() => document.getElementById('nobsdl-download-widget').shadowRoot.querySelector('.fab').textContent === '25%');
    check('closed sheet: the round button shows the measured percentage as a ring', await shadow(page, '.fab').evaluate((n) => n.classList.contains('ring') && n.style.getPropertyValue('--p') === '0.25'));
    await downloadPromise;
    await page.waitForFunction(() => document.getElementById('nobsdl-download-widget').shadowRoot.querySelector('.fab').textContent === '✓');
    check('finished download shows a check on the round button', true);
    await context.close();
  }

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main().catch((error) => { console.error(error); process.exit(1); });
