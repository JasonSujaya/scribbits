// Deterministic, presentation-only Inkcast copy. Replay supplies facts already
// proven by the authoritative transcript; this module only selects concise
// wording. The bounded Inkcast queue owns cadence; neither layer changes event
// order or combat state.

import type {
  CombatElement,
  FighterSlot,
  PrimaryPower,
} from '../../shared/combat/types';
import { getShapePowerSignatureName } from '../../shared/combat/shapepowercontent';
import { getFoundingScribbitDefinition } from '../../shared/founders';

export type ReplayCommentaryFighter = Readonly<{
  id: string;
  name: string;
  element: CombatElement;
  primaryPower: PrimaryPower;
}>;

export type ReplayCommentaryContext = Readonly<{
  battleId: string;
  fighters: Readonly<Record<FighterSlot, ReplayCommentaryFighter>>;
}>;

type CommentaryFactBase = Readonly<{ tick: number }>;

export type ReplayCommentaryFact =
  | (CommentaryFactBase & Readonly<{ kind: 'battle-start' }>)
  | (CommentaryFactBase &
      Readonly<{
        kind: 'power-telegraph';
        actor: FighterSlot;
        power: PrimaryPower;
        activationNumber: number;
      }>)
  | (CommentaryFactBase &
      Readonly<{
        kind: 'power-missed';
        actor: FighterSlot;
        power: PrimaryPower;
        activationNumber: number;
      }>)
  | (CommentaryFactBase &
      Readonly<{
        kind: 'damage';
        sourceFighter: FighterSlot;
        targetFighter: FighterSlot;
        sourceName: string;
        sourcePower: PrimaryPower | null;
        amount: number;
        critical: boolean;
      }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'burn'; targetFighter: FighterSlot }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'barrier-created'; actor: FighterSlot }>)
  | (CommentaryFactBase &
      Readonly<{
        kind: 'barrier-hit';
        actor: FighterSlot;
        absorbedDamage: number;
      }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'barrier-broken'; actor: FighterSlot }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'ink-pressure'; actor: FighterSlot }>)
  | (CommentaryFactBase & Readonly<{ kind: 'nib-recoil'; actor: FighterSlot }>)
  | (CommentaryFactBase & Readonly<{ kind: 'arena-shrink' }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'echo-created'; actor: FighterSlot }>)
  | (CommentaryFactBase & Readonly<{ kind: 'echo-fired'; actor: FighterSlot }>)
  | (CommentaryFactBase &
      Readonly<{ kind: 'echo-shattered'; actor: FighterSlot }>)
  | (CommentaryFactBase & Readonly<{ kind: 'late-fight' }>);

type PowerCommentary = Readonly<{
  telegraph: readonly string[];
  miss: readonly string[];
  hit: readonly string[];
}>;

type GeneralMoment =
  | 'battleStart'
  | 'normalHit'
  | 'criticalHit'
  | 'burn'
  | 'barrierCreated'
  | 'barrierHit'
  | 'barrierBroken'
  | 'inkPressure'
  | 'nibRecoil'
  | 'arenaShrink'
  | 'echoCreated'
  | 'echoFired'
  | 'echoShattered'
  | 'lateFight';

const lines = (...values: string[]): readonly string[] => Object.freeze(values);

export const POWER_COMMENTARY: Readonly<Record<PrimaryPower, PowerCommentary>> =
  Object.freeze({
    inkquake: Object.freeze({
      telegraph: lines(
        '{actor} loads the page for {move}!',
        'The floor ripples — {actor} winds up {move}!',
        '{actor} plants the ink for {move}!',
        '{move} swells under {actor}!'
      ),
      miss: lines(
        '{move} finds no clean hit!',
        '{move} rolls through empty paper!',
        "{actor}'s ring expires without damage!"
      ),
      hit: lines(
        '{source} buckles the page — {amount} to {target}!',
        '{source} rings {target} for {amount}!',
        '{target} takes {amount} from {source}!'
      ),
    }),
    nib_halo: Object.freeze({
      telegraph: lines(
        '{actor} uncaps three quills for {move}!',
        '{move} starts circling {actor}!',
        'Three live nibs orbit {actor}!',
        '{actor} sharpens the ring for {move}!'
      ),
      miss: lines(
        'The {move} quills find no clean hit!',
        '{move} circles out without damage!',
        'No clean nib contact from {actor}!'
      ),
      hit: lines(
        '{source} clips {target} for {amount}!',
        '{source} circles into {target} for {amount}!',
        '{target} takes {amount} from {source}!'
      ),
    }),
    smearstep: Object.freeze({
      telegraph: lines(
        '{actor} sketches a two-step {move} dash!',
        '{move} lines up the escape route!',
        '{actor} predicts the lane for {move}!',
        'Two dashes load under {actor}!'
      ),
      miss: lines(
        '{move} finishes without a clean hit!',
        'Two dashes, no damage from {actor}!',
        "{actor}'s predicted line finds empty paper!"
      ),
      hit: lines(
        '{source} dashes through {target} for {amount}!',
        '{source} catches {target} for {amount}!',
        '{target} takes {amount} from {source}!'
      ),
    }),
    colorburst: Object.freeze({
      telegraph: lines(
        '{actor} mixes the page for {move}!',
        '{move} paints a wide cone!',
        '{actor} loads color into {move}!',
        'The palette flashes around {actor}!'
      ),
      miss: lines(
        '{move} blooms without a clean hit!',
        'The cone ends without damage!',
        "{actor}'s color fan finds empty paper!"
      ),
      hit: lines(
        '{source} splashes {target} for {amount}!',
        '{source} catches {target} for {amount}!',
        '{target} takes {amount} from {source}!'
      ),
    }),
  });

