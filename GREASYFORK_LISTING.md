## ⬇️ Download videos and audio right on the page

<img src="https://raw.githubusercontent.com/samrtulethtb/nobsdl-download-button/main/media/demo.gif" alt="Click Download, pick a real quality, watch live progress, the file is saved" width="430">

Point at a video or thumbnail and click its **⬇ Download** button (or the one
in the corner), pick a quality, and the file goes straight to your browser's
downloads — no new tab, no copy-pasting links, no captcha pages.

**19 sites:** YouTube (videos, Shorts, MP3, playlists) · TikTok · Instagram Reels ·
X / Twitter · Facebook · Reddit · SoundCloud (MP3) · Twitch clips & videos ·
Dailymotion · Pinterest · Bluesky · Streamable · Imgur · 9GAG · Odysee · Rutube ·
OK.ru · Bandcamp & Mixcloud (MP3)

**Works on** — each link opens that site's downloader on nobsdl.com, which also
works without the script:
[YouTube downloader](https://nobsdl.com/youtube-downloader) ·
[YouTube to MP3](https://nobsdl.com/youtube-to-mp3) ·
[YouTube Shorts downloader](https://nobsdl.com/youtube-shorts-downloader) ·
[YouTube playlist downloader](https://nobsdl.com/youtube-playlist-downloader) ·
[TikTok downloader](https://nobsdl.com/tiktok-downloader) ·
[Instagram downloader](https://nobsdl.com/instagram-downloader) ·
[Facebook video downloader](https://nobsdl.com/facebook-downloader) ·
[Reddit video downloader](https://nobsdl.com/reddit-downloader) ·
[X (Twitter) video downloader](https://nobsdl.com/x-downloader) ·
[SoundCloud to MP3](https://nobsdl.com/soundcloud-to-mp3) ·
[Universal video downloader](https://nobsdl.com/universal-downloader) (Twitch,
Dailymotion, Pinterest, Bluesky and the other sites above)

### Why this one

- ⬇️ **A Download button on every video.** With a mouse, the button appears on
  the video or thumbnail you point at: YouTube's player, home, search and
  sidebar thumbnails, videos in X, Reddit, Instagram, Facebook, Bluesky and
  9GAG feeds, TikTok and Twitch thumbnails. It opens that exact clip. Turn it
  off from your userscript manager's menu if you prefer only the corner button.
- 🎯 **Real formats with real sizes.** Every choice (e.g. 720p60 · ~173 MB,
  MP3 320 kbps · ~24 MB) comes from the actual source. Nothing invented.
- 📊 **Live progress you can trust.** Queue → Download → Process → Ready, with
  a real percentage, speed and time left measured on the server — not a fake
  timer bar. MP3 encoding shows its own real percentage too.
- 🎵 **MP3 128 / 256 / 320 kbps** next to the MP4 qualities.
- 📜 **Works while you scroll.** On TikTok's For You feed, X timelines and
  Bluesky the button takes the clip on screen (briefly outlined) — no need to
  open each video first.
- 📱 **Made for phones too.** A round button you can drag anywhere and a bottom
  sheet with big touch targets.
- 🧭 **Stays out of your way.** One small button in the corner, and one on
  the video only while you point at it. Close the panel
  mid-download and it keeps going; the button shows the percentage. Minimize
  it to a dot or drag it elsewhere if you like.
- 🏠 **No third-party download sites.** The script talks only to NoBsDL's own
  service — **No popups. No forced redirects. No fake download buttons.**

<img src="https://raw.githubusercontent.com/samrtulethtb/nobsdl-download-button/main/media/youtube-formats.jpg" alt="Format panel on a YouTube video: real qualities with sizes, 4K marked Supporter" width="720">

<img src="https://raw.githubusercontent.com/samrtulethtb/nobsdl-download-button/main/media/youtube-progress.jpg" alt="Live download progress with percentage, size and speed" width="720">

### ▶️ Try it

After installing, open one of these public pages and click **Download**:

| Site | Example |
|---|---|
| YouTube | https://www.youtube.com/watch?v=aqz-KE-bpKQ |
| Twitch clip | https://www.twitch.tv/xqc/clip/CulturedAmazingKuduDatSheffy-TiZ_-ixAGYR3y2Uy |
| Dailymotion | https://www.dailymotion.com/video/x5kesuj |
| Pinterest | https://www.pinterest.com/pin/664281013778109217/ |
| Bluesky | https://bsky.app/profile/bsky.app/post/3l3vgf77uco2g |
| 9GAG | https://9gag.com/gag/ae5Ag7B |
| Imgur | https://imgur.com/A61SaA1 |
| Bandcamp (MP3) | https://benprunty.bandcamp.com/track/lanius-battle |
| Mixcloud (MP3) | https://www.mixcloud.com/dholbach/cryptkeeper/ |

### Free and Supporter (disclosed as `@antifeature payment`)

Most downloads are **free**. Some higher resolutions and files over the free
size limits (500 MB video, 100 MB MP3) need a paid
[NoBsDL Supporter key](https://nobsdl.com/supporter). Those choices are shown
with a 🔒 and never started for a free session. A Supporter session activated
on nobsdl.com in the same browser is used when your userscript manager sends
nobsdl.com cookies with its requests; otherwise use **Open on NoBsDL** in the
panel, where your Supporter access works as usual.

### Privacy

- Talks **only to nobsdl.com** (`@connect nobsdl.com`).
- **Nothing is sent until you click Download.** Then only the public link of
  that one video (the page's own, the one whose button you clicked, or on a feed
  the clip on screen) goes to nobsdl.com to list formats and run the job. Clips
  you merely scroll past or point at are never looked up.
- No analytics, ads or tracking code in the script. It stores only whether you
  minimized the button, where you dragged it, whether the buttons on videos are
  on, and a count of saved files (after
  3 it asks once for a rating; "Not now" hides it for good).
- Readable, unminified source (MIT).

### Good to know

- YouTube playlists open NoBsDL's playlist tool (pick items and format, ZIP).
- Private, login-only, paywalled or DRM content is not supported.
- Download only media you are allowed to save.

Problems or ideas? [nobsdl.com/contact](https://nobsdl.com/contact)
