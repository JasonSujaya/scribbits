import { randomUUID } from 'node:crypto';
import { Hono, type Context as HonoContext } from 'hono';
import type {
  Form,
  FormRequest,
  MenuItemRequest,
  SettingsValidationRequest,
  SettingsValidationResponse,
  UiResponse,
} from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { ensureCurrentArenaDay } from '../core/arenaStore';
import {
  addSeasonEvent,
  cancelSeason,
  createSeasonDraft,
  describeSeasonCatalog,
  finalizeSeason,
  loadSeasonCatalog,
  pauseSeason,
  removeSeasonEvent,
  resetSeasonOne,
  resumeSeason,
  scheduleSeason,
  SeasonStateError,
  updateSeasonDraft,
  type SeasonActor,
} from '../core/season';
import {
  getAuthorizedSeasonAdmin,
  parseSeasonAdminUserIds,
} from '../core/seasonAdminAuthorization';
import {
  isSeasonEventRuleSetId,
  SEASON_EVENT_RULE_SET_IDS,
  type SeasonEvent,
} from '../../shared/season';

// Keep this administrative router's exported type bounded. Inferring every
// generic form response into Hono's route schema exceeds TypeScript's depth.
export const seasonAdmin: Hono = new Hono();

type ManageSeasonsFormData = {
  action: string[];
  seasonId: string;
  seasonName: string;
  campaignName: string;
  startArenaDay: number;
  eventId: string;
  eventName: string;
  eventStartArenaDay: number;
  eventEndArenaDay: number;
  eventRuleSetId: string[];
  reason: string;
  confirm: boolean;
  resetConfirmation: string;
};

type SeasonAdminCommandContext = Readonly<{
  actor: SeasonActor;
  arenaDay: number;
  recordedAtMs: number;
  operationId: string;
}>;

const selectionValue = (value: unknown): string | undefined => {
  if (!Array.isArray(value) || value.length !== 1) return undefined;
  return typeof value[0] === 'string' ? value[0] : undefined;
};

const cleanText = (
  value: unknown,
  maximumLength: number
): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= maximumLength
    ? cleaned
    : undefined;
};

const positiveInteger = (value: unknown): number | undefined => {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : undefined;
};

const requireConfirmation = (request: ManageSeasonsFormData): void => {
  if (request.confirm !== true) {
    throw new SeasonStateError('Confirm this administrative action first.');
  }
};

const buildManageSeasonsForm = (
  catalogDescription: string,
  defaults: ManageSeasonsFormData
): Form => ({
  title: 'Manage Scribbits Seasons',
  description: `Ranking seasons are exactly 60 UTC Arena days. Active scoring rules cannot be edited.\n\n${catalogDescription}`,
  acceptLabel: 'Apply',
  cancelLabel: 'Cancel',
  fields: [
    {
      type: 'select',
      name: 'action',
      label: 'Action',
      required: true,
      multiSelect: false,
      defaultValue: defaults.action,
      options: [
        { label: 'Create draft', value: 'create-draft' },
        { label: 'Update draft', value: 'update-draft' },
        { label: 'Schedule season', value: 'schedule' },
        { label: 'Add event', value: 'add-event' },
        { label: 'Remove event', value: 'remove-event' },
        { label: 'Pause ranking', value: 'pause' },
        { label: 'Resume ranking', value: 'resume' },
        { label: 'Finalize ended season', value: 'finalize' },
        { label: 'Cancel future season', value: 'cancel' },
        { label: 'Reset Season 1', value: 'reset-season-one' },
      ],
    },
    {
      type: 'string',
      name: 'seasonId',
      label: 'Season ID',
      defaultValue: defaults.seasonId,
      helpText: 'Required for every action except Create draft.',
    },
    {
      type: 'string',
      name: 'seasonName',
      label: 'Season name',
      defaultValue: defaults.seasonName,
    },
    {
      type: 'string',
      name: 'campaignName',
      label: 'Campaign name',
      defaultValue: defaults.campaignName,
    },
    {
      type: 'number',
      name: 'startArenaDay',
      label: 'Start Arena day',
      defaultValue: defaults.startArenaDay,
      helpText: 'The server calculates the end as start + 59.',
    },
    {
      type: 'string',
      name: 'eventId',
      label: 'Event ID',
      defaultValue: defaults.eventId,
      placeholder: 'opening-rumble',
    },
    {
      type: 'string',
      name: 'eventName',
      label: 'Event name',
      defaultValue: defaults.eventName,
    },
    {
      type: 'number',
      name: 'eventStartArenaDay',
      label: 'Event start Arena day',
      defaultValue: defaults.eventStartArenaDay,
    },
    {
      type: 'number',
      name: 'eventEndArenaDay',
      label: 'Event end Arena day',
      defaultValue: defaults.eventEndArenaDay,
    },
    {
      type: 'select',
      name: 'eventRuleSetId',
      label: 'Event rules',
      multiSelect: false,
      defaultValue: defaults.eventRuleSetId,
      options: SEASON_EVENT_RULE_SET_IDS.map((ruleSetId) => ({
        label:
          ruleSetId === 'double-clout' ? 'Double season points' : 'Standard',
        value: ruleSetId,
      })),
    },
    {
      type: 'paragraph',
      name: 'reason',
      label: 'Admin reason',
      required: true,
      defaultValue: defaults.reason,
      helpText: 'Saved permanently in the season audit log.',
    },
    {
      type: 'boolean',
      name: 'confirm',
      label: 'Confirm this administrative action',
      defaultValue: false,
    },
    {
      type: 'string',
      name: 'resetConfirmation',
      label: 'Reset confirmation',
      defaultValue: defaults.resetConfirmation,
      placeholder: 'RESET SEASON 1',
      helpText: 'Required only for Reset Season 1.',
    },
  ],
});

