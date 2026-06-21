(() => {
  const RULES = [
    { points: 25, reason: 'It asks for a password, PIN, or verification code.', pattern: /password|passcode|pin\b|one[- ]?time code|verification code|otp\b|2fa|security code/i },
    { points: 24, reason: 'It asks for an unusual payment method.', pattern: /gift card|bitcoin|crypto|wire transfer|western union|zelle|cash app|venmo|payment immediately/i },
    { points: 20, reason: 'It threatens account closure, arrest, or another serious consequence.', pattern: /account (?:will be )?(?:closed|locked|suspended)|arrest|legal action|warrant|disconnect(?:ed|ion)|penalty/i },
    { points: 16, reason: 'It pressures you to act immediately.', pattern: /urgent|immediately|right now|act now|today only|within \d+ hours?|final warning|do not delay/i },
    { points: 15, reason: 'It asks you to keep the message secret.', pattern: /keep (?:this|it) secret|do not tell|don'?t tell|confidential request|between us/i },
    { points: 14, reason: 'It claims you won money or a prize unexpectedly.', pattern: /you (?:have )?won|winner|lottery|prize|inheritance|refund waiting|claim your reward/i },
    { points: 14, reason: 'It asks you to confirm personal or financial information.', pattern: /confirm your (?:identity|account|bank|card)|social security|ssn\b|routing number|credit card|date of birth/i },
    { points: 12, reason: 'It uses language commonly found in fake delivery or invoice messages.', pattern: /package (?:could not|cannot) be delivered|delivery failed|unpaid invoice|overdue invoice|shipping fee/i },
    { points: 12, reason: 'It asks you to open a link to fix an account problem.', pattern: /click (?:here|the link)|verify (?:now|your account)|update your account|login immediately|sign in now/i },
    { points: 10, reason: 'It claims to be a boss, bank, government office, or support team.', pattern: /ceo|boss|manager|bank security|irs|social security administration|microsoft support|apple support|google support/i },
    { points: 10, reason: 'The preview contains a shortened or unusual web link.', pattern: /bit\.ly|tinyurl\.com|t\.co|goo\.gl|rb\.gy|https?:\/\/[^\s]+\.(?:zip|top|click|xyz|work|support)\b/i }
  ];

  function scoreMessage({ sender = '', subject = '', snippet = '' } = {}) {
    const text = `${sender}\n${subject}\n${snippet}`.trim();
    let score = 0;
    const reasons = [];

    RULES.forEach(rule => {
      if (rule.pattern.test(text)) {
        score += rule.points;
        reasons.push(rule.reason);
      }
    });

    if (/^[A-Z0-9 !?$%&*-]{12,}$/.test(subject.trim())) {
      score += 8;
      reasons.push('The subject uses excessive capital letters or alarm-style punctuation.');
    }

    if ((subject.match(/!/g) || []).length >= 3) {
      score += 6;
      reasons.push('The subject uses repeated exclamation marks to create pressure.');
    }

    score = Math.min(100, score);
    const level = score >= 45 ? 'red' : score >= 20 ? 'yellow' : 'green';

    return {
      score,
      level,
      reasons: reasons.length ? reasons : ['No major phishing warning signs were found in the visible sender, subject, or preview text.']
    };
  }

  window.SafeCircleScoring = { scoreMessage };
})();