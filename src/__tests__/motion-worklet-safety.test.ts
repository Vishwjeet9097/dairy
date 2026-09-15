/// <reference types="jest" />

/**
 * Guards a crash class that runtime tests cannot see.
 *
 * Reanimated has to be mocked under Jest (its worklets module needs a native
 * runtime), and the mock evaluates every worklet on the JS thread. That makes
 * this whole category of bug invisible to the other suites:
 *
 *   [Worklets] Tried to synchronously call a Remote Function.
 *              Called "spring" on the UI Runtime.
 *
 * It happens because worklets execute on Reanimated's own runtime, where an
 * ordinary JavaScript function is a "remote function" that cannot be called
 * synchronously. A worklet may *capture* a plain object; it may not *call* a
 * function to build one.
 *
 * This shipped and crashed on a device: `Toggle` called `spring(Spring.snappy)`
 * inside `useDerivedValue`, so every visit to Settings threw. Three other sites
 * had the same defect — the dialog mapper, the sheet's gesture handler, and
 * `AnimatedValueText`'s completion callback (which renders every balance in the
 * app).
 *
 * The rule these tests enforce:
 *   1. Animation configs exported from `constants/motion` are values, not factories.
 *   2. `timing()` / `spring()` are only ever invoked in a module-scope constant.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  DialogTransition,
  ErrorAnimation,
  ListTransition,
  Press,
  SheetTransition,
  SuccessAnimation,
  Timing,
  ValueTransition,
} from '@/constants/motion';

/* ─── 1. Configs must be values ──────────────────────────────────────────── */

describe('motion configs are worklet-capturable values', () => {
  const namespaces = {
    Timing,
    SheetTransition,
    ListTransition,
    DialogTransition,
    SuccessAnimation,
    ErrorAnimation,
    ValueTransition,
    Press,
  };

  it.each(Object.entries(namespaces))('%s exposes no factory functions', (_name, namespace) => {
    for (const [key, value] of Object.entries(namespace)) {
      // `Stagger.delay` is a helper called on the JS thread only, never captured
      // into a worklet, so it is allowed to be a function.
      if (key === 'stagger') continue;

      expect(typeof value).not.toBe('function');
    }
  });

  it('produces timing configs Reanimated can consume', () => {
    // `easing` is an EasingFunctionFactory (`{ factory }`) which `withTiming`
    // resolves on the UI thread — that object is itself worklet-safe.
    for (const config of [
      Timing.normal,
      SheetTransition.close,
      DialogTransition.enter,
      ValueTransition.enter,
      SuccessAnimation.pulseIn,
    ]) {
      expect(config).toHaveProperty('duration');
      expect(config).toHaveProperty('easing');
      expect(config).toHaveProperty('reduceMotion', 'system');
    }
  });

  it('produces spring configs with the physical properties, not a curve', () => {
    expect(SheetTransition.open).toMatchObject({
      damping: expect.any(Number),
      stiffness: expect.any(Number),
      mass: expect.any(Number),
      reduceMotion: 'system',
    });
  });

  it('carries reduceMotion on every config, so the OS setting is honoured', () => {
    const configs = [
      Timing.fast,
      Timing.normal,
      Timing.slow,
      Timing.enter,
      Timing.exit,
      Timing.press,
      Timing.chrome,
      Timing.feedback,
      Timing.value,
      SheetTransition.open,
      SheetTransition.close,
      SheetTransition.backdrop,
      ListTransition.enter,
      ListTransition.exit,
      ListTransition.reorder,
      DialogTransition.enter,
      DialogTransition.exit,
      SuccessAnimation.enter,
      SuccessAnimation.exit,
      SuccessAnimation.pulseIn,
      SuccessAnimation.pulseOut,
      ErrorAnimation.enter,
      ErrorAnimation.exit,
      ValueTransition.enter,
      ValueTransition.exit,
    ];

    for (const config of configs) {
      expect(config).toHaveProperty('reduceMotion', 'system');
    }
  });
});

/* ─── 2. Builders may only be called at module scope ─────────────────────── */

describe('timing() and spring() are never called from a worklet', () => {
  const ROOTS = ['src/components', 'src/navigation', 'src/app'];

  function sourceFiles(dir: string): string[] {
    const absolute = path.join(process.cwd(), dir);
    if (!fs.existsSync(absolute)) return [];

    const found: string[] = [];
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        found.push(...sourceFiles(relative));
      } else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
        found.push(relative);
      }
    }
    return found;
  }

  const files = ROOTS.flatMap(sourceFiles);

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  /**
   * Blanks out comments while preserving line numbering, so prose that merely
   * mentions `timing(...)` or the word "spring" is not mistaken for code. The
   * comments in these files explain this very bug, so without this the check
   * flags its own documentation.
   */
  function stripComments(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
      .replace(/\/\/.*$/gm, '');
  }

  it.each(files)('%s calls the builders only in a module-scope const', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const lines = stripComments(source).split('\n');

    lines.forEach((code, index) => {
      // `timing(` / `spring(` invoked anywhere...
      if (!/\b(timing|spring)\s*\(/.test(code)) return;

      // ...is only allowed as a module-scope constant, which is unindented.
      const isModuleScopeConst = /^(export\s+)?const\s+\w+\s*(:[^=]+)?=\s*(timing|spring)\s*\(/.test(
        code,
      );

      if (!isModuleScopeConst) {
        throw new Error(
          [
            `${file}:${index + 1} calls a motion builder outside a module-scope const.`,
            `  ${code.trim()}`,
            '',
            'Worklets cannot call JavaScript functions. Build the config once at',
            'module scope (or add it to constants/motion.ts) and reference the value.',
          ].join('\n'),
        );
      }
    });
  });

  it.each(files)('%s does not invoke a motion namespace as a factory', (file) => {
    const source = stripComments(
      fs.readFileSync(path.join(process.cwd(), file), 'utf8'),
    );

    // Catches the exact regression: `SheetTransition.open()`, `DialogTransition.enter()`,
    // `SuccessAnimation.pulseIn()` — all of which used to be factories.
    const offender = source.match(
      /\b(SheetTransition|ListTransition|DialogTransition|SuccessAnimation|ErrorAnimation|ValueTransition|Timing)\.\w+\s*\(/,
    );

    expect(offender?.[0] ?? null).toBeNull();
  });
});
