import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const SCRIPT = new URL("../nobsdl-download-button.user.js", import.meta.url);
const {pageFor, targetUrl} = require(SCRIPT.pathname);

const page = (href) => pageFor(new URL(href));
const target = (href, output) => {
  const matched = page(href);
  return matched && targetUrl(matched, href, output);
};

test("recognizes representative public media pages on every supported platform", () => {
  const cases = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "single"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "single"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube", "single"],
    ["https://www.youtube.com/shorts/BDejsh5TVWM", "youtube", "short"],
    ["https://www.youtube.com/playlist?list=PL1234567890AB", "youtube", "playlist"],
    ["https://www.youtube.com/watch?v=abc123&list=PL1234567890AB", "youtube", "playlist"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "youtube", "single"],
    ["https://www.tiktok.com/@user/video/123456789", "tiktok", "single"],
    ["https://vm.tiktok.com/ZM6abc123/", "tiktok", "single"],
    ["https://www.instagram.com/reel/ABC_123/", "instagram", "single"],
    ["https://www.instagram.com/p/ABC_123/", "instagram", "single"],
    ["https://www.facebook.com/watch/?v=123456", "facebook", "single"],
    ["https://www.facebook.com/user/videos/123456/", "facebook", "single"],
    ["https://www.facebook.com/reel/123456", "facebook", "single"],
    ["https://www.reddit.com/r/videos/comments/abc123/title/", "reddit", "single"],
    ["https://redd.it/abc123", "reddit", "single"],
    ["https://v.redd.it/abc123", "reddit", "single"],
    ["https://x.com/user/status/123456789", "twitter", "single"],
    ["https://mobile.twitter.com/user/status/123456789", "twitter", "single"],
    ["https://vimeo.com/123456789", "vimeo", "single"],
    ["https://player.vimeo.com/video/123456789", "vimeo", "single"],
    ["https://soundcloud.com/artist/track", "soundcloud", "single"],
    ["https://on.soundcloud.com/AbCdE", "soundcloud", "single"],
  ];
  for (const [href, platform, workflow] of cases) {
    assert.deepEqual([page(href)?.platform, page(href)?.workflow], [platform, workflow], href);
  }
});

test("does not appear on listings, profiles, unsupported content, or lookalike hosts", () => {
  for (const href of [
    "https://www.youtube.com/",
    "https://www.youtube.com/results?search_query=test",
    "https://www.youtube.com/@creator/videos",
    "https://www.tiktok.com/@creator",
    "https://www.instagram.com/creator/",
    "https://www.facebook.com/creator",
    "https://www.reddit.com/r/videos/",
    "https://www.reddit.com/gallery/abc123",
    "https://x.com/home",
    "https://x.com/user",
    "https://vimeo.com/watch",
    "https://soundcloud.com/artist",
    "https://soundcloud.com/artist/sets/album",
    "https://evil-youtube.com/watch?v=abc123",
    "https://youtube.com.attacker.example/watch?v=abc123",
    "https://nottiktok.com/@user/video/123",
  ]) assert.equal(page(href), null, href);
});

test("YouTube Mix and Radio remain single-video workflows", () => {
  for (const href of [
    "https://www.youtube.com/watch?v=abc123&list=RDabc123",
    "https://www.youtube.com/watch?v=abc123&list=RDabc123&start_radio=1",
    "https://www.youtube.com/watch?v=abc123&list=ULabc123",
  ]) assert.equal(page(href)?.workflow, "single", href);
});

test("routes each output to the current NoBsDL destination contract", () => {
  const youtube = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  assert.equal(new URL(target(youtube, "mp4")).pathname, "/youtube-downloader");
  assert.equal(new URL(target(youtube, "mp3")).pathname, "/youtube-to-mp3");
  assert.equal(new URL(target(youtube, "mp4")).searchParams.get("prefer"), null);

  const shorts = "https://www.youtube.com/shorts/BDejsh5TVWM";
  assert.equal(new URL(target(shorts, "mp3")).pathname, "/youtube-shorts-downloader");
  assert.equal(new URL(target(shorts, "mp3")).searchParams.get("prefer"), "mp3");

  const tiktok = "https://www.tiktok.com/@user/video/123456789";
  assert.equal(new URL(target(tiktok, "mp4")).pathname, "/tiktok-downloader");
  assert.equal(new URL(target(tiktok, "mp4")).searchParams.get("prefer"), "mp4");
  assert.equal(new URL(target(tiktok, "mp3")).searchParams.get("prefer"), "mp3");

  const soundcloud = "https://soundcloud.com/artist/track";
  assert.equal(new URL(target(soundcloud, "mp3")).pathname, "/soundcloud-to-mp3");
  assert.equal(new URL(target(soundcloud, "mp3")).searchParams.get("prefer"), null);
  assert.equal(target(soundcloud, "mp4"), null);
});