const runSeasonAdminCommand = async (
  request: ManageSeasonsFormData,
  commandContext: SeasonAdminCommandContext
): Promise<string> => {
  const action = selectionValue(request.action);
  const reason = cleanText(request.reason, 160);
  if (!action) throw new SeasonStateError('Choose one season action.');
  if (!reason) throw new SeasonStateError('An admin reason is required.');

  const common = {
    actor: commandContext.actor,
    operationId: commandContext.operationId,
    recordedAtMs: commandContext.recordedAtMs,
  };

  if (action === 'create-draft') {
    const name = cleanText(request.seasonName, 48);
    const campaignName = cleanText(request.campaignName, 64);
    const startArenaDay = positiveInteger(request.startArenaDay);
    if (!name || !campaignName || !startArenaDay) {
      throw new SeasonStateError(
        'Season name, campaign name, and start Arena day are required.'
      );
    }
    const season = await createSeasonDraft(redis, {
      ...common,
      name,
      campaignName,
      startArenaDay,
      reason,
    });
    return `${season.id} draft created.`;
  }

  if (action === 'reset-season-one') {
    requireConfirmation(request);
    if (
      typeof request.resetConfirmation !== 'string' ||
      request.resetConfirmation.trim() !== 'RESET SEASON 1'
    ) {
      throw new SeasonStateError('Type RESET SEASON 1 to confirm the reset.');
    }
    const season = await resetSeasonOne(redis, {
      ...common,
      currentArenaDay: commandContext.arenaDay,
      reason,
    });
    return `${season.name} reset. It starts on Arena day ${season.startArenaDay}.`;
  }

  const seasonId = cleanText(request.seasonId, 32);
  if (!seasonId) throw new SeasonStateError('Season ID is required.');

  if (action === 'update-draft') {
    const name = cleanText(request.seasonName, 48);
    const campaignName = cleanText(request.campaignName, 64);
    const startArenaDay = positiveInteger(request.startArenaDay);
    if (!name || !campaignName || !startArenaDay) {
      throw new SeasonStateError(
        'Season name, campaign name, and start Arena day are required.'
      );
    }
    await updateSeasonDraft(redis, {
      ...common,
      seasonId,
      name,
      campaignName,
      startArenaDay,
      reason,
    });
    return `${seasonId} draft updated.`;
  }

  if (action === 'add-event') {
    const eventId = cleanText(request.eventId, 48);
    const eventName = cleanText(request.eventName, 48);
    const startArenaDay = positiveInteger(request.eventStartArenaDay);
    const endArenaDay = positiveInteger(request.eventEndArenaDay);
    const ruleSetId = selectionValue(request.eventRuleSetId);
    if (
      !eventId ||
      !eventName ||
      !startArenaDay ||
      !endArenaDay ||
      !isSeasonEventRuleSetId(ruleSetId)
    ) {
      throw new SeasonStateError(
        'Complete every event field with valid values.'
      );
    }
    const event: SeasonEvent = {
      id: eventId,
      name: eventName,
      startArenaDay,
      endArenaDay,
      ruleSetId,
    };
    await addSeasonEvent(redis, {
      ...common,
      seasonId,
      event,
      currentArenaDay: commandContext.arenaDay,
      reason,
    });
    return `${eventId} added to ${seasonId}.`;
  }

  if (action === 'remove-event') {
    requireConfirmation(request);
    const eventId = cleanText(request.eventId, 48);
    if (!eventId) throw new SeasonStateError('Event ID is required.');
    await removeSeasonEvent(redis, {
      ...common,
      seasonId,
      eventId,
      currentArenaDay: commandContext.arenaDay,
      reason,
    });
    return `${eventId} removed from ${seasonId}.`;
  }

  if (action === 'schedule') {
    requireConfirmation(request);
    await scheduleSeason(redis, {
      ...common,
      seasonId,
      currentArenaDay: commandContext.arenaDay,
      reason,
    });
    return `${seasonId} scheduled.`;
  }

  if (action === 'pause') {
    requireConfirmation(request);
    await pauseSeason(redis, {
      ...common,
      seasonId,
      currentArenaDay: commandContext.arenaDay,
      reason,
    });
    return `${seasonId} ranking paused.`;
  }

  if (action === 'resume') {
    requireConfirmation(request);
    await resumeSeason(redis, {
      ...common,
      seasonId,
      currentArenaDay: commandContext.arenaDay,
      reason,
    });
    return `${seasonId} ranking resumed.`;
  }

  if (action === 'finalize') {
    requireConfirmation(request);
    await finalizeSeason(redis, {
      ...common,
      seasonId,
      currentArenaDay: commandContext.arenaDay,
      reason,
    });
    return `${seasonId} standings finalized.`;
  }

  if (action === 'cancel') {
    requireConfirmation(request);
    await cancelSeason(redis, {
      ...common,
      seasonId,
      currentArenaDay: commandContext.arenaDay,
      reason,
    });
    return `${seasonId} cancelled.`;
  }

  throw new SeasonStateError('That season action is not supported.');
};

