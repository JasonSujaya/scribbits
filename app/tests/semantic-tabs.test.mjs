import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
const compiledClientRoot = process.env.SCRIBBITS_COMPILED_CLIENT_ROOT;

if (!appRoot || !compiledClientRoot) {
  throw new Error(
    'Run semantic tab tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const typescript = require('typescript');
const semanticTabs = require(
  join(compiledClientRoot, 'lib', 'semantictabs.js')
);

const inspectImports = (source) => {
  const sourceFile = typescript.createSourceFile(
    'semantic-tab-consumer.ts',
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const imports = new Map();
  const visit = (node) => {
    if (
      typescript.isImportDeclaration(node) &&
      typescript.isStringLiteral(node.moduleSpecifier)
    ) {
      const importedNames =
        node.importClause?.namedBindings &&
        typescript.isNamedImports(node.importClause.namedBindings)
          ? node.importClause.namedBindings.elements.map((element) => ({
              imported: (element.propertyName ?? element.name).text,
              local: element.name.text,
            }))
          : [];
      imports.set(node.moduleSpecifier.text, [
        ...(imports.get(node.moduleSpecifier.text) ?? []),
        ...importedNames,
      ]);
    }
    typescript.forEachChild(node, visit);
  };
  visit(sourceFile);
  return imports;
};

test('Gallery and Scout share one semantic tab controller', () => {
  const semanticTabConsumers = [
    {
      name: 'Gallery',
      source: readFileSync(
        join(appRoot, 'src', 'client', 'scenes', 'Gallery.ts'),
        'utf8'
      ),
    },
    {
      name: 'Scout Notebook',
      source: readFileSync(
        join(appRoot, 'src', 'client', 'scenes', 'ScoutNotebook.ts'),
        'utf8'
      ),
    },
  ];
  const [galleryConsumer, scoutConsumer] = semanticTabConsumers;

  for (const consumer of semanticTabConsumers) {
    assert.ok(
      inspectImports(consumer.source)
        .get('../lib/semantictabs')
        ?.some(
          ({ imported, local }) =>
            imported === 'SemanticTabController' &&
            local === 'SemanticTabController'
        ),
      `${consumer.name} must import the canonical semantic tab controller`
    );
    for (const duplicatedTabToken of [
      'tablist',
      'tabpanel',
      'aria-selected',
      'ArrowLeft',
      'ArrowRight',
    ]) {
      assert.doesNotMatch(
        consumer.source,
        new RegExp(`["']${duplicatedTabToken}["']`),
        `${consumer.name} must not re-own ${duplicatedTabToken}`
      );
    }
  }

  assert.match(galleryConsumer.source, /focusedSectionTab/);
  assert.match(
    galleryConsumer.source,
    /if \(focusedSectionTab\) \{\s*this\.contentActionOverlay\?\.clearPendingFocusLabel\(\)/
  );
  assert.match(galleryConsumer.source, /focusedControlLabel\(\)/);
  assert.match(
    galleryConsumer.source,
    /new CanvasActionOverlay\(\s*this,\s*'gallery-content'\s*\)/
  );
  assert.match(
    galleryConsumer.source,
    /contentActionOverlay\?\.restoreControlFocus\(accessibleLabel\)/
  );
  assert.match(
    galleryConsumer.source,
    /if \(!restored\) this\.sectionPanel\?\.focus\(\)/
  );
  assert.match(
    galleryConsumer.source,
    /sectionTabControls\.get\(this\.tab\)\?\.focus\(\)/
  );
  assert.match(
    scoutConsumer.source,
    /dayTabControls\.get\(this\.selectedDay\)\?\.focus\(\)/
  );
  assert.match(
    galleryConsumer.source,
    /contentActionOverlay\.moveAfter\(this\.sectionSemanticOverlay\)/
  );
  assert.match(
    scoutConsumer.source,
    /tabsOverlay\.moveAfter\(this\.headerOverlay\)/
  );
  assert.match(
    scoutConsumer.source,
    /pageActionOverlay\.moveAfter\(this\.pageSemanticOverlay\)/
  );

  const originalDocument = globalThis.document;
  const fakeDocument = { activeElement: null };
  globalThis.document = fakeDocument;
  try {
    const controls = new Map();
    const selectedKeys = [];
    const makeControl = (key) => ({
      tabIndex: -1,
      focus() {
        fakeDocument.activeElement = this;
      },
      key,
    });
    for (const key of ['a', 'b', 'c']) controls.set(key, makeControl(key));
    const controller = new semanticTabs.SemanticTabController({
      keys: ['a', 'b', 'c'],
      selectedKey: 'b',
      listLabel: 'Sections',
      panelId: 'section-panel',
      tabId: (key) => `section-${key}`,
      onSelect: (key) => selectedKeys.push(key),
      resolveControl: (key) => controls.get(key),
    });
    assert.deepEqual(controller.listAttributes, {
      role: 'tablist',
      'aria-label': 'Sections',
    });
    assert.deepEqual(controller.attributesFor('b'), {
      id: 'section-b',
      role: 'tab',
      'aria-selected': 'true',
      'aria-controls': 'section-panel',
    });
    for (const key of ['a', 'b', 'c']) {
      controller.register(key, controls.get(key));
    }
    assert.deepEqual(
      ['a', 'b', 'c'].map((key) => controls.get(key).tabIndex),
      [-1, 0, -1]
    );
    let prevented = false;
    controller.handleKey(
      { key: 'ArrowRight', preventDefault: () => (prevented = true) },
      'b'
    );
    assert.equal(prevented, true);
    assert.deepEqual(selectedKeys, ['c']);
    assert.equal(fakeDocument.activeElement, controls.get('c'));
    controller.handleKey({ key: 'ArrowRight', preventDefault: () => {} }, 'c');
    assert.deepEqual(selectedKeys, ['c', 'a']);
    assert.equal(fakeDocument.activeElement, controls.get('a'));
    const panelAttributes = new Map();
    const panel = {
      id: '',
      tabIndex: -1,
      textContent: '',
      setAttribute(name, value) {
        panelAttributes.set(name, value);
      },
    };
    controller.configurePanel(panel, 'b', 'Selected section', {
      live: 'polite',
      atomic: true,
      ownedControlRootId: 'section-actions',
    });
    assert.equal(panel.id, 'section-panel');
    assert.equal(panel.textContent, 'Selected section');
    assert.equal(panel.tabIndex, 0);
    assert.deepEqual(Object.fromEntries(panelAttributes), {
      role: 'tabpanel',
      'aria-labelledby': 'section-b',
      'aria-live': 'polite',
      'aria-atomic': 'true',
      'aria-owns': 'section-actions',
    });
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
