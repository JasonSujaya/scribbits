// Versioned, immutable presentation copy for the deterministic Inkcast replay.
// Every bank has an explicit token contract and stable line IDs; bank sizes
// vary from three to five according to how often that fact can recur.
// Combat, rewards, and transcript facts remain owned by the authoritative server.

import type { PrimaryPower } from '../combat/types';
import { hashContentKey } from './deterministic';

export type InkcastCommentaryToken =
  | 'actor'
  | 'target'
  | 'source'
  | 'amount'
  | 'move'
  | 'moveA'
  | 'moveB';

export type InkcastMissPower = Exclude<PrimaryPower, 'colorburst'>;

export type InkcastGeneralCommentaryBankId =
  | 'general.battle-start'
  | 'general.normal-hit'
  | 'general.critical-hit'
  | 'general.burn'
  | 'general.barrier-created'
  | 'general.barrier-hit'
  | 'general.barrier-broken'
  | 'general.ink-pressure'
  | 'general.nib-recoil'
  | 'general.arena-shrink'
  | 'general.echo-created'
  | 'general.echo-fired'
  | 'general.echo-shattered'
  | 'general.late-fight';

export type InkcastPowerCommentaryBankId =
  | `power.${PrimaryPower}.telegraph`
  | `power.${InkcastMissPower}.miss`
  | `power.${PrimaryPower}.hit`;

export type InkcastCommentaryBankId =
  | InkcastPowerCommentaryBankId
  | InkcastGeneralCommentaryBankId;

export type InkcastCommentaryVariant = Readonly<{
  id: string;
  template: string;
}>;

export type InkcastCommentaryBank = Readonly<{
  id: InkcastCommentaryBankId;
  allowedTokens: readonly InkcastCommentaryToken[];
  requiredTokens: readonly InkcastCommentaryToken[];
  variants: readonly InkcastCommentaryVariant[];
}>;

export type InkcastCommentaryPackValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
  bankCount: number;
  lineCount: number;
}>;

export type InkcastCommentaryTemplateValues = Readonly<
  Partial<Record<InkcastCommentaryToken, string | number>>
>;

// v2 keeps the stable line IDs while replacing internal combat jargon with
// short player-facing sentences. The selection seed changes deliberately so
// old and new wording do not pretend to be the same presentation pack.
export const INKCAST_COMMENTARY_PACK_VERSION = 2;
export const INKCAST_COMMENTARY_EXPECTED_LINE_COUNT = 104;

export const INKCAST_COMMENTARY_BANK_IDS: readonly InkcastCommentaryBankId[] =
  Object.freeze([
    'power.inkquake.telegraph',
    'power.inkquake.miss',
    'power.inkquake.hit',
    'power.nib_halo.telegraph',
    'power.nib_halo.miss',
    'power.nib_halo.hit',
    'power.smearstep.telegraph',
    'power.smearstep.miss',
    'power.smearstep.hit',
    'power.colorburst.telegraph',
    'power.colorburst.hit',
    'general.battle-start',
    'general.normal-hit',
    'general.critical-hit',
    'general.burn',
    'general.barrier-created',
    'general.barrier-hit',
    'general.barrier-broken',
    'general.ink-pressure',
    'general.nib-recoil',
    'general.arena-shrink',
    'general.echo-created',
    'general.echo-fired',
    'general.echo-shattered',
    'general.late-fight',
  ]);

const EXPECTED_BANK_COUNT = 25;
const MAXIMUM_TEMPLATE_LENGTH = 110;
const MAXIMUM_RENDERED_LENGTH = 110;
const BANK_ID_PATTERN =
  /^(?:power\.(?:inkquake|nib_halo|smearstep|colorburst)\.(?:telegraph|hit)|power\.(?:inkquake|nib_halo|smearstep)\.miss|general\.[a-z]+(?:-[a-z]+)*)$/;
const VARIANT_ID_PATTERN = /^v1(?:\.[a-z0-9_]+(?:-[a-z0-9]+)*)+$/;
const TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const FORBIDDEN_OUTCOME_OR_REWARD_CLAIM =
  /\b(?:winner|winning|wins|won|victory|victorious|defeat|defeated|loser|loses|lost|rewards?|xp|clout|payout|prizes?|odds|guarantee(?:d|s)?)\b/i;
const FORBIDDEN_MISS_MECHANIC_CLAIM =
  /\b(?:dodg(?:e|ed|es|ing)|evad(?:e|ed|es|ing)|sidestep(?:s|ped|ping)?|counter(?:s|ed|ing)?|dead zone)\b/i;
