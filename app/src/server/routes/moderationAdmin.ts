import { context, redis, reddit } from '@devvit/web/server';
import { Hono, type Context as HonoContext } from 'hono';
import type {
  BannedPlayerPage,
  ModerationActionRequest,
  ModerationActionResponse,
  ModerationQueuePage,
  UnbanPlayerResponse,
} from '../../shared/moderation';
import { isModerationAction } from '../../shared/moderation';
import {
  moderationAdminCss,
  moderationAdminHtml,
  moderationAdminJavaScript,
} from '../admin/moderationPage';
import { ensureCurrentArenaDay } from '../core/arenaStore';
import { runWithPlayerMutationLease } from '../core/dataDeletion';
import {
  banPlayer,
  dismissScribbitReports,
  getBannedPlayer,
  loadBannedPlayers,
  loadModerationQueue,
  unbanPlayer,
} from '../core/moderation';
import {
  removeAllPlayerScribbits,
  removeScribbitCompletely,
} from '../core/removal';
import { getAuthorizedSeasonAdmin } from '../core/seasonAdminAuthorization';
import { getScribbitOwner, loadScribbit } from '../core/scribbit';
import { randomUUID } from 'node:crypto';

export const moderationAdmin = new Hono();

const scribbitIdPattern = /^[A-Za-z0-9:_-]{4,90}$/;
const maximumActionBodyBytes = 2 * 1024;

const requireModerationAdmin = async (
  honoContext: HonoContext
): Promise<
  | { actor: NonNullable<Awaited<ReturnType<typeof getAuthorizedSeasonAdmin>>> }
  | { rejected: Response }
> => {
  try {
    const actor = await getAuthorizedSeasonAdmin();
    if (actor) return { actor };
  } catch (error) {
    console.error('Moderation authorization failed:', error);
  }
  return { rejected: honoContext.text('Not found.', 404) };
};

const parseModerationActionRequest = async (
  honoContext: HonoContext
): Promise<ModerationActionRequest | null> => {
  const contentLength = Number(honoContext.req.header('content-length') ?? '0');
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > maximumActionBodyBytes
  ) {
    return null;
  }
  const value: unknown = await honoContext.req.json().catch(() => null);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const scribbitId = Reflect.get(value, 'scribbitId');
  const action = Reflect.get(value, 'action');
  if (
    typeof scribbitId !== 'string' ||
    !scribbitIdPattern.test(scribbitId) ||
    !isModerationAction(action)
  ) {
    return null;
  }
  return { scribbitId, action };
};

moderationAdmin.get('/', async (honoContext) => {
  const authorization = await requireModerationAdmin(honoContext);
  if ('rejected' in authorization) return authorization.rejected;
  return honoContext.html(moderationAdminHtml);
});

moderationAdmin.get('/assets/moderation.css', async (honoContext) => {
  const authorization = await requireModerationAdmin(honoContext);
  if ('rejected' in authorization) return authorization.rejected;
  return honoContext.body(moderationAdminCss, 200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/css; charset=utf-8',
  });
});

moderationAdmin.get('/assets/moderation.js', async (honoContext) => {
  const authorization = await requireModerationAdmin(honoContext);
  if ('rejected' in authorization) return authorization.rejected;
  return honoContext.body(moderationAdminJavaScript, 200, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/javascript; charset=utf-8',
  });
});

moderationAdmin.get('/query', async (honoContext) => {
  const authorization = await requireModerationAdmin(honoContext);
  if ('rejected' in authorization) return authorization.rejected;
  try {
    return honoContext.json<ModerationQueuePage>(
      await loadModerationQueue(redis, {
        cursor: honoContext.req.query('cursor'),
        limit: 25,
      })
    );
  } catch (error) {
    console.error('Moderation queue failed:', error);
    return honoContext.json({ message: 'Reports could not be loaded.' }, 500);
  }
});

moderationAdmin.get('/bans', async (honoContext) => {
  const authorization = await requireModerationAdmin(honoContext);
  if ('rejected' in authorization) return authorization.rejected;
  try {
    return honoContext.json<BannedPlayerPage>({
      entries: await loadBannedPlayers(redis),
    });
  } catch (error) {
    console.error('Banned player list failed:', error);
    return honoContext.json(
      { message: 'Banned players could not be loaded.' },
      500
    );
  }
});

