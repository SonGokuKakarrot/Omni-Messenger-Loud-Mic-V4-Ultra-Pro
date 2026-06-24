# Omni Messenger Loud Mic V4 Ultra Pro

A Manifest V3 Chromium extension that enhances microphone audio for Facebook, Messenger, and Instagram web calls. This optimized build preserves the original loud microphone purpose, raw-mic controls, presets, EQ, compression, limiting, saturation, sustain, reverb, keep-alive, WebRTC sender tuning, and SDP bitrate hints while reducing the browser lag and instability caused by aggressive polling, repeated audio graph work, and unnecessary UI/runtime churn.

## Supported pages

- `https://facebook.com/*`
- `https://*.facebook.com/*`
- `https://messenger.com/*`
- `https://*.messenger.com/*`
- `https://instagram.com/*`
- `https://*.instagram.com/*`

## Project structure

```text
.
├── README.md
├── background.js              # MV3 service worker for local heartbeat/status diagnostics
├── manifest.json              # Extension manifest and permissions
├── content/
│   ├── loader.js              # Safe page-world injector loader
│   └── service.js             # Storage/config bridge between popup and injected hook
├── core/
│   └── injector.js            # WebRTC/getUserMedia hooks and optimized Web Audio pipeline
└── popup/
    ├── popup.css              # Self-contained popup styling with no remote font dependency
    ├── popup.html             # Controls and presets UI
    └── popup.js               # Config persistence, debounced sliders, and hook status
```

## What was optimized

- Removed continuous DOM subtree watching from the content loader and replaced it with a short retry loop that stops after successful injection.
- Reduced sender recovery/maintenance polling from the former very aggressive cadence to a configurable 750-5000 ms range, defaulting to 1000 ms.
- Cached saturation curves so slider/config changes do not allocate a new `Float32Array` every time.
- Reduced waveshaper oversampling from `4x` to `2x` to keep the saturation character while lowering CPU usage.
- Made the sustain controller read live config, run less frequently, and recover cleanly when disabled or when the audio context closes.
- Added single-run audio graph cleanup guards to prevent duplicate closes/stops.
- Fixed the Opus SDP `fmtp` merge string so bitrate/audio flags are appended correctly.
- Removed the popup's remote Google Fonts import for faster, CSP-safe, offline-friendly loading.
- Debounced popup slider writes to Chrome storage to avoid floods of storage change events while dragging controls.

## Installation in Chrome / Chromium

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder containing `manifest.json`.
6. Open or reload Facebook, Messenger, or Instagram Web.
7. Join a voice/video call and open the extension popup to choose **Royal Clear** or **Lord V4** and tune controls.

## Recommended usage

- Use **Royal Clear** first if you want a stable loud call profile with less clipping.
- Use **Lord V4** for the maximum-loudness profile. It intentionally pushes gain, sustain, EQ, and limiting extremely hard.
- If a call crackles, clips, or remote users report distortion, lower these first:
  - Gain
  - Loudness Trim
  - Saturation Drive
  - Sustain Max Gain
  - Presence/Treble EQ
- Keep **Raw mic constraint lock** enabled for the intended raw microphone behavior.

## Development and validation

This extension is plain JavaScript/HTML/CSS and does not require a build step.

Run syntax checks from the repository root:

```bash
node --check background.js
node --check content/loader.js
node --check content/service.js
node --check core/injector.js
node --check popup/popup.js
```

To package for manual distribution, zip the repository contents excluding `.git`.

## Privacy

The extension performs local microphone stream processing in the browser page. It does not fetch remote code, send webhooks, read tokens, or upload audio. Chrome's normal site microphone permission prompts still apply.
