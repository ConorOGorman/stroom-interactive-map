const RESEND_API_URL = 'https://api.resend.com/emails';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service is not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const name = cleanText(body?.name, 80);
    const email = cleanText(body?.email, 160).toLowerCase();
    const cards = Array.isArray(body?.cards) ? body.cards.slice(0, 12) : [];
    const locations = Array.isArray(body?.locations) ? body.locations.slice(0, 8) : [];

    if (!name || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid name and email address' });
    }

    const from = process.env.EMAIL_FROM || 'STROOMpoint <onboarding@resend.dev>';
    const replyTo = process.env.EMAIL_REPLY_TO || undefined;
    const bcc = process.env.LEAD_NOTIFY_EMAIL || undefined;
    const subject = 'Your personal STROOMpoint map';

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        bcc,
        reply_to: replyTo,
        subject,
        html: renderEmail({ name, cards, locations }),
        text: renderTextEmail({ name, cards, locations }),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({ error: result.message || 'Email could not be sent' });
    }

    return res.status(200).json({ id: result.id });
  } catch (error) {
    return res.status(500).json({ error: 'Email could not be sent' });
  }
};

function renderEmail({ name, cards, locations }) {
  const cardList = cards.length
    ? cards.map((card) => `<li>${escapeHtml(card.label || card.id)}</li>`).join('')
    : '<li>No cards selected</li>';
  const locationList = locations.length
    ? locations.map((location) => `
      <tr>
        <td style="padding:18px 0;border-top:1px solid #e8eef1;">
          <strong style="font-size:17px;color:#3E3E3D;">${escapeHtml(location.name)}</strong>
          <p style="margin:6px 0;color:#505050;">${escapeHtml(location.town)} · ${escapeHtml(location.hours)}</p>
          <ul style="margin:8px 0 0;padding-left:18px;color:#3E3E3D;">
            ${(location.services || []).slice(0, 4).map((service) => `<li>${escapeHtml(service)}</li>`).join('')}
          </ul>
        </td>
      </tr>
    `).join('')
    : `
      <tr>
        <td style="padding:18px 0;border-top:1px solid #e8eef1;color:#505050;">
          We did not find a specific match yet, but the STROOMpoint team can help you find the right next step.
        </td>
      </tr>
    `;

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f4f8fa;font-family:Arial,sans-serif;color:#3E3E3D;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f8fa;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:26px 28px;background:linear-gradient(90deg,#077CB3,#00976E);color:#ffffff;">
                    <div style="font-size:24px;font-weight:700;letter-spacing:0.5px;">STROOMpoint</div>
                    <p style="margin:8px 0 0;font-size:15px;">Your personal Groene Hart opportunity map</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#3E3E3D;">Hi ${escapeHtml(name)},</h1>
                    <p style="margin:0 0 22px;line-height:1.6;color:#505050;">Here are the opportunities matched to the cards you selected at STROOMpoint.</p>
                    <h2 style="font-size:15px;text-transform:uppercase;color:#077CB3;letter-spacing:0.6px;">Your cards</h2>
                    <ul style="margin:0 0 24px;padding-left:20px;line-height:1.7;">${cardList}</ul>
                    <h2 style="font-size:15px;text-transform:uppercase;color:#00976E;letter-spacing:0.6px;">Matched locations</h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${locationList}</table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px;background:#f0f6f7;color:#505050;font-size:13px;line-height:1.5;">
                    This email was sent because you asked STROOMpoint to send your personal map.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function renderTextEmail({ name, cards, locations }) {
  const cardText = cards.length ? cards.map((card) => `- ${card.label || card.id}`).join('\n') : '- No cards selected';
  const locationText = locations.length
    ? locations.map((location) => [
      `${location.name}`,
      `${location.town} · ${location.hours}`,
      ...(location.services || []).slice(0, 4).map((service) => `- ${service}`),
    ].join('\n')).join('\n\n')
    : 'No specific match yet. The STROOMpoint team can help you find the right next step.';

  return `Hi ${name},

Here are the opportunities matched to the cards you selected at STROOMpoint.

Your cards:
${cardText}

Matched locations:
${locationText}
`;
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