const openSeasonManagement = async (c: HonoContext): Promise<Response> => {
  try {
    const request = await c.req.json<MenuItemRequest>().catch(() => undefined);
    if (
      request?.location !== 'subreddit' ||
      !context.subredditId ||
      request.targetId !== context.subredditId
    ) {
      return c.json<UiResponse>(
        { showToast: 'Invalid season-management request.' },
        200
      );
    }
    const actor = await getAuthorizedSeasonAdmin();
    if (!actor) {
      return c.json<UiResponse>(
        { showToast: 'Season controls are restricted.' },
        200
      );
    }
    const now = new Date();
    const arenaDay = await ensureCurrentArenaDay(redis, now);
    const catalog = await loadSeasonCatalog(redis);
    const selected =
      [...catalog]
        .reverse()
        .find((season) => season.lifecycle !== 'cancelled') ?? null;
    const nextStartArenaDay = selected ? selected.endArenaDay + 1 : arenaDay;
    const selectedDraft = selected?.lifecycle === 'draft' ? selected : null;
    const defaults: ManageSeasonsFormData = {
      action: [selectedDraft ? 'update-draft' : 'create-draft'],
      seasonId: selected?.id ?? '',
      seasonName: selectedDraft?.name ?? `Season ${catalog.length + 1}`,
      campaignName: selectedDraft?.campaignName ?? 'Next Campaign',
      startArenaDay: selectedDraft?.startArenaDay ?? nextStartArenaDay,
      eventId: '',
      eventName: '',
      eventStartArenaDay: nextStartArenaDay,
      eventEndArenaDay: nextStartArenaDay,
      eventRuleSetId: ['standard'],
      reason: '',
      confirm: false,
      resetConfirmation: '',
    };
    return c.json<UiResponse<ManageSeasonsFormData>>(
      {
        showForm: {
          name: 'manageSeasons',
          form: buildManageSeasonsForm(
            describeSeasonCatalog(catalog, arenaDay),
            defaults
          ),
          data: defaults,
        },
      },
      200
    );
  } catch (error) {
    console.error('Opening season controls failed:', error);
    return c.json<UiResponse>(
      { showToast: 'Season controls could not be opened.' },
      200
    );
  }
};

seasonAdmin.post('/seasons-manage', openSeasonManagement);

seasonAdmin.post('/seasons-submit', async (c) => {
  try {
    const actor = await getAuthorizedSeasonAdmin();
    if (!actor) {
      return c.json<UiResponse>(
        { showToast: 'Season controls are restricted.' },
        200
      );
    }
    const request = await c.req
      .json<FormRequest<ManageSeasonsFormData>>()
      .catch(() => undefined);
    if (!request) {
      return c.json<UiResponse>(
        { showToast: 'The season command was invalid.' },
        200
      );
    }
    const now = new Date();
    const message = await runSeasonAdminCommand(request, {
      actor,
      arenaDay: await ensureCurrentArenaDay(redis, now),
      recordedAtMs: now.getTime(),
      operationId: randomUUID(),
    });
    return c.json<UiResponse>(
      { showToast: { text: message, appearance: 'success' } },
      200
    );
  } catch (error) {
    const message =
      error instanceof SeasonStateError
        ? error.message
        : 'The season command failed.';
    if (!(error instanceof SeasonStateError)) {
      console.error('Season command failed:', error);
    }
    return c.json<UiResponse>({ showToast: message }, 200);
  }
});

seasonAdmin.post('/season-admin-user-ids-validate', async (c) => {
  const request = await c.req
    .json<SettingsValidationRequest<string>>()
    .catch(() => undefined);
  const valid = Boolean(parseSeasonAdminUserIds(request?.value));
  return c.json<SettingsValidationResponse>(
    valid
      ? { success: true }
      : {
          success: false,
          error:
            'Enter one or more comma-separated Reddit IDs starting with t2_.',
        },
    200
  );
});
