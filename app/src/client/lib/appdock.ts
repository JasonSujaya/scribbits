import type { Scene } from 'phaser';
import { dailyDrawTabLabel, navigateToDailyDraw } from './draweligibility';
import { setGalleryTab } from './registry';
import { appTabBar, fadeToScene } from './ui';
import type { AppTabItem, AppTabKey } from './ui';
import { translate } from './localization';

type AppDockRoute = 'ArenaHome' | 'bag' | 'dailyDraw' | 'MyBattles' | 'Shop';

type AppDockDefinition = {
  key: AppTabKey;
  label: Parameters<typeof translate>[0];
  route: AppDockRoute;
};

const APP_DOCK_TABS: readonly AppDockDefinition[] = [
  { key: 'arena', label: 'nav.arena', route: 'ArenaHome' },
  { key: 'bag', label: 'nav.bag', route: 'bag' },
  { key: 'draw', label: 'nav.draw', route: 'dailyDraw' },
  { key: 'battles', label: 'nav.battles', route: 'MyBattles' },
  { key: 'shop', label: 'nav.shop', route: 'Shop' },
];

export type AppDockOverrides = Readonly<Partial<Record<AppTabKey, () => void>>>;

function followAppDockRoute(scene: Scene, route: AppDockRoute): void {
  if (route === 'dailyDraw') {
    navigateToDailyDraw(scene);
    return;
  }
  if (route === 'bag') {
    setGalleryTab(scene, 'collection');
    fadeToScene(scene, 'Gallery');
    return;
  }
  fadeToScene(scene, route);
}

export function appDock(
  scene: Scene,
  active: AppTabKey | null,
  overrides: AppDockOverrides = {}
): ReturnType<typeof appTabBar> {
  const tabs: AppTabItem[] = APP_DOCK_TABS.map((definition) => ({
    key: definition.key,
    ...(definition.key === 'draw'
      ? { visibleLabel: translate('nav.draw') }
      : {}),
    label:
      definition.key === 'draw'
        ? dailyDrawTabLabel(scene)
        : translate(definition.label),
    onClick:
      overrides[definition.key] ??
      (() => followAppDockRoute(scene, definition.route)),
  }));

  return appTabBar(scene, active, tabs);
}
