import { query } from "./db";
import { isEmailConfigured, sendEmail } from "./email";

const MAX_ATTEMPTS = 5;
const STALE_SENDING_MINUTES = 10;

type OutboxRow = {
  id: string;
  toEmail: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  attempts: number;
};

const globalForWorker = globalThis as unknown as {
  hubEmailWorkerStarted?: boolean;
};

export async function flushEmailOutbox(limit = 10) {
  if (!isEmailConfigured()) return 0;

  const { rows } = await query<OutboxRow>(
    `
      with candidates as (
        select id
        from email_outbox
        where
          (status = 'pending' and next_attempt_at <= now())
          or (
            status = 'sending'
            and processing_at < now() - ($2::int * interval '1 minute')
          )
        order by created_at asc
        limit $1
        for update skip locked
      )
      update email_outbox e
      set
        status = 'sending',
        attempts = e.attempts + 1,
        processing_at = now()
      from candidates c
      where e.id = c.id
      returning
        e.id,
        e.to_email as "toEmail",
        e.subject,
        e.text_body as "textBody",
        e.html_body as "htmlBody",
        e.attempts
    `,
    [limit, STALE_SENDING_MINUTES],
  );

  let sent = 0;
  for (const row of rows) {
    const result = await sendEmail({
      to: row.toEmail,
      subject: row.subject,
      text: row.textBody,
      html: row.htmlBody,
    });

    if (result.status === "sent") {
      await query(
        `
          update email_outbox
          set status = 'sent', sent_at = now(), processing_at = null, last_error = null
          where id = $1
        `,
        [row.id],
      );
      sent += 1;
      continue;
    }

    const error =
      result.status === "failed" ? result.error : "Email delivery is not configured.";
    if (result.status === "not_configured") {
      await query(
        `
          update email_outbox
          set status = 'pending', processing_at = null, next_attempt_at = now() + interval '5 minutes', last_error = $2
          where id = $1
        `,
        [row.id, error],
      );
      continue;
    }

    if (row.attempts >= MAX_ATTEMPTS) {
      await query(
        `
          update email_outbox
          set status = 'failed', processing_at = null, last_error = $2
          where id = $1
        `,
        [row.id, error.slice(0, 1000)],
      );
    } else {
      const delayMinutes = Math.min(60, 2 ** row.attempts);
      await query(
        `
          update email_outbox
          set
            status = 'pending',
            processing_at = null,
            next_attempt_at = now() + ($2::int * interval '1 minute'),
            last_error = $3
          where id = $1
        `,
        [row.id, delayMinutes, error.slice(0, 1000)],
      );
    }
  }

  return sent;
}

export function startEmailWorker() {
  if (globalForWorker.hubEmailWorkerStarted) return;
  globalForWorker.hubEmailWorkerStarted = true;

  const run = () => {
    void flushEmailOutbox().catch((error) => {
      console.error(
        "[email] worker failed:",
        error instanceof Error ? error.message : error,
      );
    });
  };

  run();
  const timer = setInterval(run, 15_000);
  timer.unref?.();
}