const FORBIDDEN_ACTOR_WIDE_MISS_CLAIM =
  /(?:no damage from \{actor\}|\{actor\} (?:deals?|does) no damage)/i;
const TRUTHFUL_MISS_RESULT =
  /\b(?:miss(?:es|ed)?|no (?:clean )?hit|does not (?:hit|land)|without (?:a clean )?hit(?:ting)?)\b/i;
const FORBIDDEN_ARENA_SHRINK_CLAIM =
  /\b(?:collisions?|hide|hiding|nowhere|damage|hits?|crush(?:ed|es|ing)?)\b/i;
const REQUIRED_ARENA_SHRINK_TRUTH =
  /\b(?:arena|edges?|fold(?:s|ed|ing)?|shrink(?:s|ing)?)\b/i;
const FORBIDDEN_INK_PRESSURE_TIMING_CLAIM =
  /\b(?:refresh(?:ed|es|ing)?|recharge(?:d|s|ing)?|cooldowns?|immediate(?:ly)?|pending|queued|banks?|one more power)\b/i;
const FORBIDDEN_LATE_FIGHT_CLAIM = /\bpage speeds? up\b/i;
const REQUIRED_LATE_FIGHT_TRUTH = /\b(?:cooldowns?|recharge)\b/i;
const MAXIMUM_TEMPLATE_VALUES: Readonly<
  Record<InkcastCommentaryToken, string | number>
> = Object.freeze({
  actor: 'M'.repeat(24),
  target: 'M'.repeat(24),
  source: 'M'.repeat(32),
  amount: 9999,
  move: 'Prism Tempest',
  moveA: 'Prism Tempest',
  moveB: 'Wildfire Bloom',
});

function defineVariant(id: string, template: string): InkcastCommentaryVariant {
  return Object.freeze({ id, template });
}

function defineBank(
  id: InkcastCommentaryBankId,
  allowedTokens: readonly InkcastCommentaryToken[],
  requiredTokens: readonly InkcastCommentaryToken[],
  variants: readonly InkcastCommentaryVariant[]
): InkcastCommentaryBank {
  return Object.freeze({
    id,
    allowedTokens: Object.freeze([...allowedTokens]),
    requiredTokens: Object.freeze([...requiredTokens]),
    variants: Object.freeze([...variants]),
  });
}

