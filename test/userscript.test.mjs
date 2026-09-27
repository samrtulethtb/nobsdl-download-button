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

test("metadata and implementation keep the userscript least-privileged", () => {
  const source = readFileSync(SCRIPT, "utf8");
  assert.match(source, /^\/\/ @grant\s+none$/m);
  assert.match(source, /^\/\/ @noframes$/m);
  assert.doesNotMatch(source, /\bGM_[A-Za-z]+\b|GM\.[A-Za-z]+|XMLHttpRequest|\bfetch\s*\(/);
  assert.match(source, /rel = "noopener noreferrer"/);
  assert.match(source, /referrerPolicy = "no-referrer"/);
  assert.doesNotMatch(source, /\bno ads\b|ad-free/i);
});