export const GENERAL_COMMENTARY: Readonly<
  Record<GeneralMoment, readonly string[]>
> = Object.freeze({
  battleStart: lines(
    '{moveA} meets {moveB} — the drawings decide!',
    '{nameA} brings {moveA}; {nameB} answers with {moveB}!',
    'Fresh ink: {moveA} versus {moveB}!',
    '{nameA} and {nameB} hit the moving page!'
  ),
  normalHit: lines(
    '{source} tags {target} for {amount}!',
    '{target} takes {amount} from {source}!',
    '{source} lands clean — {amount} to {target}!',
    'Ink connects: {source} deals {amount} to {target}!'
  ),
  criticalHit: lines(
    'CRIT! {source} deals {amount} to {target}!',
    '{source} finds the fold — {amount} CRIT to {target}!',
    'BIG SPLAT! {target} takes {amount} from {source}!',
    '{source} lands a {amount}-point CRIT on {target}!'
  ),
  burn: lines(
    '{target} catches a capped Ember afterburn!',
    'Ember ink keeps burning under {target}!',
    '{target} is still smoldering from the hit!'
  ),
  barrierCreated: lines(
    '{actor} grows a Moss paper shield!',
    'A folded Moss guard wraps {actor}!',
    '{actor} layers the page into a shield!'
  ),
  barrierHit: lines(
    "{actor}'s shield absorbs {amount}!",
    'Paper guard! {actor} blocks {amount}.',
    '{actor} folds away {amount} damage!'
  ),
  barrierBroken: lines(
    "{actor}'s paper shield tears open!",
    'The Moss guard around {actor} rips apart!',
    "{actor}'s last shield fold gives way!"
  ),
  inkPressure: lines(
    '{actor} surges with INK PRESSURE!',
    'INK PRESSURE refreshes {actor}!',
    '{actor} squeezes one more power from the page!'
  ),
  nibRecoil: lines(
    "{actor}'s wall nib snaps back!",
    '{actor} clips the edge and recoils!',
    'The page kicks a loose nib back at {actor}!'
  ),
  arenaShrink: lines(
    'The paper folds inward — nowhere left to hide!',
    'The live page shrinks around both drawings!',
    'Arena folds close — collisions are coming!'
  ),
  echoCreated: lines(
    '{actor} leaves a living {move} echo!',
    'A delayed {move} copy hangs behind {actor}!',
    "{actor}'s color echo waits on the page!"
  ),
  echoFired: lines(
    "{actor}'s {move} echo fires!",
    'Delayed color! {move} flashes again!',
    "{actor}'s waiting echo comes alive!"
  ),
  echoShattered: lines(
    "{actor}'s {move} echo shatters!",
    'The delayed color around {actor} is erased!',
    "{actor}'s echo breaks before it can fire!"
  ),
  lateFight: lines(
    'SUDDEN SCRIBBLE! Powers recharge faster!',
    'SUDDEN SCRIBBLE! The page speeds up!',
    'Final strokes — every power refreshes faster!',
    'The late-fight ink surge is live!'
  ),
});

const COMMENTARY_BANKS: readonly Readonly<{
  name: string;
  values: readonly string[];
  minimum: number;
}>[] = Object.freeze([
  ...Object.entries(POWER_COMMENTARY).flatMap(([power, content]) => [
    { name: `${power}.telegraph`, values: content.telegraph, minimum: 4 },
    { name: `${power}.miss`, values: content.miss, minimum: 3 },
    { name: `${power}.hit`, values: content.hit, minimum: 3 },
  ]),
  ...Object.entries(GENERAL_COMMENTARY).map(([name, values]) => ({
    name,
    values,
    minimum:
      name === 'battleStart' ||
      name === 'normalHit' ||
      name === 'criticalHit' ||
      name === 'lateFight'
        ? 4
        : 3,
  })),
]);

