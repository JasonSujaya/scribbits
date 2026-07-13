import type { Scene } from 'phaser';
import { dailyDrawTabLabel, navigateToDailyDraw } from './draweligibility';
import { setGalleryTab } from './registry';
import { appTabBar, fadeToScene } from './ui';
import type { AppTabItem, AppTabKey } from './ui';

type AppDockRoute =
  | 'ArenaHome'
  | 'bag'
  | 'gallery'
  | 'dailyDraw'
  | 'MyBattles';

type AppDockDefinition = {
  key: AppTabKey;
  label: string;
  route: AppDockRoute;
};

const APP_DOCK_TABS: readonly AppDockDefinition[] = [
  { key: 'arena', label: 'Arena', route: 'ArenaHome' },
  { key: 'bag', label: 'Bag', route: 'bag' },
  { key: 'draw', label: 'Draw', route: 'dailyDraw' },
  { key: 'battles', label: 'Battles', route: 'MyBattles' },
  { key: 'gallery', label: 'Gallery', route: 'gallery' },
];

export type AppDockOverrides = Readonly<Partial<Record<AppTabKey, () => void>>>;

function followAppDockRoute(scene: Scene, route: AppDockRoute): void {
  if (route === 'dailyDraw') {
    navigateToDailyDraw(scene);
    return;
  }
  if (route === 'bag' || route === 'gallery') {
    setGalleryTab(scene, route === 'bag' ? 'collection' : 'legends');
    fadeToScene(scene, 'Gallery');
    return;
  }
  fadeToScene(scene, route);
}

export function appDock(
  scene: Scene,
  active: AppTabKey,
  overrides: AppDockOverrides = {}
): ReturnType<typeof appTabBar> {
  const tabs: AppTabItem[] = APP_DOCK_TABS.map((definition) => ({
    key: definition.key,
    label:
      definition.key === 'draw' ? dailyDrawTabLabel(scene) : definition.label,
    onClick:
      overrides[definition.key] ??
      (() => followAppDockRoute(scene, definition.route)),
  }));

  return appTabBar(scene, active, tabs);
}