export const INKCAST_COMMENTARY_BANKS: readonly InkcastCommentaryBank[] =
  Object.freeze([
    defineBank(
      'power.inkquake.telegraph',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.inkquake.telegraph.page-load',
          '{actor} gets ready to use {move}.'
        ),
        defineVariant(
          'v1.inkquake.telegraph.floor-ripple',
          '{actor} starts charging {move}.'
        ),
        defineVariant(
          'v1.inkquake.telegraph.fresh-ink',
          '{actor} is preparing {move}.'
        ),
        defineVariant(
          'v1.inkquake.telegraph.underfoot',
          '{actor} is about to use {move}.'
        ),
        defineVariant(
          'v1.inkquake.telegraph.broad-ring',
          '{actor} winds up {move}.'
        ),
      ]
    ),
    defineBank(
      'power.inkquake.miss',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.inkquake.miss.clean-ring',
          "{actor}'s {move} misses."
        ),
        defineVariant(
          'v1.inkquake.miss.empty-paper',
          '{actor} uses {move}, but it misses.'
        ),
        defineVariant(
          'v1.inkquake.miss.ring-expires',
          '{move} from {actor} does not hit.'
        ),
        defineVariant(
          'v1.inkquake.miss.wide-ring',
          '{actor} tries {move}, but it does not hit.'
        ),
      ]
    ),
    defineBank(
      'power.inkquake.hit',
      ['source', 'target', 'amount'],
      ['source', 'target', 'amount'],
      [
        defineVariant(
          'v1.inkquake.hit.page-buckle',
          "{source}'s shockwave hits {target} for {amount}."
        ),
        defineVariant(
          'v1.inkquake.hit.ringing-impact',
          "{target} takes {amount} damage from {source}'s shockwave."
        ),
        defineVariant(
          'v1.inkquake.hit.ripple-impact',
          '{source} catches {target} with a shockwave for {amount}.'
        ),
        defineVariant(
          'v1.inkquake.hit.folded-lane',
          '{source} sends a shockwave into {target} for {amount}.'
        ),
        defineVariant(
          'v1.inkquake.hit.point-tremor',
          '{source} deals {amount} shockwave damage to {target}.'
        ),
      ]
    ),
    defineBank(
      'power.nib_halo.telegraph',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.nib_halo.telegraph.uncapped-quills',
          '{actor} gets three quills ready for {move}.'
        ),
        defineVariant(
          'v1.nib_halo.telegraph.orbit-start',
          '{actor} starts spinning three quills with {move}.'
        ),
        defineVariant(
          'v1.nib_halo.telegraph.live-nibs',
          '{actor} brings out three quills for {move}.'
        ),
        defineVariant(
          'v1.nib_halo.telegraph.sharpened-ring',
          '{actor} prepares three quills with {move}.'
        ),
        defineVariant(
          'v1.nib_halo.telegraph.three-points',
          '{actor} is ready to use {move}.'
        ),
      ]
    ),
    defineBank(
      'power.nib_halo.miss',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.nib_halo.miss.clean-quills',
          "{actor}'s {move} misses its target."
        ),
        defineVariant(
          'v1.nib_halo.miss.circle-out',
          '{actor} uses {move}, but no hit lands.'
        ),
        defineVariant(
          'v1.nib_halo.miss.nib-contact',
          '{move} does not hit for {actor}.'
        ),
        defineVariant(
          'v1.nib_halo.miss.orbit-complete',
          '{actor} finishes {move}, but it misses.'
        ),
      ]
    ),
    defineBank(
      'power.nib_halo.hit',
      ['source', 'target', 'amount'],
      ['source', 'target', 'amount'],
      [
        defineVariant(
          'v1.nib_halo.hit.quill-clip',
          "{source}'s quills hit {target} for {amount}."
        ),
        defineVariant(
          'v1.nib_halo.hit.orbit-connect',
          "{target} takes {amount} damage from {source}'s quills."
        ),
        defineVariant(
          'v1.nib_halo.hit.orbiting-ink',
          '{source} catches {target} with a quill for {amount}.'
        ),
        defineVariant(
          'v1.nib_halo.hit.quill-meet',
          '{source} sends a quill into {target} for {amount}.'
        ),
        defineVariant(
          'v1.nib_halo.hit.three-quill-mark',
          '{source} deals {amount} quill damage to {target}.'
        ),
      ]
    ),
    defineBank(
      'power.smearstep.telegraph',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.smearstep.telegraph.two-step',
          '{actor} gets ready to dash with {move}.'
        ),
        defineVariant(
          'v1.smearstep.telegraph.escape-line',
          '{actor} prepares to move fast with {move}.'
        ),
        defineVariant(
          'v1.smearstep.telegraph.predicted-lane',
          '{actor} is about to dash with {move}.'
        ),
        defineVariant(
          'v1.smearstep.telegraph.loaded-dashes',
          '{actor} gets two quick dashes ready for {move}.'
        ),
        defineVariant(
          'v1.smearstep.telegraph.quick-lanes',
          '{actor} starts moving into {move}.'
        ),
      ]
    ),
    defineBank(
      'power.smearstep.miss',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.smearstep.miss.clean-pass',
          '{actor} dashes with {move}, but misses.'
        ),
        defineVariant(
          'v1.smearstep.miss.two-dashes',
          "{actor}'s {move} does not land."
        ),
        defineVariant(
          'v1.smearstep.miss.empty-line',
          '{actor} uses {move}, but the attack misses.'
        ),
        defineVariant(
          'v1.smearstep.miss.dry-streak',
          '{actor} tries {move}, but no hit lands.'
        ),
      ]
    ),
    defineBank(
      'power.smearstep.hit',
      ['source', 'target', 'amount'],
      ['source', 'target', 'amount'],
      [
        defineVariant(
          'v1.smearstep.hit.dash-through',
          "{source}'s dash hits {target} for {amount}."
        ),
        defineVariant(
          'v1.smearstep.hit.lane-catch',
          "{target} takes {amount} damage from {source}'s dash."
        ),
        defineVariant(
          'v1.smearstep.hit.two-step-ink',
          '{source} catches {target} with a dash for {amount}.'
        ),
        defineVariant(
          'v1.smearstep.hit.ink-pass',
          '{source} dashes into {target} for {amount}.'
        ),
        defineVariant(
          'v1.smearstep.hit.page-streak',
          '{source} deals {amount} dash damage to {target}.'
        ),
      ]
    ),
    defineBank(
      'power.colorburst.telegraph',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.colorburst.telegraph.mixed-page',
          '{actor} gathers color for {move}.'
        ),
        defineVariant(
          'v1.colorburst.telegraph.wide-cone',
          '{actor} gets ready for {move}.'
        ),
        defineVariant(
          'v1.colorburst.telegraph.loaded-color',
          '{actor} prepares a bright {move} attack.'
        ),
        defineVariant(
          'v1.colorburst.telegraph.palette-flash',
          '{actor} is ready to launch {move}.'
        ),
        defineVariant(
          'v1.colorburst.telegraph.color-fan',
          '{actor} charges up {move}.'
        ),
      ]
    ),
    defineBank(
      'power.colorburst.hit',
      ['source', 'target', 'amount'],
      ['source', 'target', 'amount'],
      [
        defineVariant(
          'v1.colorburst.hit.color-splash',
          "{source}'s color blast hits {target} for {amount}."
        ),
        defineVariant(
          'v1.colorburst.hit.cone-catch',
          "{target} takes {amount} damage from {source}'s color blast."
        ),
        defineVariant(
          'v1.colorburst.hit.color-fan',
          '{source} catches {target} with a color blast for {amount}.'
        ),
        defineVariant(
          'v1.colorburst.hit.palette-pop',
          '{source} sends a color blast into {target} for {amount}.'
        ),
        defineVariant(
          'v1.colorburst.hit.color-wash',
          '{source} deals {amount} color damage to {target}.'
        ),
      ]
    ),
    defineBank(
      'general.battle-start',
      ['moveA', 'moveB'],
      ['moveA', 'moveB'],
      [
        defineVariant(
          'v1.general.battle-start.drawings-decide',
          '{moveA} vs {moveB}. Fight!'
        ),
        defineVariant(
          'v1.general.battle-start.bring-and-answer',
          '{moveA} and {moveB} are ready.'
        ),
        defineVariant(
          'v1.general.battle-start.fresh-ink',
          'Here we go: {moveA} against {moveB}.'
        ),
        defineVariant(
          'v1.general.battle-start.moving-page',
          '{moveA} faces {moveB}.'
        ),
        defineVariant(
          'v1.general.battle-start.first-bell',
          'The fight between {moveA} and {moveB} begins.'
        ),
      ]
    ),
    defineBank(
      'general.normal-hit',
      ['source', 'target', 'amount'],
      ['source', 'target', 'amount'],
      [
        defineVariant(
          'v1.general.normal-hit.clean-tag',
          '{source} hits {target} for {amount}.'
        ),
        defineVariant(
          'v1.general.normal-hit.clean-land',
          '{target} takes {amount} damage from {source}.'
        ),
        defineVariant(
          'v1.general.normal-hit.ink-connects',
          '{source} lands a hit on {target} for {amount}.'
        ),
        defineVariant(
          'v1.general.normal-hit.page-check',
          '{source} catches {target} for {amount}.'
        ),
        defineVariant(
          'v1.general.normal-hit.ink-mark',
          '{source} deals {amount} damage to {target}.'
        ),
      ]
    ),
    defineBank(
      'general.critical-hit',
      ['source', 'target', 'amount'],
      ['source', 'target', 'amount'],
      [
        defineVariant(
          'v1.general.critical-hit.crit-call',
          'Big hit! {source} deals {amount} to {target}.'
        ),
        defineVariant(
          'v1.general.critical-hit.paper-fold',
          '{source} hits {target} hard for {amount}.'
        ),
        defineVariant(
          'v1.general.critical-hit.big-splat',
          'Huge hit! {target} takes {amount} from {source}.'
        ),
        defineVariant(
          'v1.general.critical-hit.point-crit',
          '{source} lands a powerful hit on {target} for {amount}.'
        ),
        defineVariant(
          'v1.general.critical-hit.crit-splat',
          '{source} catches {target} with a big {amount}-damage hit.'
        ),
      ]
    ),
    defineBank(
      'general.burn',
      ['target'],
      ['target'],
      [
        defineVariant(
          'v1.general.burn.capped-afterburn',
          '{target} is burning.'
        ),
        defineVariant(
          'v1.general.burn.ink-keeps-burning',
          '{target} takes more burn damage.'
        ),
        defineVariant(
          'v1.general.burn.smoldering-hit',
          'The burn keeps hurting {target}.'
        ),
      ]
    ),
    defineBank(
      'general.barrier-created',
      ['actor'],
      ['actor'],
      [
        defineVariant(
          'v1.general.barrier-created.paper-shield',
          '{actor} puts up a shield.'
        ),
        defineVariant(
          'v1.general.barrier-created.folded-guard',
          'A shield forms around {actor}.'
        ),
        defineVariant(
          'v1.general.barrier-created.layered-page',
          '{actor} is protected by a shield.'
        ),
      ]
    ),
    defineBank(
      'general.barrier-hit',
      ['actor', 'amount'],
      ['actor', 'amount'],
      [
        defineVariant(
          'v1.general.barrier-hit.absorbed',
          "{actor}'s shield blocks {amount}."
        ),
        defineVariant(
          'v1.general.barrier-hit.paper-guard',
          '{actor} blocks {amount} damage.'
        ),
        defineVariant(
          'v1.general.barrier-hit.fold-away',
          'The shield stops {amount} damage for {actor}.'
        ),
        defineVariant(
          'v1.general.barrier-hit.moss-catch',
          "{actor}'s guard holds and stops {amount}."
        ),
      ]
    ),
    defineBank(
      'general.barrier-broken',
      ['actor'],
      ['actor'],
      [
        defineVariant(
          'v1.general.barrier-broken.tears-open',
          "{actor}'s shield breaks."
        ),
        defineVariant(
          'v1.general.barrier-broken.guard-rips',
          "{actor}'s guard is gone."
        ),
        defineVariant(
          'v1.general.barrier-broken.last-fold',
          "{actor}'s protection runs out."
        ),
      ]
    ),
    defineBank(
      'general.ink-pressure',
      ['actor'],
      ['actor'],
      [
        defineVariant('v1.general.ink-pressure.surge', '{actor} powers up.'),
        defineVariant(
          'v1.general.ink-pressure.refresh',
          '{actor} gets a burst of energy.'
        ),
        defineVariant(
          'v1.general.ink-pressure.page-flash',
          '{actor} is ready to strike again.'
        ),
      ]
    ),
    defineBank(
      'general.nib-recoil',
      ['actor'],
      ['actor'],
      [
        defineVariant(
          'v1.general.nib-recoil.snap-back',
          '{actor} bounces off the edge.'
        ),
        defineVariant(
          'v1.general.nib-recoil.edge-clip',
          '{actor} hits the edge and falls back.'
        ),
        defineVariant(
          'v1.general.nib-recoil.page-kick',
          'The edge knocks {actor} back.'
        ),
        defineVariant(
          'v1.general.nib-recoil.margin-snap',
          '{actor} gets pushed back from the edge.'
        ),
      ]
    ),
    defineBank(
      'general.arena-shrink',
      [],
      [],
      [
        defineVariant(
          'v1.general.arena-shrink.fold-inward',
          'The arena is getting smaller.'
        ),
        defineVariant(
          'v1.general.arena-shrink.live-page',
          'The arena edges move inward.'
        ),
        defineVariant(
          'v1.general.arena-shrink.collisions-coming',
          'The arena leaves less room to move.'
        ),
      ]
    ),
    defineBank(
      'general.echo-created',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.general.echo-created.living-copy',
          '{actor} sets up another {move} attack.'
        ),
        defineVariant(
          'v1.general.echo-created.delayed-copy',
          '{actor} saves a {move} follow-up.'
        ),
        defineVariant(
          'v1.general.echo-created.waiting-color',
          "{actor}'s next {move} is waiting."
        ),
        defineVariant(
          'v1.general.echo-created.second-splash',
          '{actor} prepares a second {move}.'
        ),
      ]
    ),
    defineBank(
      'general.echo-fired',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.general.echo-fired.echo-fires',
          '{actor} uses {move} again.'
        ),
        defineVariant(
          'v1.general.echo-fired.delayed-color',
          "{actor}'s follow-up {move} lands."
        ),
        defineVariant(
          'v1.general.echo-fired.waiting-copy',
          '{actor} follows up with {move}.'
        ),
        defineVariant(
          'v1.general.echo-fired.second-bloom',
          '{actor} gets another {move} attack.'
        ),
      ]
    ),
    defineBank(
      'general.echo-shattered',
      ['actor', 'move'],
      ['actor', 'move'],
      [
        defineVariant(
          'v1.general.echo-shattered.echo-breaks',
          "{actor}'s follow-up {move} is stopped."
        ),
        defineVariant(
          'v1.general.echo-shattered.color-erased',
          "{actor}'s delayed {move} is gone."
        ),
        defineVariant(
          'v1.general.echo-shattered.before-fire',
          "{actor}'s next {move} ends early."
        ),
      ]
    ),
    defineBank(
      'general.late-fight',
      [],
      [],
      [
        defineVariant(
          'v1.general.late-fight.recharge',
          'Powers recharge faster now.'
        ),
        defineVariant(
          'v1.general.late-fight.page-speeds',
          'The fight speeds up. Powers recharge sooner.'
        ),
        defineVariant(
          'v1.general.late-fight.final-strokes',
          'Power moves recharge more often now.'
        ),
      ]
    ),
  ]);

