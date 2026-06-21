(() => {
  const RULES = [
    { points: 32, reason: 'It asks for a password, PIN, or verification code.', pattern: /password|passcode|pin\b|one[- ]?time code|verification code|otp\b|2fa|security code/i },
    { points: 32, reason: 'It asks for an unusual payment method.', pattern: /gift card|apple gift card|google play card|bitcoin|crypto|wire transfer|western union|zelle|cash app|venmo|payment immediately/i },
    { points: 26, reason: 'It threatens account closure, arrest, or another serious consequence.', pattern: /account (?:will be )?(?:closed|locked|suspended)|arrest|legal action|warrant|disconnect(?:ed|ion)|penalty|access will be removed/i },
    { points: 20, reason: 'It pressures you to act immediately.', pattern: /urgent|immediately|right now|act now|today only|within \d+ hours?|final warning|do not delay|as soon as possible|quick favor|important request/i },
    { points: 20, reason: 'It asks you to keep the message secret.', pattern: /keep (?:this|it) secret|do not tell|don'?t tell|confidential request|between us|do not discuss/i },
    { points: 18, reason: 'It claims you won money or a prize unexpectedly.', pattern: /you (?:have )?won|winner|lottery|prize|inheritance|refund waiting|claim your reward|free reward/i },
    { points: 18, reason: 'It asks you to confirm personal or financial information.', pattern: /confirm your (?:identity|account|bank|card)|social security|ssn\b|routing number|credit card|date of birth|banking details/i },
    { points: 16, reason: 'It uses language commonly found in fake delivery or invoice messages.', pattern: /package (?:could not|cannot) be delivered|delivery failed|unpaid invoice|overdue invoice|shipping fee|missed delivery|invoice attached/i },
    { points: 16, reason: 'It asks you to open a link to fix an account problem.', pattern: /click (?:here|the link)|verify (?:now|your account)|update your account|login immediately|sign in now|review activity|confirm details/i },
    { points: 14, reason: 'It claims to be a boss, bank, government office, or support team.', pattern: /ceo|boss|manager|supervisor|bank security|irs|social security administration|microsoft support|apple support|google support|payroll|human resources/i },
    { points: 14, reason: 'The preview contains a shortened or unusual web link.', pattern: /bit\.ly|tinyurl\.com|t\.co|goo\.gl|rb\.gy|https?:\/\/[^\s]+\.(?:zip|top|click|xyz|work|support)\b/i },
    { points: 12, reason: 'It asks you to buy something and send codes or card details.', pattern: /buy (?:a |some |\d+ )?(?:gift )?cards?|scratch (?:the )?back|send (?:me )?(?:the )?(?:card )?(?:numbers?|codes?|pins?)/i },
    { points: 10, reason: 'It uses vague pressure without explaining the request clearly.', pattern: /need your help|need you to handle|can'?t talk|in a meeting|respond quickly|are you available/i }
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

    if (/^[A-Z0-9 !?$%&*-]{10,}$/.test(subject.trim())) {
      score += 10;
      reasons.push('The subject uses excessive capital letters or alarm-style punctuation.');
    }

    if ((subject.match(/!/g) || []).length >= 2) {
      score += 8;
      reasons.push('The subject uses repeated exclamation marks to create pressure.');
    }

    if (!sender.includes('@') && /support|security|bank|billing|payroll|manager|boss/i.test(sender)) {
      score += 8;
      reasons.push('The visible sender name may be impersonating a trusted organization or person.');
    }

    score = Math.min(100, score);
    const level = score >= 30 ? 'red' : score >= 10 ? 'yellow' : 'green';

    return {
      score,
      level,
      reasons: reasons.length ? reasons : ['No major phishing warning signs were found in the visible sender, subject, or preview text.']
    };
  }

  window.SafeCircleScoring = { scoreMessage };
})();