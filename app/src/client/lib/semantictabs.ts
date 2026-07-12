export type SemanticTabKey = string | number;

export type SemanticTabControllerOptions<Key extends SemanticTabKey> = Readonly<{
  keys: readonly Key[];
  selectedKey: Key;
  listLabel: string;
  panelId: string;
  tabId: (key: Key) => string;
  onSelect: (key: Key) => void;
  resolveControl: (key: Key) => HTMLButtonElement | undefined;
}>;

/** One owner for canvas-backed tab roles, roving focus, keys, and panels. */
export class SemanticTabController<Key extends SemanticTabKey> {
  readonly listAttributes: Readonly<Record<string, string>>;

  constructor(private readonly options: SemanticTabControllerOptions<Key>) {
    this.listAttributes = {
      role: 'tablist',
      'aria-label': options.listLabel,
    };
  }

  attributesFor(key: Key): Readonly<Record<string, string>> {
    return {
      id: this.options.tabId(key),
      role: 'tab',
      'aria-selected': key === this.options.selectedKey ? 'true' : 'false',
      'aria-controls': this.options.panelId,
    };
  }

  register(key: Key, control: HTMLButtonElement): void {
    control.tabIndex = key === this.options.selectedKey ? 0 : -1;
  }

  activate(key: Key): void {
    const restoreFocus =
      document.activeElement === this.options.resolveControl(key);
    this.options.onSelect(key);
    if (restoreFocus) this.options.resolveControl(key)?.focus();
  }

  handleKey(event: KeyboardEvent, key: Key): void {
    const index = this.options.keys.indexOf(key);
    if (index < 0) return;
    let targetIndex: number | null = null;
    if (event.key === 'ArrowLeft') {
      targetIndex = (index - 1 + this.options.keys.length) % this.options.keys.length;
    }
    if (event.key === 'ArrowRight') {
      targetIndex = (index + 1) % this.options.keys.length;
    }
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = this.options.keys.length - 1;
    if (targetIndex === null) return;
    const targetKey = this.options.keys[targetIndex];
    if (targetKey === undefined) return;
    event.preventDefault();
    this.options.onSelect(targetKey);
    this.options.resolveControl(targetKey)?.focus();
  }

  configurePanel(
    panel: HTMLElement,
    key: Key,
    text: string,
    options: Readonly<{
      live?: 'polite';
      atomic?: boolean;
      ownedControlRootId?: string;
    }> = {}
  ): void {
    panel.id = this.options.panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', this.options.tabId(key));
    if (options.live) panel.setAttribute('aria-live', options.live);
    if (options.atomic) panel.setAttribute('aria-atomic', 'true');
    if (options.ownedControlRootId) {
      panel.setAttribute('aria-owns', options.ownedControlRootId);
    }
    panel.tabIndex = 0;
    panel.textContent = text;
  }
}
