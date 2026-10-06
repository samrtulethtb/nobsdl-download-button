# NoBsDL Video Downloader (userscript)

![Download right on the page](https://raw.githubusercontent.com/samrtulethtb/nobsdl-download-button/main/media/demo.gif)

Download videos as **MP4** and audio as **MP3** without leaving the page.
Open the panel, pick a real quality with its file size, watch the live server
progress, and the file goes straight to your browser's downloads. Powered by
[NoBsDL](https://nobsdl.com/).

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or
   [Violentmonkey](https://violentmonkey.github.io/).
2. Install the userscript from
   [Greasy Fork](https://greasyfork.org/scripts/597631) (updates arrive
   automatically) or a mirror:
   - [GitHub raw](https://raw.githubusercontent.com/samrtulethtb/nobsdl-download-button/main/nobsdl-download-button.user.js)
   - [GitLab raw](https://gitlab.com/smartulethtb/nobsdl-download-button/-/raw/main/nobsdl-download-button.user.js)

## What you get

- **In-page downloads**: a small NoBsDL button sits in the corner of supported
  media pages. Choose a format and the file is saved without opening a new tab.
- **Feeds too**: on TikTok's For You feed, X timelines and Bluesky the URL
  doesn't change while you scroll, so the button takes the clip on screen when
  you click it (it is briefly outlined). Nothing is looked up while you scroll.
- **Phone-friendly**: on small screens it is a round button you can drag to
  either side, and the formats open as a bottom sheet.
- **Real formats only**: every quality comes from the actual source, with
  NoBsDL's size estimate. Nothing is invented.
- **Live progress**: Queue → Download → Process → Ready, with a real
  percentage while bytes flow (and while MP3 is encoded), speed and time left.
- **Close it any time**: the job keeps running, the button shows the
  percentage and the file is still saved when ready.
- **MP3 128 / 256 / 320 kbps** next to the MP4 qualities.
- **Minimize** to a small round button, or drag the button elsewhere; both
  are remembered.
- Falls back to opening the matching NoBsDL page when your userscript manager
  does not provide `GM_xmlhttpRequest`.

NoBsDL's interaction promise applies to everyone: **No popups. No forced
redirects. No fake download buttons. Just download.**

## Supported sites

Each link opens that site's downloader on nobsdl.com, which also works
without the script (paste a link there).

- YouTube videos — [YouTube downloader](https://nobsdl.com/youtube-downloader)
  and [YouTube to MP3](https://nobsdl.com/youtube-to-mp3). Mix/Radio links stay
  single-video downloads.
- YouTube Shorts — [YouTube Shorts downloader](https://nobsdl.com/youtube-shorts-downloader).
- YouTube playlists open the
  [YouTube playlist downloader](https://nobsdl.com/youtube-playlist-downloader)
  (pick items and format, ZIP).
- TikTok videos and mobile shortlinks — [TikTok downloader](https://nobsdl.com/tiktok-downloader).
- Instagram Reels and media posts — [Instagram downloader](https://nobsdl.com/instagram-downloader).
- Public Facebook video and Reel pages — [Facebook video downloader](https://nobsdl.com/facebook-downloader).
- Reddit video posts and direct `redd.it` media links — [Reddit video downloader](https://nobsdl.com/reddit-downloader).
- X/Twitter status pages containing media — [X (Twitter) video downloader](https://nobsdl.com/x-downloader).
- SoundCloud tracks (MP3) — [SoundCloud to MP3](https://nobsdl.com/soundcloud-to-mp3).
- Twitch clips and past videos, Dailymotion videos, Pinterest pins, Bluesky
  posts, Streamable, Imgur, 9GAG, Odysee, Rutube and OK.ru video pages, plus
  Bandcamp tracks and Mixcloud shows as MP3 — the
  [universal video downloader](https://nobsdl.com/universal-downloader) (each
  verified with a real download).

Feeds: TikTok For You/Following, X/Twitter timelines and Bluesky were checked
on the live sites (2026-10-06). The same on-screen-clip detection is enabled
for Reddit, Instagram, Facebook, 9GAG and SoundCloud (now-playing track) but
was not yet checked live there (login walls or bot checks in the test
browser). On TikTok's mobile website some userscript managers can't read
which clip is playing; the panel then asks you to paste the clip's link
(Share → Copy link). YouTube, profiles and search pages show no feed button:
opening a video there changes the URL, and that page gets the button.

## Free and Supporter

Most downloads are free. Some higher resolutions and files over the free size
limits (500 MB video, 100 MB MP3) need a paid
[NoBsDL Supporter key](https://nobsdl.com/supporter); the panel shows those
choices with a lock and never starts them for a free session. This is
declared as `@antifeature payment` (on OpenUserJS, which has no `payment`
category, as `@antifeature membership`). A Supporter session activated on
nobsdl.com in the same browser is used when your userscript manager sends
nobsdl.com cookies with its requests; otherwise use **Open on NoBsDL** in the panel,
where your Supporter access works as usual.

## Privacy and permissions

- `@grant GM_xmlhttpRequest` (+ `GM.xmlHttpRequest`) with `@connect nobsdl.com`
  only: requests go to nobsdl.com and nowhere else.
- **Nothing is sent until you open the panel.** Then one public media URL is
  sent to nobsdl.com to list its formats: the page's own, or on a feed the
  clip on screen (read from the page when you click). Choosing a format starts
  the job and polls its status. Clips you merely scroll past are never looked
  up.
- Requests may carry your normal nobsdl.com cookies (your userscript manager
  decides), which is how an active Supporter session can be recognised. The
  script itself stores no key, cookie or history; only whether you minimized
  the button and where you dragged it (`GM_getValue`/`GM_setValue`).
- No analytics, ads or tracking code in the script. The DOM is built with
  text nodes only (no `innerHTML`), inside a Shadow DOM.
- Links use `noopener`, `noreferrer` and `referrerPolicy="no-referrer"`.

The script does not bypass logins, private-media controls, paywalls or DRM.
Download only media you are allowed to save.

## Guides on nobsdl.com

- [How to download a video from a link](https://nobsdl.com/guides/download-video-from-link)
- [YouTube video quality explained](https://nobsdl.com/guides/youtube-video-quality)
- [What 320 kbps MP3 actually means](https://nobsdl.com/guides/youtube-mp3-320kbps)
- [How to download a YouTube playlist](https://nobsdl.com/guides/download-youtube-playlist)
- [A downloader without popups or fake buttons](https://nobsdl.com/guides/downloader-without-popups)
- [Download a video from a link on iPhone](https://nobsdl.com/guides/download-video-on-iphone)
- [Download a video from a link on Android](https://nobsdl.com/guides/download-video-on-android)
- [Video link not downloading? Causes and fixes](https://nobsdl.com/guides/video-link-not-downloading)

## Development

```sh
npm test                 # syntax + logic suite, no dependencies
npm install
CHROME_BIN=/path/to/chrome npm run test:browser   # mocked browser checks
```

The browser suite fulfils every page and NoBsDL API answer in-process; it does
not contact media sites or NoBsDL. This repository is published from the
NoBsDL source tree by `tools/userscript/publish.sh`. Screenshots in `media/` were taken on a
real YouTube page (Big Buck Bunny, CC-BY Blender Foundation) with the real
NoBsDL service; recommendations are blurred.

## License

MIT
