import { getAppUrl } from "./app-url";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 180);
}

function layout(input: {
  preview: string;
  heading: string;
  intro: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
}) {
  const body = input.body
    ? `<p style="margin:0 0 18px;color:#52525b;font-size:14px;line-height:1.7;">${input.body}</p>`
    : "";
  const button =
    input.ctaUrl && input.ctaLabel
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;"><tr><td style="border-radius:8px;background:#5b57e0;"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:11px 20px;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">${escapeHtml(input.ctaLabel)}</a></td></tr></table>`
      : "";
  const fallback = input.ctaUrl
    ? `<p style="margin:20px 0 0;color:#a1a1aa;font-size:11px;line-height:1.6;">Or open this link:<br /><a href="${escapeHtml(input.ctaUrl)}" style="color:#5b57e0;word-break:break-all;">${escapeHtml(input.ctaUrl)}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(input.preview)}</title>
  </head>
  <body style="margin:0;padding:32px 16px;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e7e4;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:22px 26px 0;">
                <span style="display:inline-block;width:24px;height:24px;border-radius:7px;background:#5b57e0;color:#ffffff;font-size:13px;font-weight:700;line-height:24px;text-align:center;">H</span>
                <span style="margin-left:8px;color:#18181b;font-size:13px;font-weight:650;vertical-align:middle;">Hub</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 26px 30px;">
                <h1 style="margin:0 0 10px;color:#18181b;font-size:22px;line-height:1.3;font-weight:650;letter-spacing:-0.02em;">${escapeHtml(input.heading)}</h1>
                <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.7;">${escapeHtml(input.intro)}</p>
                ${body}
                ${button}
                ${fallback}
                ${input.footnote ? `<p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #eeeeeb;color:#a1a1aa;font-size:11px;line-height:1.6;">${input.footnote}</p>` : ""}
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#a1a1aa;font-size:10px;">Sent by Hub</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildInviteEmail(input: {
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: string;
}) {
  const expires = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(input.expiresAt));

  return {
    subject: safeSubject(`Join ${input.workspaceName} on Hub`),
    text: `${input.inviterName} invited you to join ${input.workspaceName} on Hub.

Accept the invitation:
${input.inviteUrl}

This private link expires ${expires} and can only be used once. It only works for this email address.

If you weren't expecting this invitation, you can ignore this email.`,
    html: layout({
      preview: `${input.inviterName} invited you to ${input.workspaceName}`,
      heading: `Join ${input.workspaceName}`,
      intro: `${input.inviterName} invited you to collaborate on Hub.`,
      body: "Hub is a calm workspace for projects, tasks, docs, and the conversations around them.",
      ctaLabel: "Accept invitation",
      ctaUrl: input.inviteUrl,
      footnote: `This private link expires ${escapeHtml(expires)} and can only be used once. If you weren't expecting this invitation, you can ignore this email.`,
    }),
  };
}

export function buildNotificationEmail(input: {
  title: string;
  body?: string | null;
  recipientName: string;
  workspaceName: string;
  workspaceSlug: string;
  notificationType: string;
  taskId?: string | null;
}) {
  const destination = input.taskId
    ? getAppUrl(`/w/${input.workspaceSlug}/tasks/${input.taskId}`)
    : getAppUrl(`/w/${input.workspaceSlug}`);

  return {
    subject: safeSubject(input.title),
    text: `${input.title}

${input.body ?? ""}

Open Hub:
${destination}

You are receiving this because of your Hub notification settings for ${input.workspaceName}.`,
    html: layout({
      preview: input.title,
      heading: input.title,
      intro: `Hi ${input.recipientName}, there's something new in ${input.workspaceName}.`,
      body: input.body ? escapeHtml(input.body) : undefined,
      ctaLabel: "Open in Hub",
      ctaUrl: destination,
      footnote: `You are receiving this because of your Hub notification settings for ${escapeHtml(input.workspaceName)}.`,
    }),
  };
}