export const REPLAY_COMMENTARY_LINE_COUNT = COMMENTARY_BANKS.reduce(
  (count, bank) => count + bank.values.length,
  0
);

const ALLOWED_TOKENS = new Set([
  'actor',
  'target',
  'source',
  'amount',
  'move',
  'nameA',
  'nameB',
  'moveA',
  'moveB',
]);

function stableTextHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function selectTemplate(templates: readonly string[], seed: string): string {
  const selected = templates[stableTextHash(seed) % templates.length];
  if (!selected) throw new Error('Inkcast commentary bank is empty.');
  return selected;
}

function renderTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>
): string {
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, token: string) => {
    const value = values[token];
    if (value === undefined) {
      throw new Error(`Inkcast commentary token is missing: ${token}`);
    }
    return String(value);
  });
}

function safeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 24) || 'Scribbit';
}

function formatFounderCommentary(name: string, line: string): string {
  return `${safeName(name)}: “${line}”`;
}

export function authorFounderBattleOpening(
  context: ReplayCommentaryContext
): string | null {
  const founderCandidates = (['a', 'b'] as const).flatMap((slot) => {
    const fighter = context.fighters[slot];
    const definition = getFoundingScribbitDefinition(fighter.id);
    return definition ? [{ fighter, definition }] : [];
  });
  if (founderCandidates.length === 0) return null;

  const founderCandidate =
    founderCandidates[
      stableTextHash(`${context.battleId}:founder-opening-slot`) %
        founderCandidates.length
    ];
  if (!founderCandidate) return null;
  const openingLines = founderCandidate.definition.personality.openingLines;
  const openingLine =
    openingLines[
      stableTextHash(
        `${context.battleId}:${founderCandidate.fighter.id}:founder-opening-line`
      ) % openingLines.length
    ];
  if (!openingLine) return null;
  return formatFounderCommentary(founderCandidate.fighter.name, openingLine);
}

function seedFor(
  context: ReplayCommentaryContext,
  fact: ReplayCommentaryFact,
  discriminator = ''
): string {
  const actor = 'actor' in fact ? fact.actor : '';
  const source = 'sourceFighter' in fact ? fact.sourceFighter : '';
  const activation = 'activationNumber' in fact ? fact.activationNumber : '';
  return `${context.battleId}:${fact.kind}:${fact.tick}:${actor}:${source}:${activation}:${discriminator}`;
}

