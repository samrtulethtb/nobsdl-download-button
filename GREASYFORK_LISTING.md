# Greasy Fork listing – "Additional info" (paste as Markdown)

Name, short description, localized names/descriptions and the
`@antifeature payment` disclosure come from the script header itself.
Images are served from the public mirror repository (`media/`).
Paste everything below the line into the script's **Additional info** field.

---

## ⬇️ Download videos and audio right on the page

<img src="https://raw.githubusercontent.com/samrtulethtb/nobsdl-download-button/main/media/demo.gif" alt="Click Download, pick a real quality, watch live progress, the file is saved" width="430">

Click **Download** on a supported page, pick a quality, and the file goes
straight to your browser's downloads — no new tab, no copy-pasting links, no
captcha pages.

**20 sites:** YouTube (incl. Shorts) · TikTok · Instagram Reels · X / Twitter ·
Facebook · Reddit · Vimeo · Twitch clips & videos · Dailymotion · Pinterest ·
Bluesky · Streamable · Imgur · 9GAG · Odysee · Rutube · OK.ru ·
SoundCloud, Bandcamp & Mixcloud (MP3)

### Why this one

- 🎯 **Real formats with real sizes.** Every choice (e.g. 720p60 · ~173 MB,
  MP3 320 kbps · ~24 MB) comes from the actual source. Nothing invented.
- 📊 **Live progress you can trust.** Queue → Download → Process → Ready, with
  a real percentage, speed and time left measured on the server — not a fake
  timer bar. MP3 encoding shows its own real percentage too.
- 🎵 **MP3 128 / 256 / 320 kbps** next to the MP4 qualities.
- 🧭 **Stays out of your way.** One small button in the corner. Close the panel
  mid-download and it keeps going; the button shows the percentage. Minimize
  it to a dot if you like.
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
- **Nothing is sent until you click Download.** Then only the current page's
  public media link goes to nobsdl.com to list formats and run the job. Pages
  you merely scroll past are never looked up.
- No analytics, ads or tracking code in the script. It stores only whether you
  minimized the button.
- Readable, unminified source (MIT).

### Good to know

- YouTube playlists open NoBsDL's playlist tool (pick items and format, ZIP).
- Private, login-only, paywalled or DRM content is not supported.
- Download only media you are allowed to save.

Problems or ideas? [nobsdl.com/contact](https://nobsdl.com/contact)