export function getInkcastCommentaryBank(
  bankId: InkcastCommentaryBankId
): InkcastCommentaryBank {
  const bank = INKCAST_COMMENTARY_BANKS.find(
    (candidate) => candidate.id === bankId
  );
  if (!bank) throw new Error(`Unknown Inkcast commentary bank: ${bankId}`);
  return bank;
}

export function selectInkcastCommentaryVariant(
  bankId: InkcastCommentaryBankId,
  battleId: string,
  occurrenceIndex: number
): InkcastCommentaryVariant {
  if (!Number.isSafeInteger(occurrenceIndex) || occurrenceIndex < 0) {
    throw new Error('Inkcast occurrence index must be a non-negative integer.');
  }

  const bank = getInkcastCommentaryBank(bankId);
  const variantCount = bank.variants.length;
  if (variantCount === 0) {
    throw new Error(`Inkcast commentary bank is empty: ${bankId}`);
  }

  const offset =
    hashContentKey(
      `inkcast:v${INKCAST_COMMENTARY_PACK_VERSION}:${battleId}:${bankId}:offset`
    ) % variantCount;
  const coprimeStrides = getCoprimeStrides(variantCount);
  const selectedStride =
    coprimeStrides[
      hashContentKey(
        `inkcast:v${INKCAST_COMMENTARY_PACK_VERSION}:${battleId}:${bankId}:stride`
      ) % coprimeStrides.length
    ];
  if (selectedStride === undefined) {
    throw new Error(`Inkcast commentary bank cannot be scheduled: ${bankId}`);
  }

  const cycleOccurrenceIndex = occurrenceIndex % variantCount;
  const selectedIndex =
    (offset + cycleOccurrenceIndex * selectedStride) % variantCount;
  const selectedVariant = bank.variants[selectedIndex];
  if (!selectedVariant) {
    throw new Error(`Inkcast commentary variant is missing: ${bankId}`);
  }
  return selectedVariant;
}

