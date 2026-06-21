# SafeCircle Gmail Guard

SafeCircle Gmail Guard is a Chrome extension built for the NJx Hackathon. It helps people with limited technical literacy identify possible phishing emails directly inside Gmail.

## What it does

- Scans the sender, subject, and visible Gmail preview locally in the browser
- Highlights inbox rows green, yellow, or red
- Adds a **Learn more** button beside Gmail's email actions
- Answers **“Is this a scam?”** with a large YES or NO result
- Shows an estimated scam likelihood, plain-language reasons, and recommended next steps
- Reads the warning aloud
- Warns the user before opening an email classified as high risk
- Does not upload email content to a server

## Install the extension

1. Download this repository as a ZIP file.
2. Extract the ZIP.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode**.
5. Click **Load unpacked**.
6. Select the `gmail-extension` folder.
7. Open or refresh Gmail.

## Extension files

- `gmail-extension/manifest.json` — Chrome extension configuration
- `gmail-extension/scoring.js` — local phishing-risk scoring rules
- `gmail-extension/content.js` — Gmail inbox scanning, warnings, and dialogs
- `gmail-extension/maintain-highlights.js` — safely restores highlights after Gmail redraws the inbox
- `gmail-extension/styles.css` — inbox highlighting and dialog styles
- `gmail-extension/verdict.css` — large YES/NO scam verdict interface
- `gmail-extension/popup.html` — extension popup interface
- `gmail-extension/popup.js` — popup statistics and reset controls

## Privacy and limitations

The extension analyzes only the sender, subject, and preview text already visible in Gmail. It does not currently read the full unopened email body, hidden links, attachments, Reply-To headers, or authentication headers.

All analysis runs locally in the browser. The extension stores only scan totals in Chrome local storage and does not send email content to an external server.

SafeCircle provides guidance, not proof that an email is safe or fraudulent.