import type { Scene } from 'phaser';
import { dailyDrawTabLabel, navigateToDailyDraw } from './draweligibility';
import { appTabBar, fadeToScene } from './ui';
import type { AppTabItem, AppTabKey } from './ui';

type AppDockRoute =
  | 'ArenaHome'
  | 'Sketchbook'
  | 'dailyDraw'
  | 'MyBattles'
  | 'ScoutNotebook';

type AppDockDefinition = {
  key: AppTabKey;
  label: string;
  route: AppDockRoute;
};

const APP_DOCK_TABS: readonly AppDockDefinition[] = [
  { key: 'arena', label: 'Arena', route: 'ArenaHome' },
  { key: 'gallery', label: 'Gallery', route: 'Sketchbook' },
  { key: 'draw', label: 'Draw', route: 'dailyDraw' },
  { key: 'battles', label: 'Battles', route: 'MyBattles' },
  { key: 'scout', label: 'Scout', route: 'ScoutNotebook' },
];

export type AppDockOverrides = Readonly<Partial<Record<AppTabKey, () => void>>>;

function followAppDockRoute(scene: Scene, route: AppDockRoute): void {
  if (route === 'dailyDraw') {
    navigateToDailyDraw(scene);
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