export function renderInkcastCommentaryTemplate(
  template: string,
  values: InkcastCommentaryTemplateValues
): string {
  const parsedTemplate = parseInkcastCommentaryTemplate(template);
  if (parsedTemplate.malformed) {
    throw new Error('Inkcast commentary template has malformed token braces.');
  }

  for (const token of parsedTemplate.tokens) {
    if (!isInkcastCommentaryToken(token)) {
      throw new Error(`Inkcast commentary token is unknown: ${token}`);
    }
    if (values[token] === undefined) {
      throw new Error(`Inkcast commentary token is missing: ${token}`);
    }
  }

  return template.replace(TOKEN_PATTERN, (_, token: string): string => {
    if (!isInkcastCommentaryToken(token)) {
      throw new Error(`Inkcast commentary token is unknown: ${token}`);
    }
    const value = values[token];
    if (value === undefined) {
      throw new Error(`Inkcast commentary token is missing: ${token}`);
    }
    return String(value);
  });
}

export function validateInkcastCommentaryPack(
  banks: readonly InkcastCommentaryBank[] = INKCAST_COMMENTARY_BANKS
): InkcastCommentaryPackValidation {
  const errors: string[] = [];
  const seenBankIds = new Set<string>();
  const seenVariantIds = new Set<string>();
  const seenTemplates = new Map<string, string>();
  let lineCount = 0;

  if (!Object.isFrozen(banks)) {
    errors.push('Inkcast commentary bank list must be frozen.');
  }
  if (banks.length !== EXPECTED_BANK_COUNT) {
    errors.push(`Inkcast needs exactly ${EXPECTED_BANK_COUNT} banks.`);
  }

  for (const expectedBankId of INKCAST_COMMENTARY_BANK_IDS) {
    const matchingBankCount = banks.filter(
      (bank) => bank.id === expectedBankId
    ).length;
    if (matchingBankCount !== 1) {
      errors.push(`${expectedBankId} must appear exactly once.`);
    }
  }

  for (const bank of banks) {
    lineCount += bank.variants.length;
    if (!Object.isFrozen(bank)) {
      errors.push(`${bank.id} must be frozen.`);
    }
    if (!Object.isFrozen(bank.allowedTokens)) {
      errors.push(`${bank.id} allowed tokens must be frozen.`);
    }
    if (!Object.isFrozen(bank.requiredTokens)) {
      errors.push(`${bank.id} required tokens must be frozen.`);
    }
    if (!Object.isFrozen(bank.variants)) {
      errors.push(`${bank.id} variants must be frozen.`);
    }
    if (!BANK_ID_PATTERN.test(bank.id)) {
      errors.push(`${bank.id} is not a valid bank ID.`);
    }
    if (!INKCAST_COMMENTARY_BANK_IDS.includes(bank.id)) {
      errors.push(`${bank.id} is not part of Inkcast pack v1.`);
    }
    if (seenBankIds.has(bank.id)) {
      errors.push(`${bank.id} is duplicated.`);
    }
    seenBankIds.add(bank.id);

    const expectedVariantCount = getExpectedVariantCount(bank.id);
    if (bank.variants.length !== expectedVariantCount) {
      errors.push(`${bank.id} needs exactly ${expectedVariantCount} variants.`);
    }

    const allowedTokens = new Set(bank.allowedTokens);
    const usedTokens = new Set<InkcastCommentaryToken>();
    for (const requiredToken of bank.requiredTokens) {
      if (!allowedTokens.has(requiredToken)) {
        errors.push(
          `${bank.id} requires token ${requiredToken} without allowing it.`
        );
      }
    }

    bank.variants.forEach((variant, variantIndex) => {
      if (!Object.isFrozen(variant)) {
        errors.push(`${bank.id}[${variantIndex}] must be frozen.`);
      }
      if (!VARIANT_ID_PATTERN.test(variant.id)) {
        errors.push(`${variant.id} is not a valid v1 variant ID.`);
      }
      if (seenVariantIds.has(variant.id)) {
        errors.push(`${variant.id} is duplicated.`);
      }
      seenVariantIds.add(variant.id);

      const trimmedTemplate = variant.template.trim();
      if (!trimmedTemplate) {
        errors.push(`${variant.id} is blank.`);
      }
      if (variant.template.length > MAXIMUM_TEMPLATE_LENGTH) {
        errors.push(
          `${variant.id} exceeds ${MAXIMUM_TEMPLATE_LENGTH} source characters.`
        );
      }
      const normalizedTemplate = trimmedTemplate.toLocaleLowerCase('en-US');
      const duplicateTemplateOwner = seenTemplates.get(normalizedTemplate);
      if (duplicateTemplateOwner) {
        errors.push(
          `${variant.id} duplicates the template in ${duplicateTemplateOwner}.`
        );
      } else {
        seenTemplates.set(normalizedTemplate, variant.id);
      }

      const parsedTemplate = parseInkcastCommentaryTemplate(variant.template);
      const templateTokens = new Set<InkcastCommentaryToken>();
      let canRenderTemplate = !parsedTemplate.malformed;
      for (const token of parsedTemplate.tokens) {
        if (!isInkcastCommentaryToken(token) || !allowedTokens.has(token)) {
          errors.push(`${variant.id} uses forbidden token ${String(token)}.`);
          canRenderTemplate = false;
          continue;
        }
        templateTokens.add(token);
        usedTokens.add(token);
      }
      if (parsedTemplate.malformed) {
        errors.push(`${variant.id} contains malformed token braces.`);
      }
      for (const requiredToken of bank.requiredTokens) {
        if (!templateTokens.has(requiredToken)) {
          errors.push(`${variant.id} is missing token ${requiredToken}.`);
        }
      }
      if (FORBIDDEN_OUTCOME_OR_REWARD_CLAIM.test(variant.template)) {
        errors.push(`${variant.id} invents an outcome or reward claim.`);
      }
      if (bank.id.endsWith('.miss')) {
        if (FORBIDDEN_MISS_MECHANIC_CLAIM.test(variant.template)) {
          errors.push(`${variant.id} invents an unproven miss mechanic.`);
        }
        if (FORBIDDEN_ACTOR_WIDE_MISS_CLAIM.test(variant.template)) {
          errors.push(`${variant.id} makes an actor-wide miss claim.`);
        }
        if (!TRUTHFUL_MISS_RESULT.test(variant.template)) {
          errors.push(`${variant.id} needs a truthful no-hit result.`);
        }
      }
      if (bank.id === 'general.arena-shrink') {
        if (FORBIDDEN_ARENA_SHRINK_CLAIM.test(variant.template)) {
          errors.push(`${variant.id} invents a future arena event.`);
        }
        if (!REQUIRED_ARENA_SHRINK_TRUTH.test(variant.template)) {
          errors.push(`${variant.id} needs a truthful shrink-start claim.`);
        }
      }
      if (
        bank.id === 'general.ink-pressure' &&
        FORBIDDEN_INK_PRESSURE_TIMING_CLAIM.test(variant.template)
      ) {
        errors.push(`${variant.id} invents Ink Pressure timing.`);
      }
      if (bank.id === 'general.late-fight') {
        if (FORBIDDEN_LATE_FIGHT_CLAIM.test(variant.template)) {
          errors.push(`${variant.id} overstates the late-fight phase.`);
        }
        if (!REQUIRED_LATE_FIGHT_TRUTH.test(variant.template)) {
          errors.push(`${variant.id} must describe faster power cooldowns.`);
        }
      }
      if (canRenderTemplate) {
        const renderedTemplate = renderInkcastCommentaryTemplate(
          variant.template,
          MAXIMUM_TEMPLATE_VALUES
        );
        if (renderedTemplate.length > MAXIMUM_RENDERED_LENGTH) {
          errors.push(
            `${variant.id} exceeds ${MAXIMUM_RENDERED_LENGTH} rendered characters.`
          );
        }
      }
    });

    for (const allowedToken of bank.allowedTokens) {
      if (!usedTokens.has(allowedToken)) {
        errors.push(`${bank.id} allows unused token ${allowedToken}.`);
      }
    }
  }

  if (lineCount !== INKCAST_COMMENTARY_EXPECTED_LINE_COUNT) {
    errors.push(
      `Inkcast needs exactly ${INKCAST_COMMENTARY_EXPECTED_LINE_COUNT} lines.`
    );
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    bankCount: banks.length,
    lineCount,
  });
}

