import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.env.SCRIBBITS_APP_ROOT;
if (!appRoot) {
  throw new Error(
    'Run localized shell tests through scripts/run-test-suites.mjs.'
  );
}

const require = createRequire(import.meta.url);
const typescript = require('typescript');
const localizedModules = [
  'src/client/lib/appdock.ts',
  'src/client/lib/appmenu.ts',
  'src/client/lib/draweligibility.ts',
  'src/client/scenes/Preloader.ts',
  'src/client/splash.ts',
];
const callArgumentByName = new Map([
  ['label', 3],
  ['iconButton', 4],
  ['screenTitle', 3],
  ['showToast', 0],
]);
const playerCopyProperties = new Set([
  'accessibleLabel',
  'description',
  'emptyText',
  'label',
  'listLabel',
  'message',
]);

const isVisibleLiteral = (node) => {
  if (!typescript.isStringLiteralLike(node)) return false;
  return (
    /[a-zA-Z]/.test(node.text) && !/^[a-z]+(?:\.[a-zA-Z]+)+$/.test(node.text)
  );
};

const findRawPlayerCopy = (relativePath) => {
  const source = readFileSync(join(appRoot, relativePath), 'utf8');
  const sourceFile = typescript.createSourceFile(
    relativePath,
    source,
    typescript.ScriptTarget.Latest,
    true,
    typescript.ScriptKind.TS
  );
  const violations = [];
  const report = (node, sink) => {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    violations.push(`${relativePath}:${line + 1} ${sink}: ${node.getText()}`);
  };
  const visit = (node) => {
    if (typescript.isCallExpression(node)) {
      const callName = typescript.isIdentifier(node.expression)
        ? node.expression.text
        : typescript.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : null;
      const argumentIndex = callName ? callArgumentByName.get(callName) : null;
      if (argumentIndex !== null && argumentIndex !== undefined) {
        const argument = node.arguments[argumentIndex];
        if (argument && isVisibleLiteral(argument)) report(argument, callName);
      }
      if (callName === 'text') {
        const argument = node.arguments[2];
        if (argument && isVisibleLiteral(argument)) report(argument, 'text');
      }
      if (callName === 'setText') {
        const argument = node.arguments[0];
        if (argument && isVisibleLiteral(argument)) report(argument, 'setText');
      }
    }
    if (
      typescript.isPropertyAssignment(node) &&
      (typescript.isIdentifier(node.name) ||
        typescript.isStringLiteral(node.name)) &&
      playerCopyProperties.has(node.name.text) &&
      isVisibleLiteral(node.initializer)
    ) {
      report(node.initializer, node.name.text);
    }
    if (
      typescript.isBinaryExpression(node) &&
      node.operatorToken.kind === typescript.SyntaxKind.EqualsToken &&
      typescript.isPropertyAccessExpression(node.left) &&
      node.left.name.text === 'textContent' &&
      isVisibleLiteral(node.right)
    ) {
      report(node.right, 'textContent');
    }
    typescript.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
};

test('migrated shell modules cannot add raw player-facing copy', () => {
  const violations = localizedModules.flatMap(findRawPlayerCopy);
  assert.deepEqual(violations, []);
});

test('HTML entrypoints keep English fallback copy annotated for localization', () => {
  const gameHtml = readFileSync(join(appRoot, 'src/client/game.html'), 'utf8');
  const splashHtml = readFileSync(
    join(appRoot, 'src/client/splash.html'),
    'utf8'
  );
  for (const [source, keys] of [
    [gameHtml, ['app.name', 'shell.rotate.title', 'shell.rotate.detail']],
    [
      splashHtml,
      [
        'app.name',
        'splash.tagline',
        'splash.showcase.sketchbook',
        'splash.action.enterArena',
      ],
    ],
  ]) {
    for (const key of keys) {
      assert.match(source, new RegExp(`data-i18n=["']${key}["']`));
    }
  }
});
