# SafeCircle Gmail Guard

A Chrome extension prototype for Mission 3.2. It scans the sender, subject, and preview text visible in Gmail before a message is opened, then adds a simple green, yellow, or red risk label.

## What it does

- Scans visible Gmail inbox rows automatically
- Adds `Safe`, `Caution`, or `High risk` labels
- Highlights yellow and red messages
- Explains the warning signs in plain language
- Reads warnings aloud
- Shows a warning before opening a red message
- Stores only scan totals in Chrome local storage
- Does not upload or store email content

## Install in Chrome

1. Download this repository as a ZIP from GitHub and extract it.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** in the upper-right corner.
4. Select **Load unpacked**.
5. Choose the `gmail-extension` folder.
6. Open or refresh Gmail.

## Test it

The extension scores the text already visible in each inbox row. For a clear red demo, use a test email with a subject or preview such as:

`URGENT: Your account will be closed today. Send your verification code immediately.`

A medium-risk example:

`We noticed unusual activity. Please verify your account today.`

## Current prototype limitation

This hackathon version analyzes only the sender, subject, and preview snippet visible before the email is opened. It does not yet request Gmail API access, inspect full headers, scan attachments, or make a guaranteed determination that an email is safe.

Gmail changes its page structure periodically, so inbox selectors may need occasional updates.