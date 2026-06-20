(() => {
  const dialog = document.getElementById('gmailImportDialog');
  const openButton = document.getElementById('openGmailImport');
  const closeButton = document.getElementById('closeGmailImport');
  const input = document.getElementById('emlFileInput');
  const dropZone = document.getElementById('emlDropZone');
  const status = document.getElementById('emlStatus');
  const messageInput = document.getElementById('messageInput');
  const emailMeta = document.getElementById('emailMeta');

  const styles = document.createElement('style');
  styles.textContent = `
    .gmail-import-card{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:1rem;margin-bottom:1.4rem;border-left:6px solid #ea4335}
    .gmail-logo{display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:#fff1f0;color:#c5221f;font-size:1.6rem;font-weight:900;border:1px solid #f5c6c2}
    .gmail-copy h2{margin:0 0 .25rem;font-size:1.25rem}.gmail-copy p{margin:0;color:var(--muted)}
    .gmail-steps{background:#f7f9fb;border-radius:14px;padding:.85rem 1rem;margin:1rem 0}.gmail-steps p{margin:.35rem 0}
    .eml-drop-zone{display:grid;place-items:center;text-align:center;gap:.25rem;border:2px dashed #9eb2c1;border-radius:16px;padding:1.7rem;cursor:pointer;background:#fbfdff}
    .eml-drop-zone:hover,.eml-drop-zone.dragging{border-color:var(--blue);background:var(--sky)}.eml-drop-zone span{font-size:2rem}.eml-drop-zone small{color:var(--muted)}
    .email-meta{display:grid;grid-template-columns:auto 1fr;gap:.25rem .7rem;background:#f3f6f8;border-radius:12px;padding:.8rem 1rem;margin-bottom:1rem;font-size:.85rem;overflow-wrap:anywhere}.email-meta strong{color:var(--navy)}
    details{margin-top:1rem;color:var(--muted)}summary{cursor:pointer;font-weight:750;color:var(--navy)}
    @media(max-width:720px){.gmail-import-card{grid-template-columns:auto 1fr}.gmail-import-card>button{grid-column:1/-1;width:100%}}
  `;
  document.head.appendChild(styles);

  function decodeQuotedPrintable(value) {
    return value
      .replace(/=\r?\n/g, '')
      .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  function decodeMimeWord(value = '') {
    return value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_, charset, mode, data) => {
      try {
        if (mode.toLowerCase() === 'b') return decodeURIComponent(escape(atob(data)));
        return decodeURIComponent(escape(decodeQuotedPrintable(data.replace(/_/g, ' '))));
      } catch { return data; }
    });
  }

  function unfoldHeaders(raw) {
    return raw.replace(/\r?\n[ \t]+/g, ' ');
  }

  function headerValue(headers, name) {
    const match = unfoldHeaders(headers).match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
    return match ? decodeMimeWord(match[1].trim()) : '';
  }

  function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,noscript').forEach(el => el.remove());
    return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function decodePart(body, encoding) {
    try {
      if (/base64/i.test(encoding)) return decodeURIComponent(escape(atob(body.replace(/\s/g, ''))));
      if (/quoted-printable/i.test(encoding)) return decodeQuotedPrintable(body);
    } catch {}
    return body;
  }

  function extractBody(raw, headers) {
    const boundaryMatch = headers.match(/boundary="?([^";\r\n]+)"?/i);
    if (boundaryMatch) {
      const parts = raw.split(`--${boundaryMatch[1]}`);
      let htmlFallback = '';
      for (const part of parts) {
        const split = part.search(/\r?\n\r?\n/);
        if (split < 0) continue;
        const partHeaders = part.slice(0, split);
        let partBody = part.slice(split).replace(/^\r?\n\r?\n/, '').replace(/--\s*$/, '');
        const type = headerValue(partHeaders, 'Content-Type').toLowerCase();
        const encoding = headerValue(partHeaders, 'Content-Transfer-Encoding');
        partBody = decodePart(partBody.trim(), encoding);
        if (type.includes('text/plain')) return partBody.trim();
        if (type.includes('text/html')) htmlFallback = stripHtml(partBody);
      }
      if (htmlFallback) return htmlFallback;
    }
    const split = raw.search(/\r?\n\r?\n/);
    let body = split >= 0 ? raw.slice(split).replace(/^\r?\n\r?\n/, '') : raw;
    body = decodePart(body, headerValue(headers, 'Content-Transfer-Encoding'));
    return /text\/html/i.test(headerValue(headers, 'Content-Type')) ? stripHtml(body) : body.trim();
  }

  function parseEml(raw) {
    const split = raw.search(/\r?\n\r?\n/);
    const headers = split >= 0 ? raw.slice(0, split) : '';
    const from = headerValue(headers, 'From');
    const replyTo = headerValue(headers, 'Reply-To');
    const subject = headerValue(headers, 'Subject');
    const date = headerValue(headers, 'Date');
    const returnPath = headerValue(headers, 'Return-Path');
    const authentication = headerValue(headers, 'Authentication-Results');
    const body = extractBody(raw, headers);
    return { from, replyTo, subject, date, returnPath, authentication, body };
  }

  function emailAddress(value = '') {
    const angle = value.match(/<([^>]+)>/);
    const plain = value.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    return (angle?.[1] || plain?.[0] || '').toLowerCase();
  }

  function domain(address = '') { return address.split('@')[1] || ''; }

  async function importEmail(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.eml') && file.type !== 'message/rfc822') {
      status.textContent = 'Please choose an .eml file downloaded from Gmail.';
      return;
    }
    status.textContent = 'Reading email safely on this device…';
    try {
      const raw = await file.text();
      const email = parseEml(raw);
      if (!email.body && !email.subject) throw new Error('No readable email content');

      const combined = `Email sender: ${email.from}\nReply-To: ${email.replyTo}\nSubject: ${email.subject}\n\n${email.body}`.trim();
      messageInput.value = combined.slice(0, 8000);
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));

      const result = analyze(messageInput.value);
      const fromDomain = domain(emailAddress(email.from));
      const replyDomain = domain(emailAddress(email.replyTo));
      const returnDomain = domain(emailAddress(email.returnPath));

      if (replyDomain && fromDomain && replyDomain !== fromDomain) {
        result.score = Math.min(100, result.score + 18);
        result.findings.unshift(`The Reply-To address uses a different domain (${replyDomain}) than the visible sender (${fromDomain}).`);
      }
      if (returnDomain && fromDomain && !returnDomain.endsWith(fromDomain) && !fromDomain.endsWith(returnDomain)) {
        result.score = Math.min(100, result.score + 10);
        result.findings.push('The hidden return address does not match the visible sender domain.');
      }
      if (/spf=fail|dkim=fail|dmarc=fail/i.test(email.authentication)) {
        result.score = Math.min(100, result.score + 25);
        result.findings.unshift('The email failed one or more sender-authentication checks.');
      }
      result.level = result.score >= 45 ? 'high' : result.score >= 20 ? 'medium' : 'low';
      renderResult(result);

      emailMeta.innerHTML = '';
      [['From', email.from || 'Unknown'], ['Subject', email.subject || '(No subject)'], ['Date', email.date || 'Unknown']].forEach(([label, value]) => {
        const strong = document.createElement('strong'); strong.textContent = label;
        const span = document.createElement('span'); span.textContent = value;
        emailMeta.append(strong, span);
      });
      emailMeta.hidden = false;
      status.textContent = 'Email imported and scored.';
      dialog.close();
    } catch (error) {
      console.error(error);
      status.textContent = 'We could not read this email file. Download the message again from Gmail and retry.';
    }
  }

  openButton.addEventListener('click', () => dialog.showModal());
  closeButton.addEventListener('click', () => dialog.close());
  input.addEventListener('change', event => importEmail(event.target.files[0]));
  ['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, event => {
    event.preventDefault(); dropZone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, event => {
    event.preventDefault(); dropZone.classList.remove('dragging');
  }));
  dropZone.addEventListener('drop', event => importEmail(event.dataTransfer.files[0]));
})();