# NoBsDL download shortcuts

A small userscript that adds direct **MP4** and **MP3** shortcuts to supported
public media pages. Choose an action and the matching [NoBsDL](https://nobsdl.com/)
tool opens in a new tab with the current link ready to process.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or
   [Violentmonkey](https://violentmonkey.github.io/).
2. Install the userscript from either mirror:
   - [GitHub raw](https://raw.githubusercontent.com/samrtulethtb/nobsdl-download-button/main/nobsdl-download-button.user.js)
   - [GitLab raw](https://gitlab.com/smartulethtb/nobsdl-download-button/-/raw/main/nobsdl-download-button.user.js)

## Supported pages

- YouTube videos, Shorts and playlists. Mix/Radio links remain single-video
  downloads.
- TikTok videos and mobile shortlinks.
- Instagram Reels and media posts.
- Public Facebook video and Reel pages.
- Reddit video posts and direct `redd.it` media links.
- X/Twitter status pages containing media.
- Public Vimeo video pages.
- Public SoundCloud tracks.

Normal video pages show both MP4 and MP3 shortcuts when the current NoBsDL
workflow supports both. SoundCloud shows MP3 only. YouTube playlists open the
separate playlist workflow, where you choose the batch format and items.

The widget uses Shadow DOM so site CSS cannot easily break its layout. It also
follows single-page-app navigation and restores itself if a site rerender
removes it.

## Privacy and permissions

- No userscript permissions (`@grant none`).
- No background network requests, analytics marker, cookies or local storage.
- Links use `noopener`, `noreferrer` and `referrerPolicy="no-referrer"`.
- After you choose MP4, MP3 or playlist, the browser intentionally sends the
  current public media URL to NoBsDL through `?url=` so extraction can begin.

The script does not bypass logins, private-media controls, paywalls or DRM.
Download only media you are allowed to save.

NoBsDL's interaction promise applies to everyone: **No popups. No forced
redirects. No fake download buttons. Just download.**

## Development

Run the dependency-free logic suite:

```sh
npm test
```

Install the optional Playwright development dependency, then run the rendered
browser checks:

```sh
npm install
npm run test:browser
```

The browser suite uses in-process mock pages and does not contact media sites
or NoBsDL extraction endpoints.

## License

MIT
