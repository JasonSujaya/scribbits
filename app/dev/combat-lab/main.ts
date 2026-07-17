import './styles.css';

import {
  POWER_UP_CATALOG,
  POWER_UP_IDS,
  selectCombatRole,
  simulateCombat,
  validatePowerUpBuild,
  type BattleTimelineEvent,
  type BattleTranscript,
  type CurrentCombatRole,
  type PowerUpId,
  type RawCombatStats,
} from '../../src/shared/combat';

const COMBAT_LAB_MARKER = 'SCRIBBITS_COMBAT_LAB_DEV_ONLY';
const STAT_NAMES = ['chonk', 'spike', 'zip', 'charm'] as const;
const ROLE_IDS: readonly CurrentCombatRole[] = [
  'brawler',
  'longshot',
  'mage',
];
const ROLE_NAMES: Readonly<Record<CurrentCombatRole, string>> = {
  brawler: 'Brawler',
  longshot: 'Longshot',
  mage: 'Mage',
};
const ROLE_PRESETS: Readonly<Record<CurrentCombatRole, RawCombatStats>> = {
  brawler: { chonk: 40, spike: 20, zip: 20, charm: 20 },
  longshot: { chonk: 20, spike: 40, zip: 20, charm: 20 },
  mage: { chonk: 20, spike: 20, zip: 20, charm: 40 },
};

type FighterEditor = Readonly<{
  root: HTMLElement;
  roleSelect: HTMLSelectElement;
  statInputs: Readonly<Record<(typeof STAT_NAMES)[number], HTMLInputElement>>;
  selectedPowerUps: Set<PowerUpId>;
  message: HTMLElement;
}>;

