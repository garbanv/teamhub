import nodemailer, { type Transporter } from "nodemailer";

type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

let transporter: Transporter | null = null;
let transporterKey = "";
let warnedMissingConfig = false;
let warnedPartialAuth = false;
let loggedConfig = false;

function readConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) {
    if (!warnedMissingConfig && process.env.NODE_ENV !== "test") {
      warnedMissingConfig = true;
      console.warn(
        "[email] SMTP_HOST and SMTP_FROM are not set; transactional email is disabled.",
      );
    }
    return null;
  }

  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  // Accept both names: SMTP_USER/SMTP_PASSWORD are Hub-native, while
  // SMTP_USERNAME/SMTP_PASS are common in existing Nodemailer configs.
  const user =
    process.env.SMTP_USERNAME?.trim() ||
    process.env.SMTP_USER?.trim() ||
    undefined;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || undefined;

  if (Boolean(user) !== Boolean(pass) && !warnedPartialAuth) {
    warnedPartialAuth = true;
    console.warn(
      "[email] SMTP username and password must both be set; one is missing.",
    );
  }

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure:
      process.env.SMTP_SECURE === "true" ||
      process.env.SMTP_SECURE === "1" ||
      port === 465,
    user,
    pass,
    from,
    replyTo: process.env.SMTP_REPLY_TO?.trim() || undefined,
  };
}

export function isEmailConfigured() {
  return readConfig() !== null;
}

function getTransporter() {
  const config = readConfig();
  if (!config) return null;

  const key = [
    config.host,
    config.port,
    config.secure,
    config.user ?? "",
    config.pass ?? "",
  ].join("|");

  if (!transporter || transporterKey !== key) {
    if (!loggedConfig) {
      loggedConfig = true;
      console.info(
        `[email] SMTP configured for ${config.host}:${config.port} (secure=${config.secure}, auth=${Boolean(config.user && config.pass)})`,
      );
    }
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      // Match the common VPS/Gmail configuration and avoid IPv6-only egress
      // surprises on hosts that route SMTP over IPv4.
      localAddress:
        process.env.SMTP_LOCAL_ADDRESS?.trim() || "0.0.0.0",
      auth:
        config.user && config.pass
          ? { user: config.user, pass: config.pass }
          : undefined,
      pool: true,
      maxConnections: 3,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    transporterKey = key;
  }

  return { transporter, config };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendEmailResult> {
  const transport = getTransporter();
  if (!transport) return { status: "not_configured" };

  try {
    await transport.transporter.sendMail({
      from: transport.config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: transport.config.replyTo,
    });
    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error";
    console.error("[email] send failed:", message);
    transporter?.close();
    transporter = null;
    transporterKey = "";
    return { status: "failed", error: message };
  }
}