function getExpectedVariantCount(bankId: InkcastCommentaryBankId): number {
  if (bankId.startsWith('power.')) {
    return bankId.endsWith('.miss') ? 4 : 5;
  }

  switch (bankId) {
    case 'general.battle-start':
    case 'general.normal-hit':
    case 'general.critical-hit':
      return 5;
    case 'general.barrier-hit':
    case 'general.nib-recoil':
    case 'general.echo-created':
    case 'general.echo-fired':
      return 4;
    case 'general.burn':
    case 'general.barrier-created':
    case 'general.barrier-broken':
    case 'general.ink-pressure':
    case 'general.arena-shrink':
    case 'general.echo-shattered':
    case 'general.late-fight':
      return 3;
  }

  throw new Error(`Unknown Inkcast commentary bank: ${bankId}`);
}

function getCoprimeStrides(variantCount: number): readonly number[] {
  if (variantCount <= 1) return Object.freeze([1]);

  const strides: number[] = [];
  for (let stride = 1; stride < variantCount; stride += 1) {
    if (greatestCommonDivisor(stride, variantCount) === 1) {
      strides.push(stride);
    }
  }
  return Object.freeze(strides);
}

function parseInkcastCommentaryTemplate(template: string): Readonly<{
  tokens: readonly string[];
  malformed: boolean;
}> {
  const tokens = Array.from(
    template.matchAll(TOKEN_PATTERN),
    (match) => match[1] ?? ''
  );
  const templateWithoutTokens = template.replace(TOKEN_PATTERN, '');
  return Object.freeze({
    tokens: Object.freeze(tokens),
    malformed: /[{}]/.test(templateWithoutTokens),
  });
}

function greatestCommonDivisor(left: number, right: number): number {
  let dividend = Math.abs(left);
  let divisor = Math.abs(right);
  while (divisor !== 0) {
    const remainder = dividend % divisor;
    dividend = divisor;
    divisor = remainder;
  }
  return dividend;
}

function isInkcastCommentaryToken(
  value: string | undefined
): value is InkcastCommentaryToken {
  return (
    value === 'actor' ||
    value === 'target' ||
    value === 'source' ||
    value === 'amount' ||
    value === 'move' ||
    value === 'moveA' ||
    value === 'moveB'
  );
}

const productionPackValidation = validateInkcastCommentaryPack();
if (!productionPackValidation.valid) {
  throw new Error(
    `Invalid Inkcast commentary pack: ${productionPackValidation.errors.join(' ')}`
  );
}