test("playlist links use the playlist workflow and canonical playlist URL", () => {
  const source = "https://www.youtube.com/watch?v=abc123&list=PL1234567890AB";
  const parsed = new URL(target(source, "playlist"));
  assert.equal(parsed.pathname, "/youtube-playlist-downloader");
  assert.equal(parsed.searchParams.get("prefer"), null);
  assert.equal(parsed.searchParams.get("url"), "https://www.youtube.com/playlist?list=PL1234567890AB");
});

test("all outgoing actions carry the source URL without inventing claims or tracking markers", () => {
  const source = "https://www.instagram.com/reel/ABC_123/?igshid=test";
  const parsed = new URL(target(source, "mp4"));
  assert.equal(parsed.origin, "https://nobsdl.com");
  assert.equal(parsed.searchParams.get("url"), source);
  assert.equal(parsed.searchParams.has("ref"), false);
  assert.equal(parsed.searchParams.has("utm_source"), false);
});

test("metadata grants exactly the in-page transport and talks only to nobsdl.com", () => {
  const source = readFileSync(SCRIPT, "utf8");
  const header = source.slice(0, source.indexOf("// ==/UserScript=="));
  const grants = [...header.matchAll(/^\/\/ @grant\s+(\S+)$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(grants, ["GM.xmlHttpRequest", "GM_getValue", "GM_setValue", "GM_xmlhttpRequest"]);
  assert.deepEqual([...header.matchAll(/^\/\/ @connect\s+(\S+)$/gm)].map((m) => m[1]), ["nobsdl.com"]);
  assert.match(header, /^\/\/ @noframes$/m);
  assert.match(header, /^\/\/ @version\s+2\.0\.0$/m);
  // Paid Supporter formats are disclosed as Greasy Fork requires.
  assert.match(header, /^\/\/ @antifeature\s+payment\s+\S/m);
  // Page-side network APIs are never used directly; only the GM transport.
  assert.doesNotMatch(source, /new XMLHttpRequest|\bfetch\s*\(|navigator\.sendBeacon/);
  assert.match(source, /url: NOBSDL_ORIGIN \+ path/);
  assert.match(source, /rel: "noopener noreferrer"/);
  assert.match(source, /referrerPolicy = "no-referrer"/);
  // DOM is built with textContent/attributes only (Trusted Types safe).
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
});

test("listing copy makes no unverified or forbidden claims", () => {
  const source = readFileSync(SCRIPT, "utf8");
  assert.doesNotMatch(source, /\bno ads\b|ad-free|without ads/i);
  assert.doesNotMatch(source, /no watermark|watermark-free|without watermark/i);
  assert.doesNotMatch(source, /free 4K|4K free|unlimited/i);
  for (const locale of ["ro", "es", "pt-BR", "fr", "de", "ru", "tr", "id", "ja", "zh-CN"]) {
    assert.match(source, new RegExp(`^// @name:${locale}\\s+\\S`, "m"), locale);
    assert.match(source, new RegExp(`^// @description:${locale}\\s+\\S`, "m"), locale);
  }
});

const {normalizeChoices, downloadParams, progressView, safeFileUrl, safeStatusPath} = require(SCRIPT.pathname);

test("YouTube choices keep product tier and unlock only for an active Supporter", () => {
  const data = {
    youtube_video_choices: {
      free: [{choice_id: "yt:135:140", height: 480, size_mb: 26.9, tier: "free"}, {choice_id: "yt:299:140", height: 1080, size_mb: 214.5, tier: "free", fps: 60}],
      supporter: [{choice_id: "yt:401:251", height: 2160, size_mb: 900, tier: "supporter"}],
    },
    youtube_mp3_choices: [{choice_id: "yt3:128", bitrate_kbps: 128, size_mb: 7, tier: "free"}, {choice_id: "yt3:320", bitrate_kbps: 320, size_mb: 120, tier: "supporter"}],
  };
  const free = normalizeChoices(Object.assign({is_supporter: false}, data));
  assert.deepEqual(free.map((c) => [c.title, c.family, c.locked]), [
    ["480p", "video", false], ["1080p", "video", false], ["2160p", "video", true],
    ["128 kbps", "audio", false], ["320 kbps", "audio", true],
  ]);
  assert.equal(free[1].fps, 60);
  const paid = normalizeChoices(Object.assign({is_supporter: true}, data));
  assert.equal(paid.some((c) => c.locked), false);
  assert.equal(downloadParams(free[1], "https://www.youtube.com/watch?v=x"),
    "/download?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dx&format=mp4&async=1&yt_choice=yt%3A299%3A140");
  assert.match(downloadParams(free[3], "u"), /format=mp3&async=1&yt_choice=yt3%3A128$/);
});

test("other platforms map free/Supporter dictionaries and real MP3 bitrates", () => {
  const choices = normalizeChoices({
    is_supporter: false,
    video_formats: {"720p MP4": {format_id: "hd", quality_edge: 720, size_mb: 30}},
    supporter_video_formats: {"1080p MP4": {format_id: "fhd", height: 1080, size_mb: 600}},
    audio_formats: {a: {bitrate: 128, size_mb: 3, tier: "free"}, b: {bitrate: 192, size_mb: 4}, c: {bitrate: 320, size_mb: 120, tier: "supporter"}},
  });
  assert.deepEqual(choices.map((c) => [c.key, c.locked]), [["v:hd", false], ["v:fhd", true], ["a:128", false], ["a:320", true]]);
  assert.match(downloadParams(choices[0], "u"), /format=mp4&async=1&format_id=hd$/);
  assert.match(downloadParams(choices[2], "u"), /format=mp3&async=1&audio_bitrate=128$/);
});

test("progress text shows measured numbers only", () => {
  const MB = 1024 * 1024;
  assert.deepEqual(progressView("downloading", {downloaded_bytes: 50 * MB, total_bytes: 200 * MB, fraction: 0.25, speed_bps: 5 * MB, eta_seconds: 30}, 9, "YouTube", "mp4"),
    {mode: "measured", fraction: 0.25, text: "25% · 50.0 MB of 200 MB · 5.0 MB/s · ~30s left", step: 1});
  assert.equal(progressView("connecting", null, 1, "YouTube", "mp4").text, "Connecting to YouTube…");
  assert.equal(progressView("connecting", null, 4, "TikTok", "mp4").text, "Connecting to TikTok… 4s");
  assert.equal(progressView("queued", null, 0, "X", "mp4").mode, "waiting");
  const conv = progressView("converting", {fraction: 1, encode_fraction: 0.64}, 3, "YouTube", "mp3");
  assert.deepEqual([conv.mode, conv.fraction, conv.text, conv.step], ["measured", 0.64, "Converting to MP3… 64%", 2]);
  assert.equal(progressView("merging", {fraction: 1}, 1, "YouTube", "mp4").mode, "working");
  assert.equal(progressView("ready", null, 0, "YouTube", "mp4").step, 3);
});

test("only same-service file and status paths are ever followed", () => {
  assert.equal(safeFileUrl("/api/free-download/file/abcdef123456"), "https://nobsdl.com/api/free-download/file/abcdef123456");
  for (const bad of ["https://evil.example/x", "//evil.example/api/free-download/file/abcdef123456", "/api/free-download/file/../admin", "/d/token", ""]) {
    assert.equal(safeFileUrl(bad), null, bad);
  }
  assert.equal(safeStatusPath("/api/free-download/status/abcdef123456"), "/api/free-download/status/abcdef123456");
  assert.equal(safeStatusPath("https://evil.example/api/free-download/status/abcdef123456"), null);
});
