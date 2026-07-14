import type { Scene } from 'phaser';
import { setGalleryTab } from './registry';
import { appTabBar, startScene } from './ui';
import type { AppTabItem, AppTabKey } from './ui';
import { translate } from './localization';

type AppDockRoute =
  | 'ScribbitHome'
  | 'ArenaHome'
  | 'bag'
  | 'MyBattles'
  | 'Shop';

type AppDockDefinition = {
  key: AppTabKey;
  label: Parameters<typeof translate>[0];
  route: AppDockRoute;
};

const APP_DOCK_TABS: readonly AppDockDefinition[] = [
  { key: 'arena', label: 'nav.arena', route: 'ArenaHome' },
  { key: 'bag', label: 'nav.bag', route: 'bag' },
  { key: 'home', label: 'nav.home', route: 'ScribbitHome' },
  { key: 'battles', label: 'nav.battles', route: 'MyBattles' },
  { key: 'shop', label: 'nav.shop', route: 'Shop' },
];

export type AppDockOverrides = Readonly<Partial<Record<AppTabKey, () => void>>>;

function followAppDockRoute(scene: Scene, route: AppDockRoute): void {
  if (route === 'bag') {
    setGalleryTab(scene, 'collection');
    startScene(scene, 'Gallery');
    return;
  }
  startScene(scene, route);
}

export function appDock(
  scene: Scene,
  active: AppTabKey | null,
  overrides: AppDockOverrides = {}
): ReturnType<typeof appTabBar> {
  const tabs: AppTabItem[] = APP_DOCK_TABS.map((definition) => ({
    key: definition.key,
    label: translate(definition.label),
    onClick:
      overrides[definition.key] ??
      (() => followAppDockRoute(scene, definition.route)),
  }));

  return appTabBar(scene, active, tabs);
}
