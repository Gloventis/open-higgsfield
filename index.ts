/**
 * Minimal Seedance 2.5 text-to-video example.
 *
 * Run it with the credentials loaded from .env.local (never committed):
 *   pnpm seedance
 *
 * HF_CREDENTIALS must hold "key-id:key-secret". It stays server-side: the
 * value is read from the environment at runtime and never printed.
 */
import {
  config,
  higgsfield,
  HiggsfieldError,
  type V2Response,
} from "@higgsfield/client/v2";

const MODEL = "bytedance/seedance-2.5/text-to-video";

const INPUT = {
  prompt: "A cinematic scene at sunset",
  duration: 5,
  resolution: "720p",
  aspect_ratio: "16:9",
  output_format: "mp4",
  generate_audio: true,
} as const;

function fail(message: string): never {
  console.error(`Generation did not succeed: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const credentials = process.env.HF_CREDENTIALS;
  if (!credentials) {
    fail(
      "HF_CREDENTIALS is not set. Add it to .env.local as key-id:key-secret.",
    );
  }

  config({ credentials });

  console.info(`Submitting ${MODEL} (${INPUT.duration}s, ${INPUT.resolution}, ${INPUT.aspect_ratio})...`);

  let result: V2Response;
  try {
    // withPolling waits for a terminal status instead of returning immediately.
    result = await higgsfield.subscribe(MODEL, {
      input: INPUT,
      withPolling: true,
    });
  } catch (error) {
    if (error instanceof HiggsfieldError) {
      fail(`${error.name}: ${error.message}`);
    }
    throw error;
  }

  // Terminal statuses other than "completed" are failures, not successes.
  switch (result.status) {
    case "completed":
      break;
    case "nsfw":
      fail(`request ${result.request_id} was moderated (status: nsfw).`);
    case "failed":
    case "queued":
    case "in_progress":
      fail(`request ${result.request_id} ended with status "${result.status}".`);
    default:
      fail(`request ${result.request_id} returned unknown status "${result.status}".`);
  }

  const videoUrl = result.video?.url;
  if (!videoUrl) {
    fail(`request ${result.request_id} completed without a video URL.`);
  }

  console.info(`Request ID: ${result.request_id}`);
  console.info(`Video URL: ${videoUrl}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
