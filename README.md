# SafeCircle

**Check the message. Understand the risk. Ask someone you trust.**

SafeCircle is an accessible scam-safety web app built for NJx Hackathon Mission 3.2 (Plain Words) and Mission 3.3 (Trusted Voice). It helps older adults and people with limited technical literacy understand suspicious messages and quickly involve a family member or trusted contact.

## Features

- Paste or type a suspicious message
- Speak a message using browser speech recognition
- Upload a screenshot and extract its text in the browser with Tesseract.js
- Plain-language risk result with a 0–100 score
- Detects urgency, threats, payment requests, secrecy, credentials, suspicious links, impersonation, prizes, remote-access requests, and unexpected attachments
- English, Spanish, Hindi, and Telugu interface
- Read results aloud with browser text-to-speech
- Save a trusted contact locally and prepare an SMS, email, or WhatsApp alert
- Installable progressive web app with offline app-shell support
- Responsive, keyboard-friendly, large-text interface
- No account or server required

## Run locally

Because the app uses a service worker, run it from a local web server rather than opening `index.html` directly.

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy with GitHub Pages

1. Open the repository's **Settings**.
2. Select **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.
5. Save.

## Suggested live demo

1. Click **Try an example** until the fake bank message appears.
2. Click **Check this message**.
3. Show the high-risk result and warning signs.
4. Click **Read result aloud**.
5. Change the interface language.
6. Add a trusted person and click **Ask my trusted person**.
7. Show the prepared SMS, email, or WhatsApp alert.

## Privacy and limitations

The rule-based message analysis runs entirely in the browser. Trusted-contact settings are stored only in browser `localStorage`. Screenshot OCR is performed in the browser using Tesseract.js loaded from a CDN.

SafeCircle is a decision-support tool, not proof that a message is safe or fraudulent. Users should independently contact the claimed person or organization through a trusted phone number or official website.

## Project structure

- `index.html` — accessible app interface
- `styles.css` — responsive visual design
- `app.js` — analysis engine, OCR, speech, translations, and sharing
- `manifest.webmanifest` — installable PWA metadata
- `service-worker.js` — offline app-shell caching
- `icon.svg` — app icon

## Hackathon positioning

The product is designed around trust rather than lectures. Its primary customer is an older adult who receives suspicious messages and wants a simple answer, a spoken explanation, and a fast way to ask family for help.