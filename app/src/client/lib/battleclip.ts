import { showShareSheet, showToast } from '@devvit/web/client';
import type { BattleReport } from '../../shared/arena';
import { serializeBattleShareData } from '../../shared/battleshare';
import { uploadBattleClip } from './api';

export type BattleClip = Readonly<{
  blob: Blob;
  extension: 'mp4' | 'webm';
}>;

export type BattleClipRecorder = Readonly<{
  stop: () => Promise<BattleClip | null>;
  cancel: () => void;
}>;

const recordingFormats = Object.freeze([
  { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
  { mimeType: 'video/mp4', extension: 'mp4' },
] as const);

const selectRecordingFormat = () => {
  return recordingFormats.find(({ mimeType }) =>
    MediaRecorder.isTypeSupported(mimeType)
  );
};

/** Starts a bounded, silent recording of the already-rendering Phaser canvas. */
export const startBattleClipRecording = (
  canvas: HTMLCanvasElement
): BattleClipRecorder | null => {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof canvas.captureStream !== 'function'
  ) {
    return null;
  }
  const format = selectRecordingFormat();
  if (!format) return null;

  let stream: MediaStream | null = null;
  try {
    stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: format.mimeType,
      videoBitsPerSecond: 700_000,
    });
    const chunks: Blob[] = [];
    let cancelled = false;
    let settled = false;
    let maximumDurationTimer = 0;
    let resolveClip: (clip: BattleClip | null) => void = () => undefined;
    const clipPromise = new Promise<BattleClip | null>((resolve) => {
      resolveClip = resolve;
    });
    const releaseStream = (): void => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };
    const settle = (clip: BattleClip | null): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(maximumDurationTimer);
      releaseStream();
      resolveClip(clip);
    };

    recorder.addEventListener('dataavailable', (event) => {
      if (!cancelled && event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('error', () => settle(null), { once: true });
    recorder.addEventListener(
      'stop',
      () => {
        if (cancelled || chunks.length === 0) {
          settle(null);
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType });
        settle(
          blob.size > 0
            ? Object.freeze({ blob, extension: format.extension })
            : null
        );
      },
      { once: true }
    );
    recorder.start(500);
    maximumDurationTimer = window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, 22_000);

    return Object.freeze({
      stop: () => {
        if (recorder.state !== 'inactive') recorder.stop();
        return clipPromise;
      },
      cancel: () => {
        cancelled = true;
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          settle(null);
        }
      },
    });
  } catch {
    stream?.getTracks().forEach((track) => track.stop());
    return null;
  }
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Battle clip could not be encoded.'));
    });
    reader.addEventListener(
      'error',
      () => reject(reader.error ?? new Error('Battle clip could not be read.')),
      { once: true }
    );
    reader.readAsDataURL(blob);
  });
};

const copyClipLink = async (videoUrl: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(videoUrl);
    return true;
  } catch {
    return false;
  }
};

/** Uploads one finished clip, then shares the current Reddit post with it. */
export const shareHostedBattleClip = async (
  videoUrl: string,
  report: BattleReport
): Promise<boolean> => {
  const shareData = serializeBattleShareData(videoUrl);
  if (!shareData) {
    showToast('Reddit returned an invalid battle clip link.');
    return false;
  }

  const title = `${report.a.name} vs ${report.b.name}`;
  try {
    await showShareSheet({
      title,
      text: 'Watch this Scribbits battle, then draw your own.',
      data: shareData,
    });
    return true;
  } catch {
    if (await copyClipLink(videoUrl)) {
      showToast('Battle clip link copied.');
      return true;
    }
    showToast('The clip is ready, but sharing is unavailable here.');
    return false;
  }
};

export const shareBattleClip = async (
  clip: BattleClip,
  report: BattleReport
): Promise<string | null> => {
  showToast('Uploading your battle clip to Reddit…');
  const videoDataUrl = await blobToDataUrl(clip.blob);
  const result = await uploadBattleClip({ videoDataUrl });
  if (!result.ok) {
    showToast(result.error);
    return null;
  }
  return (await shareHostedBattleClip(result.data.videoUrl, report))
    ? result.data.videoUrl
    : null;
};