export function authorReplayCommentary(
  context: ReplayCommentaryContext,
  fact: ReplayCommentaryFact
): string {
  const fighterA = context.fighters.a;
  const fighterB = context.fighters.b;
  switch (fact.kind) {
    case 'battle-start': {
      const template = selectTemplate(
        GENERAL_COMMENTARY.battleStart,
        seedFor(context, fact)
      );
      return renderTemplate(template, {
        nameA: safeName(fighterA.name),
        nameB: safeName(fighterB.name),
        moveA: getShapePowerSignatureName(
          fighterA.element,
          fighterA.primaryPower
        ),
        moveB: getShapePowerSignatureName(
          fighterB.element,
          fighterB.primaryPower
        ),
      });
    }
    case 'power-telegraph': {
      const actor = context.fighters[fact.actor];
      const founder = getFoundingScribbitDefinition(actor.id);
      if (founder && fact.activationNumber === 1) {
        return formatFounderCommentary(
          actor.name,
          founder.personality.signatureReaction
        );
      }
      return renderTemplate(
        selectTemplate(
          POWER_COMMENTARY[fact.power].telegraph,
          seedFor(context, fact, fact.power)
        ),
        {
          actor: safeName(actor.name),
          move: getShapePowerSignatureName(actor.element, fact.power),
        }
      );
    }
    case 'power-missed': {
      const actor = context.fighters[fact.actor];
      return renderTemplate(
        selectTemplate(
          POWER_COMMENTARY[fact.power].miss,
          seedFor(context, fact, fact.power)
        ),
        {
          actor: safeName(actor.name),
          move: getShapePowerSignatureName(actor.element, fact.power),
        }
      );
    }
    case 'damage': {
      const target = context.fighters[fact.targetFighter];
      const templates = fact.critical
        ? GENERAL_COMMENTARY.criticalHit
        : fact.sourcePower
          ? POWER_COMMENTARY[fact.sourcePower].hit
          : GENERAL_COMMENTARY.normalHit;
      return renderTemplate(
        selectTemplate(templates, seedFor(context, fact, fact.sourceName)),
        {
          source: fact.sourceName.slice(0, 32),
          target: safeName(target.name),
          amount: Math.max(0, Math.floor(fact.amount)),
        }
      );
    }
    case 'burn':
      return renderTemplate(
        selectTemplate(GENERAL_COMMENTARY.burn, seedFor(context, fact)),
        { target: safeName(context.fighters[fact.targetFighter].name) }
      );
    case 'barrier-created':
      return renderTemplate(
        selectTemplate(
          GENERAL_COMMENTARY.barrierCreated,
          seedFor(context, fact)
        ),
        { actor: safeName(context.fighters[fact.actor].name) }
      );
    case 'barrier-hit':
      return renderTemplate(
        selectTemplate(GENERAL_COMMENTARY.barrierHit, seedFor(context, fact)),
        {
          actor: safeName(context.fighters[fact.actor].name),
          amount: Math.max(0, Math.floor(fact.absorbedDamage)),
        }
      );
    case 'barrier-broken':
      return renderTemplate(
        selectTemplate(
          GENERAL_COMMENTARY.barrierBroken,
          seedFor(context, fact)
        ),
        { actor: safeName(context.fighters[fact.actor].name) }
      );
    case 'ink-pressure':
      return renderTemplate(
        selectTemplate(GENERAL_COMMENTARY.inkPressure, seedFor(context, fact)),
        { actor: safeName(context.fighters[fact.actor].name) }
      );
    case 'nib-recoil':
      return renderTemplate(
        selectTemplate(GENERAL_COMMENTARY.nibRecoil, seedFor(context, fact)),
        { actor: safeName(context.fighters[fact.actor].name) }
      );
    case 'arena-shrink':
      return selectTemplate(
        GENERAL_COMMENTARY.arenaShrink,
        seedFor(context, fact)
      );
    case 'echo-created':
    case 'echo-fired':
    case 'echo-shattered': {
      const actor = context.fighters[fact.actor];
      const templates =
        fact.kind === 'echo-created'
          ? GENERAL_COMMENTARY.echoCreated
          : fact.kind === 'echo-fired'
            ? GENERAL_COMMENTARY.echoFired
            : GENERAL_COMMENTARY.echoShattered;
      return renderTemplate(selectTemplate(templates, seedFor(context, fact)), {
        actor: safeName(actor.name),
        move: getShapePowerSignatureName(actor.element, 'colorburst'),
      });
    }
    case 'late-fight':
      return selectTemplate(
        GENERAL_COMMENTARY.lateFight,
        seedFor(context, fact)
      );
    default:
      return assertNeverFact(fact);
  }
}

export function authorFounderBattleOutcome(
  context: ReplayCommentaryContext,
  winnerSlot: FighterSlot
): string | null {
  const winner = context.fighters[winnerSlot];
  const winnerFounder = getFoundingScribbitDefinition(winner.id);
  if (winnerFounder) {
    return `“${winnerFounder.personality.victoryLine}”`;
  }

  const loserSlot: FighterSlot = winnerSlot === 'a' ? 'b' : 'a';
  const loser = context.fighters[loserSlot];
  const loserFounder = getFoundingScribbitDefinition(loser.id);
  if (!loserFounder) return null;
  return `“${loserFounder.personality.defeatLine}”`;
}

function assertNeverFact(fact: never): never {
  throw new Error(`Unhandled Inkcast commentary fact: ${JSON.stringify(fact)}`);
}

export function validateReplayCommentaryContent(): string[] {
  const errors: string[] = [];
  for (const bank of COMMENTARY_BANKS) {
    if (bank.values.length < bank.minimum) {
      errors.push(`${bank.name} needs at least ${bank.minimum} variants.`);
    }
    if (new Set(bank.values).size !== bank.values.length) {
      errors.push(`${bank.name} contains duplicate variants.`);
    }
    bank.values.forEach((template, index) => {
      if (!template.trim()) errors.push(`${bank.name}[${index}] is blank.`);
      if (template.length > 110) {
        errors.push(`${bank.name}[${index}] exceeds 110 source characters.`);
      }
      for (const match of template.matchAll(/\{([^}]+)\}/g)) {
        const token = match[1];
        if (!token || !ALLOWED_TOKENS.has(token)) {
          errors.push(`${bank.name}[${index}] has unknown token ${token}.`);
        }
      }
    });
  }
  return errors;
}