moderationAdmin.post('/action', async (honoContext) => {
  const authorization = await requireModerationAdmin(honoContext);
  if ('rejected' in authorization) return authorization.rejected;
  const request = await parseModerationActionRequest(honoContext);
  if (!request) {
    return honoContext.json({ message: 'Invalid moderation action.' }, 400);
  }

  try {
    if (request.action === 'dismiss') {
      await dismissScribbitReports(redis, request.scribbitId);
      return honoContext.json<ModerationActionResponse>({
        action: request.action,
        scribbitId: request.scribbitId,
        removedScribbits: 0,
        playerBanned: false,
      });
    }

    const scribbit = await loadScribbit(redis, request.scribbitId);
    const ownerUserId = await getScribbitOwner(redis, request.scribbitId);
    if (!scribbit || !ownerUserId || scribbit.isFounding) {
      return honoContext.json(
        { message: 'That reported Scribbit is no longer available.' },
        404
      );
    }
    if (ownerUserId === authorization.actor.userId) {
      return honoContext.json(
        { message: 'Moderators cannot take this action against themselves.' },
        400
      );
    }

    if (request.action === 'ban-player') {
      if (!context.subredditName) {
        return honoContext.json(
          { message: 'The subreddit context is unavailable.' },
          500
        );
      }
      const targetModerators = await reddit
        .getModerators({
          subredditName: context.subredditName,
          username: scribbit.artist,
          limit: 1,
          pageSize: 1,
        })
        .get(1);
      if (targetModerators.length > 0) {
        return honoContext.json(
          { message: 'Another subreddit moderator cannot be banned here.' },
          400
        );
      }
      await reddit.banUser({
        username: scribbit.artist,
        subredditName: context.subredditName,
        note: `Banned from Scribbits by ${authorization.actor.username}.`,
        reason: 'Scribbits moderation action',
        message:
          'You have been banned from Scribbits after moderator review of reported content.',
      });
    }

    const currentDay = await ensureCurrentArenaDay(redis, new Date());
    const mutation = await runWithPlayerMutationLease(
      redis,
      ownerUserId,
      randomUUID(),
      async () => {
        if (
          (await getScribbitOwner(redis, request.scribbitId)) !== ownerUserId
        ) {
          return { status: 'target-changed' as const, removedScribbits: 0 };
        }
        if (request.action === 'delete-scribbit') {
          await removeScribbitCompletely(redis, {
            ownerUserId,
            scribbitId: request.scribbitId,
            currentDay,
          });
          return { status: 'complete' as const, removedScribbits: 1 };
        }
        await banPlayer(redis, {
          userId: ownerUserId,
          username: scribbit.artist,
          moderatorUserId: authorization.actor.userId,
          moderatorUsername: authorization.actor.username,
          sourceScribbitId: request.scribbitId,
          bannedAtMs: Date.now(),
        });
        const removedScribbits = await removeAllPlayerScribbits(
          redis,
          ownerUserId,
          currentDay
        );
        return { status: 'complete' as const, removedScribbits };
      }
    );

    if (mutation.status === 'busy') {
      return honoContext.json(
        { message: 'That player is active. Try the action again.' },
        409
      );
    }
    if (mutation.status === 'lost') {
      return honoContext.json(
        { message: 'The moderation lock was lost. Try again.' },
        500
      );
    }
    if (mutation.value.status === 'target-changed') {
      return honoContext.json(
        {
          message: 'The reported Scribbit changed before moderation completed.',
        },
        409
      );
    }
    return honoContext.json<ModerationActionResponse>({
      action: request.action,
      scribbitId: request.scribbitId,
      removedScribbits: mutation.value.removedScribbits,
      playerBanned: request.action === 'ban-player',
    });
  } catch (error) {
    console.error('Moderation action failed:', error);
    return honoContext.json(
      { message: 'The moderation action could not be completed.' },
      500
    );
  }
});

moderationAdmin.post('/unban', async (honoContext) => {
  const authorization = await requireModerationAdmin(honoContext);
  if ('rejected' in authorization) return authorization.rejected;
  const value: unknown = await honoContext.req.json().catch(() => null);
  const userId =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? Reflect.get(value, 'userId')
      : undefined;
  if (typeof userId !== 'string' || !/^t2_[a-z0-9]+$/i.test(userId)) {
    return honoContext.json({ message: 'Invalid player unban request.' }, 400);
  }
  try {
    const record = await getBannedPlayer(redis, userId);
    if (!record) {
      return honoContext.json({ message: 'That player is not banned.' }, 404);
    }
    if (!context.subredditName) {
      return honoContext.json(
        { message: 'The subreddit context is unavailable.' },
        500
      );
    }
    await reddit.unbanUser(record.username, context.subredditName);
    await unbanPlayer(redis, userId);
    const response: UnbanPlayerResponse = {
      userId,
      username: record.username,
      unbanned: true,
    };
    return honoContext.json(response);
  } catch (error) {
    console.error('Player unban failed:', error);
    return honoContext.json(
      { message: 'The player could not be unbanned. Try again.' },
      500
    );
  }
});
