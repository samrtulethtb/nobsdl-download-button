// ==UserScript==
// @name         NoBsDL – MP4 & MP3 download shortcuts
// @namespace    https://nobsdl.com/
// @version      1.0.0
// @description  Adds NoBsDL MP4 and MP3 shortcuts to supported public media pages on YouTube, TikTok, Instagram, Facebook, Reddit, X/Twitter, Vimeo and SoundCloud.
// @author       NoBsDL
// @homepageURL  https://nobsdl.com/
// @supportURL   https://nobsdl.com/contact
// @license      MIT
// @match        *://*.youtube.com/*
// @match        *://*.youtu.be/*
// @match        *://*.youtube-nocookie.com/*
// @match        *://*.tiktok.com/*
// @match        *://*.instagram.com/*
// @match        *://*.facebook.com/*
// @match        *://*.reddit.com/*
// @match        *://*.redd.it/*
// @match        *://*.x.com/*
// @match        *://*.twitter.com/*
// @match        *://*.vimeo.com/*
// @match        *://*.soundcloud.com/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

// The script makes no background requests. An action opens NoBsDL in a new
// tab and intentionally passes the current public media URL through ?url= so
// the destination page can extract it. noreferrer prevents a separate
// Referer header from leaking page data during that navigation.
(function () {
  "use strict";

  const NOBSDL_ORIGIN = "https://nobsdl.com";
  const WIDGET_ID = "nobsdl-download-widget";
  const VIDEO_AUDIO = Object.freeze(["mp4", "mp3"]);
  const AUDIO_ONLY = Object.freeze(["mp3"]);
  const PLAYLIST_ONLY = Object.freeze(["playlist"]);

  function hostIs(host, suffix) {
    return host === suffix || host.endsWith("." + suffix);
  }

  function pathParts(url) {
    return url.pathname.split("/").filter(Boolean);
  }

  function realYoutubePlaylist(value) {
    const id = String(value || "").trim();
    return Boolean(id) && !/^(?:RD|UL)/i.test(id) && /^[A-Za-z0-9_-]{10,160}$/.test(id);
  }

  function validId(value) {
    return /^[A-Za-z0-9_-]{1,160}$/.test(String(value || ""));
  }

  function page(platform, name, workflow, route, outputs, extra) {
    return Object.assign({platform, name, workflow, route, outputs}, extra || {});
  }

  function youtubePage(url, host) {
    const parts = pathParts(url);
    const listId = url.searchParams.get("list") || "";
    const isPlaylist = realYoutubePlaylist(listId);

    if (hostIs(host, "youtu.be")) {
      if (!validId(parts[0])) return null;
      if (isPlaylist) {
        return page("youtube", "YouTube", "playlist", "/youtube-playlist-downloader", PLAYLIST_ONLY, {listId});
      }
      return page("youtube", "YouTube", "single", "/youtube-downloader", VIDEO_AUDIO);
    }

    if (url.pathname.toLowerCase().startsWith("/shorts/") && validId(parts[1])) {
      return page("youtube", "YouTube Shorts", "short", "/youtube-shorts-downloader", VIDEO_AUDIO);
    }

    if ((url.pathname.toLowerCase() === "/playlist" || url.pathname.toLowerCase() === "/watch") && isPlaylist) {
      return page("youtube", "YouTube playlist", "playlist", "/youtube-playlist-downloader", PLAYLIST_ONLY, {listId});
    }

    if (url.pathname.toLowerCase() === "/watch" && validId(url.searchParams.get("v"))) {
      return page("youtube", "YouTube", "single", "/youtube-downloader", VIDEO_AUDIO);
    }

    if (/^\/(?:embed|v|live)\/[A-Za-z0-9_-]+/i.test(url.pathname)) {
      return page("youtube", "YouTube", "single", "/youtube-downloader", VIDEO_AUDIO);
    }
    return null;
  }

  function soundcloudPage(url, host) {
    const parts = pathParts(url);
    if (host === "on.soundcloud.com") {
      return parts[0] ? page("soundcloud", "SoundCloud", "single", "/soundcloud-to-mp3", AUDIO_ONLY) : null;
    }
    const reservedFirst = new Set(["discover", "search", "stream", "you", "upload", "charts"]);
    const reservedSecond = new Set(["sets", "tracks", "likes", "reposts", "popular-tracks"]);
    if (parts.length < 2 || reservedFirst.has(parts[0].toLowerCase()) || reservedSecond.has(parts[1].toLowerCase())) {
      return null;
    }
    return page("soundcloud", "SoundCloud", "single", "/soundcloud-to-mp3", AUDIO_ONLY);
  }

  function pageFor(input) {
    let url;
    try {
      url = input instanceof URL ? input : new URL(String(input || ""));
    } catch (_) {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const path = url.pathname;
    const parts = pathParts(url);

    if (hostIs(host, "youtube.com") || hostIs(host, "youtu.be") || hostIs(host, "youtube-nocookie.com")) {
      return youtubePage(url, host);
    }

    if (hostIs(host, "tiktok.com")) {
      const shortHost = host === "vm.tiktok.com" || host === "vt.tiktok.com";
      if ((shortHost && parts[0]) || /^\/@[^/]+\/video\/\d+/i.test(path) || /^\/(?:t|v)\/[A-Za-z0-9_-]+/i.test(path)) {
        return page("tiktok", "TikTok", "single", "/tiktok-downloader", VIDEO_AUDIO);
      }
      return null;
    }

    if (hostIs(host, "instagram.com")) {
      return /^\/(?:reel|reels|p|tv)\/[A-Za-z0-9_-]+/i.test(path)
        ? page("instagram", "Instagram", "single", "/instagram-downloader", VIDEO_AUDIO)
        : null;
    }

    if (hostIs(host, "facebook.com")) {
      const isWatch = /^\/watch\/?$/i.test(path) && Boolean(url.searchParams.get("v"));
      const isVideo = /^\/(?:reel|share\/(?:v|r))\/[A-Za-z0-9._-]+/i.test(path)
        || /\/videos\/\d+/i.test(path)
        || /^\/video\.php$/i.test(path) && Boolean(url.searchParams.get("v"));
      return isWatch || isVideo
        ? page("facebook", "Facebook", "single", "/facebook-downloader", VIDEO_AUDIO)
        : null;
    }

    if (hostIs(host, "reddit.com") || hostIs(host, "redd.it")) {
      const direct = hostIs(host, "redd.it") && host !== "reddit.com" && Boolean(parts[0]);
      const post = /\/(?:r\/[^/]+\/)?comments\/[A-Za-z0-9]+/i.test(path);
      return direct || post
        ? page("reddit", "Reddit", "single", "/reddit-downloader", VIDEO_AUDIO)
        : null;
    }

    if (hostIs(host, "x.com") || hostIs(host, "twitter.com")) {
      return /^\/(?:i\/)?[^/]+\/status\/\d+/i.test(path) || /^\/i\/status\/\d+/i.test(path)
        ? page("twitter", "X / Twitter", "single", "/x-downloader", VIDEO_AUDIO)
        : null;
    }

    if (hostIs(host, "vimeo.com")) {
      const isVimeoVideo = /^\/\d+(?:\/|$)/.test(path)
        || /^\/video\/\d+(?:\/|$)/.test(path)
        || /\/(?:videos?|video)\/\d+(?:\/|$)/.test(path)
        || /\/\d+(?:\/|$)/.test(path) && /^(?:channels|groups|showcase)\//i.test(parts.slice(0, -1).join("/"));
      return isVimeoVideo
        ? page("vimeo", "Vimeo", "single", "/vimeo-downloader", VIDEO_AUDIO)
        : null;
    }

    if (hostIs(host, "soundcloud.com")) return soundcloudPage(url, host);
    return null;
  }

  function sourceUrlFor(currentUrl, matchedPage) {
    if (matchedPage.workflow === "playlist" && matchedPage.listId) {
      const normalized = new URL("https://www.youtube.com/playlist");
      normalized.searchParams.set("list", matchedPage.listId);
      return normalized.href;
    }
    return new URL(currentUrl).href;
  }

  function targetUrl(matchedPage, currentUrl, output) {
    if (!matchedPage || !matchedPage.outputs.includes(output)) return null;
    let route = matchedPage.route;
    if (matchedPage.platform === "youtube" && matchedPage.workflow === "single") {
      route = output === "mp3" ? "/youtube-to-mp3" : "/youtube-downloader";
    }
    const target = new URL(route, NOBSDL_ORIGIN);
    target.searchParams.set("url", sourceUrlFor(currentUrl, matchedPage));
    if (matchedPage.outputs === VIDEO_AUDIO && !(matchedPage.platform === "youtube" && matchedPage.workflow === "single")) {
      target.searchParams.set("prefer", output);
    }
    return target.href;
  }

  function createAction(matchedPage, currentUrl, output) {
    const anchor = document.createElement("a");
    anchor.className = "action action-" + output;
    anchor.href = targetUrl(matchedPage, currentUrl, output);
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.referrerPolicy = "no-referrer";
    const label = output === "playlist" ? "Open playlist" : output.toUpperCase();
    anchor.textContent = label;
    anchor.setAttribute("aria-label", output === "playlist"
      ? "Open this YouTube playlist in NoBsDL"
      : "Open this " + matchedPage.name + " page in NoBsDL with " + output.toUpperCase() + " first");
    return anchor;
  }

  function makeWidget(matchedPage, currentUrl) {
    const host = document.createElement("div");
    host.id = WIDGET_ID;
    host.setAttribute("data-platform", matchedPage.platform);
    host.style.setProperty("position", "fixed", "important");
    host.style.setProperty("right", "16px", "important");
    host.style.setProperty("bottom", "16px", "important");
    host.style.setProperty("display", "block", "important");
    host.style.setProperty("z-index", "2147483647", "important");

    const shadow = host.attachShadow({mode: "open"});
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; color-scheme: dark; }
      .dock { box-sizing: border-box; display: flex; align-items: stretch; gap: 6px; max-width: calc(100vw - 32px); padding: 6px; border: 1px solid rgba(148,163,184,.28); border-radius: 16px; background: rgba(9,11,17,.96); box-shadow: 0 16px 38px rgba(0,0,0,.42), 0 0 24px rgba(99,102,241,.2); font: 700 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color: #f7f9ff; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
      .brand { box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; min-width: 88px; padding: 5px 8px 5px 10px; white-space: nowrap; }
      .brand strong { font-size: 14px; letter-spacing: -.02em; background: linear-gradient(110deg,#f7f9ff,#7771ff 55%,#3dd6f5); -webkit-background-clip: text; background-clip: text; color: transparent; }
      .brand small { max-width: 116px; overflow: hidden; color: #94a3b8; font-size: 10px; font-weight: 600; text-overflow: ellipsis; }
      .actions { display: flex; align-items: stretch; gap: 5px; }
      .action { box-sizing: border-box; display: inline-flex; min-width: 52px; min-height: 44px; align-items: center; justify-content: center; padding: 0 13px; border: 1px solid transparent; border-radius: 11px; color: #fff; text-decoration: none; font-weight: 800; letter-spacing: .02em; cursor: pointer; transition: filter .15s ease, transform .15s ease; -webkit-tap-highlight-color: transparent; }
      .action-mp4, .action-playlist { background: linear-gradient(135deg,#6862f6,#497fee); }
      .action-mp3 { background: linear-gradient(135deg,#0891b2,#06b6d4); color: #03151a; }
      .action-playlist { min-width: 116px; }
      .action:hover { filter: brightness(1.1); transform: translateY(-1px); }
      .action:focus-visible { outline: 3px solid #f8b84e; outline-offset: 2px; }
      @media (max-width: 380px) {
        .dock { gap: 4px; padding: 5px; }
        .brand { min-width: 76px; padding-inline: 7px; }
        .brand small { max-width: 84px; }
        .action { min-width: 48px; padding-inline: 10px; }
      }
      @media (prefers-reduced-motion: reduce) { .action { transition: none; } }
    `;
    const dock = document.createElement("div");
    dock.className = "dock";
    dock.setAttribute("role", "group");
    dock.setAttribute("aria-label", "NoBsDL shortcuts for " + matchedPage.name);

    const brand = document.createElement("div");
    brand.className = "brand";
    const title = document.createElement("strong");
    title.textContent = "↓ NoBsDL";
    const subtitle = document.createElement("small");
    subtitle.textContent = matchedPage.name;
    brand.append(title, subtitle);

    const actions = document.createElement("div");
    actions.className = "actions";
    for (const output of matchedPage.outputs) actions.appendChild(createAction(matchedPage, currentUrl, output));
    dock.append(brand, actions);
    shadow.append(style, dock);
    return host;
  }

  function boot() {
    let widget = null;
    let signature = "";

    function sync() {
      const currentUrl = location.href;
      const matchedPage = pageFor(currentUrl);
      if (!matchedPage) {
        if (widget && widget.isConnected) widget.remove();
        signature = "";
        return;
      }

      const nextSignature = currentUrl + "|" + matchedPage.platform + "|" + matchedPage.workflow;
      if (!widget || signature !== nextSignature) {
        if (widget && widget.isConnected) widget.remove();
        widget = makeWidget(matchedPage, currentUrl);
        signature = nextSignature;
      }
      if (!widget.isConnected && document.body) document.body.appendChild(widget);
    }

    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    setInterval(sync, 750);
  }

  const api = {NOBSDL_ORIGIN, VIDEO_AUDIO, pageFor, realYoutubePlaylist, sourceUrlFor, targetUrl};
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  boot();
})();
