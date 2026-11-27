import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Optional S3-compatible object storage (AWS S3, DigitalOcean Spaces, MinIO,
 * Cloudflare R2, Backblaze B2, ...). Configured with environment variables.
 * When it isn't configured, uploads are stored in Postgres as before.
 */
type StorageConfig = {
  client: S3Client;
  bucket: string;
  prefix: string;
};

let cached: StorageConfig | null | undefined;

function loadConfig(): StorageConfig | null {
  if (cached !== undefined) return cached;

  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    cached = null;
    return cached;
  }

  const rawEndpoint = process.env.S3_ENDPOINT?.trim();
  // Accept a bare host such as "ams3.digitaloceanspaces.com" as well as a full URL.
  const endpoint = rawEndpoint
    ? /^https?:\/\//i.test(rawEndpoint)
      ? rawEndpoint
      : `https://${rawEndpoint}`
    : undefined;
  const prefix = (process.env.S3_KEY_PREFIX ?? "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/*$/, "/");

  cached = {
    bucket,
    prefix: prefix === "/" ? "" : prefix,
    client: new S3Client({
      region: process.env.S3_REGION?.trim() || "us-east-1",
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId, secretAccessKey },
      // Many S3-compatible providers reject the newer default checksum headers.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
  return cached;
}

export function isObjectStorageEnabled() {
  return loadConfig() !== null;
}

function requireConfig() {
  const config = loadConfig();
  if (!config) throw new Error("Object storage is not configured.");
  return config;
}

/** Builds the object key for a workspace file (includes the optional prefix). */
export function buildObjectKey(workspaceId: string, fileId: string) {
  return `${loadConfig()?.prefix ?? ""}${workspaceId}/${fileId}`;
}

export async function putObject(input: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  const { client, bucket } = requireConfig();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ContentLength: input.body.length,
    }),
  );
}

/** Returns a web stream of the object, or null when it doesn't exist. */
export async function getObjectStream(key: string) {
  const { client, bucket } = requireConfig();
  try {
    const result = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!result.Body) return null;
    return {
      stream: result.Body.transformToWebStream(),
      contentLength: result.ContentLength,
    };
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw error;
  }
}

export async function deleteObject(key: string) {
  const { client, bucket } = requireConfig();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