const requiredElement = <ElementType extends Element>(
  selector: string
): ElementType => {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Combat Lab is missing ${selector}.`);
  return element;
};

const createElement = <TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  className?: string,
  text?: string
): HTMLElementTagNameMap[TagName] => {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const readStats = (editor: FighterEditor): RawCombatStats => ({
  chonk: editor.statInputs.chonk.valueAsNumber,
  spike: editor.statInputs.spike.valueAsNumber,
  zip: editor.statInputs.zip.valueAsNumber,
  charm: editor.statInputs.charm.valueAsNumber,
});

const refreshDerivedRole = (editor: FighterEditor): void => {
  const stats = readStats(editor);
  if (STAT_NAMES.some((statName) => !Number.isSafeInteger(stats[statName]))) {
    return;
  }
  editor.roleSelect.value = selectCombatRole(stats);
};

const applyRolePreset = (
  editor: FighterEditor,
  role: CurrentCombatRole
): void => {
  const preset = ROLE_PRESETS[role];
  for (const statName of STAT_NAMES) {
    editor.statInputs[statName].value = String(preset[statName]);
  }
  refreshDerivedRole(editor);
};

const createFighterEditor = (
  root: HTMLElement,
  slot: 'a' | 'b',
  startingRole: CurrentCombatRole
): FighterEditor => {
  root.replaceChildren();
  const heading = createElement('div', 'fighter-heading');
  const titleBlock = createElement('div');
  titleBlock.append(
    createElement('p', 'eyebrow', `Fighter ${slot.toUpperCase()}`),
    createElement('h2', undefined, slot === 'a' ? 'Inkhand Alpha' : 'Inkhand Beta')
  );
  const roleLabel = createElement('label', 'role-control');
  roleLabel.append(createElement('span', undefined, 'Role'));
  const roleSelect = createElement('select');
  roleSelect.setAttribute('aria-label', `Fighter ${slot.toUpperCase()} role`);
  for (const role of ROLE_IDS) {
    const option = createElement('option', undefined, ROLE_NAMES[role]);
    option.value = role;
    roleSelect.append(option);
  }
  roleLabel.append(roleSelect);
  heading.append(titleBlock, roleLabel);

  const roleNote = createElement(
    'p',
    'role-note',
    'Role is authoritative: changing it applies a 100-point baseline; editing stats updates the derived role.'
  );
  const statsHeading = createElement('h3', undefined, 'Raw drawing stats');
  const statsGrid = createElement('div', 'stats-grid');
  const statInputs: Record<(typeof STAT_NAMES)[number], HTMLInputElement> = {
    chonk: createElement('input'),
    spike: createElement('input'),
    zip: createElement('input'),
    charm: createElement('input'),
  };
  for (const statName of STAT_NAMES) {
    const label = createElement('label');
    label.append(createElement('span', undefined, statName));
    const input = statInputs[statName];
    input.type = 'number';
    input.min = '0';
    input.max = '1000';
    input.step = '1';
    input.inputMode = 'numeric';
    input.setAttribute('aria-label', `Fighter ${slot.toUpperCase()} ${statName}`);
    label.append(input);
    statsGrid.append(label);
  }

  const powerUpHeading = createElement('div', 'section-heading');
  powerUpHeading.append(
    createElement('h3', undefined, 'Power-Ups'),
    createElement('span', 'selection-count', '0 / 5 selected')
  );
  const powerUps = createElement('div', 'power-ups');
  const message = createElement('p', 'editor-message');
  message.setAttribute('aria-live', 'polite');
  const selectedPowerUps = new Set<PowerUpId>();

  const editor: FighterEditor = {
    root,
    roleSelect,
    statInputs,
    selectedPowerUps,
    message,
  };

  for (const powerUpId of POWER_UP_IDS) {
    const definition = POWER_UP_CATALOG[powerUpId];
    const label = createElement('label', 'power-up');
    const checkbox = createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = powerUpId;
    const copy = createElement('span', 'power-up-copy');
    copy.append(
      createElement('strong', undefined, definition.name),
      createElement(
        'small',
        undefined,
        `${definition.rarity} · ${definition.buildPath}`
      ),
      createElement('span', undefined, definition.description)
    );
    label.append(checkbox, copy);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedPowerUps.add(powerUpId);
      else selectedPowerUps.delete(powerUpId);

      const validation = validatePowerUpBuild([...selectedPowerUps]);
      if (!validation.valid) {
        selectedPowerUps.delete(powerUpId);
        checkbox.checked = false;
        message.textContent = validation.reason;
      } else {
        message.textContent = '';
      }
      const selectionCount = powerUpHeading.querySelector('.selection-count');
      if (selectionCount) {
        selectionCount.textContent = `${selectedPowerUps.size} / 5 selected`;
      }
    });
    powerUps.append(label);
  }

  roleSelect.addEventListener('change', () => {
    const selectedRole = ROLE_IDS.find((role) => role === roleSelect.value);
    if (selectedRole) applyRolePreset(editor, selectedRole);
  });
  for (const input of Object.values(statInputs)) {
    input.addEventListener('input', () => refreshDerivedRole(editor));
  }

  root.append(
    heading,
    roleNote,
    statsHeading,
    statsGrid,
    powerUpHeading,
    powerUps,
    message
  );
  applyRolePreset(editor, startingRole);
  return editor;
};

const summarizeEvents = (
  events: readonly BattleTimelineEvent[]
): readonly [string, number][] => {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  }
  return [...counts.entries()].sort(
    ([leftKind, leftCount], [rightKind, rightCount]) =>
      rightCount - leftCount || leftKind.localeCompare(rightKind)
  );
};

const formatEventDetails = (event: BattleTimelineEvent): string =>
  Object.entries(event)
    .filter(([key]) => key !== 'tick' && key !== 'kind')
    .map(([key, value]) =>
      `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`
    )
    .join(' · ');

const renderTranscript = (
  output: HTMLElement,
  transcript: BattleTranscript
): void => {
  output.classList.remove('empty');
  output.replaceChildren();

  const result = transcript.result;
  const winner = result.fighters.find(
    (fighter) => fighter.slot === result.winner
  );
  const resultSection = createElement('section', 'result');
  const resultCopy = createElement('div');
  resultCopy.append(
    createElement('p', 'eyebrow', `Battle ${transcript.battleId}`),
    createElement('h2', undefined, `${winner?.id ?? result.winner} wins`),
    createElement(
      'p',
      'result-detail',
      `${result.reason.replaceAll('_', ' ')} · ${(result.completedMilliseconds / 1_000).toFixed(2)}s · ${transcript.timeline.length} events`
    )
  );
  const score = createElement('div', 'fighter-results');
  for (const fighter of result.fighters) {
    const card = createElement(
      'div',
      fighter.slot === result.winner ? 'winner' : 'loser'
    );
    card.append(
      createElement(
        'strong',
        undefined,
        `${fighter.slot.toUpperCase()} · ${fighter.combatRole ?? 'legacy'}`
      ),
      createElement(
        'span',
        undefined,
        `${fighter.finalHitPoints} / ${fighter.maxHitPoints} HP`
      ),
      createElement('span', undefined, `${fighter.damageDealt} damage`)
    );
    score.append(card);
  }
  resultSection.append(resultCopy, score);

  const summarySection = createElement('section', 'event-summary');
  summarySection.append(createElement('h2', undefined, 'Event summary'));
  const chips = createElement('div', 'event-chips');
  for (const [kind, count] of summarizeEvents(transcript.timeline)) {
    const chip = createElement('span', 'event-chip');
    chip.append(
      createElement('strong', undefined, String(count)),
      createElement('span', undefined, kind.replaceAll('_', ' '))
    );
    chips.append(chip);
  }
  summarySection.append(chips);

  const timelineSection = createElement('section', 'timeline-section');
  const timelineHeading = createElement('div', 'timeline-heading');
  timelineHeading.append(
    createElement('h2', undefined, 'Sparse timeline'),
    createElement(
      'span',
      transcript.eventsTruncated ? 'truncated' : 'complete',
      transcript.eventsTruncated ? 'Events truncated' : 'Complete transcript'
    )
  );
  const tableFrame = createElement('div', 'table-frame');
  const table = createElement('table');
  const tableHead = createElement('thead');
  const headRow = createElement('tr');
  for (const heading of ['Tick', 'Event', 'Actor', 'Payload']) {
    headRow.append(createElement('th', undefined, heading));
  }
  tableHead.append(headRow);
  const tableBody = createElement('tbody');
  for (const event of transcript.timeline) {
    const row = createElement('tr');
    const actor = 'actor' in event ? String(event.actor) : '—';
    for (const value of [
      String(event.tick),
      event.kind,
      actor,
      formatEventDetails(event),
    ]) {
      row.append(createElement('td', undefined, value));
    }
    tableBody.append(row);
  }
  table.append(tableHead, tableBody);
  tableFrame.append(table);
  timelineSection.append(timelineHeading, tableFrame);

  const rawTranscript = createElement('details', 'raw-transcript');
  rawTranscript.append(createElement('summary', undefined, 'Raw transcript JSON'));
  rawTranscript.append(
    createElement('pre', undefined, JSON.stringify(transcript, null, 2))
  );

  output.append(resultSection, summarySection, timelineSection, rawTranscript);
};

const runControls = requiredElement<HTMLFormElement>('#run-controls');
const seedInput = requiredElement<HTMLInputElement>('#seed');
const status = requiredElement<HTMLElement>('#status');
const output = requiredElement<HTMLElement>('#output');
const fighterA = createFighterEditor(
  requiredElement<HTMLElement>('#fighter-a'),
  'a',
  'brawler'
);
const fighterB = createFighterEditor(
  requiredElement<HTMLElement>('#fighter-b'),
  'b',
  'mage'
);

runControls.addEventListener('submit', (event) => {
  event.preventDefault();
  status.textContent = '';
  try {
    const transcript = simulateCombat({
      seed: seedInput.value,
      fighters: [
        {
          id: 'Inkhand Alpha',
          name: 'Inkhand Alpha',
          stats: readStats(fighterA),
          powerUpIds: [...fighterA.selectedPowerUps],
        },
        {
          id: 'Inkhand Beta',
          name: 'Inkhand Beta',
          stats: readStats(fighterB),
          powerUpIds: [...fighterB.selectedPowerUps],
        },
      ],
    });
    renderTranscript(output, transcript);
    status.textContent = `Simulation complete · transcript v${transcript.version}`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
    output.classList.add('empty');
    output.replaceChildren(
      createElement('p', undefined, 'Fix the highlighted configuration and run again.')
    );
  }
});

document.documentElement.dataset.combatLab = COMBAT_LAB_MARKER;
runControls.requestSubmit();
