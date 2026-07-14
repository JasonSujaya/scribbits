export type PluralMessage = Readonly<{
  zero?: string;
  one: string;
  other: string;
}>;

export type TranslationMessage = string | PluralMessage;

/**
 * English is the source catalog. Keys describe meaning instead of English
 * wording so translators can change sentence structure without changing code.
 */
export const englishMessages = {
  'app.name': 'Scribbits',
  'shell.rotate.title': 'Turn your phone upright',
  'shell.rotate.detail': 'Scribbits draws and fights best in portrait.',

  'nav.home': 'Home',
  'nav.arena': 'Arena',
  'nav.bag': 'Bag',
  'nav.draw': 'Draw',
  'nav.drawDone': 'Done',
  'nav.drawFull': 'Full',
  'nav.drawRefilling': 'Refilling',
  'nav.battles': 'Battles',
  'nav.shop': 'Shop',

  'drawEligibility.loading': 'Loading the arena…',
  'drawEligibility.signIn': 'Sign in to draw a Scribbit.',
  'drawEligibility.alreadyDrawn':
    'Today’s Scribbit is already in the Rumble. Draw again after UTC reset.',
  'drawEligibility.refilling':
    'No Draw Charges left. One refills every 8 hours.',
  'drawEligibility.full':
    'Your {capacity} growing Scribbit slots are full. Remove one or wait for one to mature.',

  'appMenu.title': 'SETTINGS',
  'appMenu.fieldGuide': 'FIELD GUIDE',
  'appMenu.close': 'Close',
  'appMenu.modalTitle': 'Settings',
  'appMenu.modalDescription': 'Open the Field Guide.',
  'appMenu.openFieldGuide': 'Open Field Guide',
  'appMenu.closeSettings': 'Close settings',
  'appMenu.openSettings': 'Open settings',

  'home.gallery': 'GALLERY',
  'home.openGallery': 'Open Gallery',

  'splash.tagline': 'Draw a Scribbit. Watch it fight.',
  'splash.showcase.sketchbook': 'FROM OUR SKETCHBOOK',
  'splash.showcase.community': 'FROM THE COMMUNITY',
  'splash.story.draw': 'DRAW IT',
  'splash.story.becomes': 'BECOMES',
  'splash.story.battle': 'BATTLE',
  'splash.story.matchup': 'A fresh matchup every visit.',
  'splash.battle.real': 'REAL BATTLE',
  'splash.battle.shared': 'SHARED BATTLE CLIP',
  'splash.battle.detail': 'Your drawing becomes the fighter.',
  'splash.action.enterArena': 'ENTER ARENA',
  'splash.action.drawToday': 'DRAW TODAY',
  'splash.action.continue': 'CONTINUE',
  'splash.error.expand': 'Scribbits could not open. Tap Continue to try again.',
  'splash.creation.fallbackAlt': '{name}, drawn in Scribbits',
  'splash.creation.communityAlt': '{name}, drawn by u/{artist}',
  'splash.creation.fallbackArtist': 'BY {artist}',
  'splash.creation.communityArtist': 'BY u/{artist}',

  'preloader.tagline': 'Draw it. Its shape becomes its stats.',
  'preloader.loading': 'Reading the forecast…',

  'screen.home': 'HOME',
  'screen.arena': 'ARENA',
  'screen.bag': 'BAG',
  'screen.gallery': 'GALLERY',
  'screen.draw': 'DRAW',
  'screen.practice': 'PRACTICE',
  'screen.battles': 'BATTLES',
  'screen.pastBattles': 'PAST BATTLES',
  'screen.shop': 'SHOP',
  'screen.scout': 'SCOUT',
  'screen.fieldGuide': 'FIELD GUIDE',

  'freeDraw.savedToday': 'SAVED TODAY',
  'freeDraw.practice': 'PRACTICE',

  'battles.loading': 'Loading fights…',
  'battles.empty': 'No fights yet.\nDraw a Scribbit to ring the bell.',
  'battles.summary': {
    one: '{count} FIGHT  ·  {record}',
    other: '{count} FIGHTS  ·  {record}',
  },
  'battles.watchMode': 'WATCH MODE',
  'battles.record': '{wins}W–{losses}L',
  'battles.pagination.previous': 'Previous battle page',
  'battles.pagination.next': 'Next battle page',
  'battles.filter.all': 'ALL SCRIBBITS',
  'battles.filter.selected': 'FILTER · {name}',
  'battles.filter.previous': 'Show previous Scribbit',
  'battles.filter.next': 'Show next Scribbit',
  'battles.card.win': '{name} WON',
  'battles.card.loss': '{name} LOST',
  'battles.card.result': '{name} RESULT',
  'battles.card.opponent': 'VS {name}',
  'battles.card.detail': '{finish} · DAY {day}',
  'battles.card.saved': 'SAVED',
  'battles.card.view': 'VIEW',
  'battles.history.back': 'Back to Arena',
  'battles.board.loading': 'Pinning up rivals…',
  'battles.board.empty': 'Draw a Scribbit before entering a Rival Run.',
  'battles.board.progress': '{completed}/3 COMPLETE · {score} PTS',
  'battles.board.fightingWith': 'FIGHTING WITH',
  'battles.board.chooseCharacter': 'Choose your fighting Scribbit',
  'battles.board.characterRecord': '{wins} WINS · {losses} LOSSES',
  'battles.board.tapToSwitch': 'TAP TO SWITCH FIGHTER',
  'battles.board.runLocked': 'RUN LOCKED',
  'battles.board.easy': 'EASY',
  'battles.board.medium': 'MEDIUM',
  'battles.board.hard': 'HARD',
  'battles.board.points': '+{points} {unit}',
  'battles.board.point': 'POINT',
  'battles.board.pointsPlural': 'POINTS',
  'battles.board.fight': 'FIGHT',
  'battles.board.completed': 'COMPLETED ✓',
  'battles.board.completedResult': '{outcome} · {points} PTS',
  'battles.board.win': 'WIN',
  'battles.board.loss': 'LOSS',
  'battles.board.past': 'PAST BATTLES',
  'battles.board.fightAccessible':
    'Fight {rival} with {challenger}. {difficulty}. Win {points} {unit}.',
  'battles.board.blank': 'The Rival Run came back blank. Try again.',
  'battles.board.wrongCharacter':
    'The Rival Run returned the wrong Scribbit. Try again.',
  'battles.board.dayChanged': 'A new Arena day started. Refreshing rivals…',
  'battles.board.starting': '{challenger} challenges {rival}…',

  'battle.health': '{current}/{maximum} HP',

  'scout.openCloutBoard': 'Open Clout board',
  'scout.loading': 'Loading scout notes…',

  'common.retry': 'Retry',

  'error.badRequest': 'That request was not understood. Try again.',
  'error.unauthorized': 'Sign in to continue.',
  'error.notFound': 'That item is no longer available.',
  'error.conflict': 'The arena changed. Try again.',
  'error.tooManyRequests': 'Too many attempts. Wait a moment and try again.',
  'error.payloadTooLarge': 'That drawing is too large to send.',
  'error.paymentRequired': 'You do not have enough Ink for that.',
  'error.serverError': 'The arena hit a snag. Try again.',
  'error.requestFailed': 'Request failed ({status})',
  'error.timeout': 'The arena is slow to respond. Try again.',
  'error.connection': 'Could not reach the arena. Check your connection.',
} as const satisfies Record<string, TranslationMessage>;

export type MessageKey = keyof typeof englishMessages;

/** A new production locale must intentionally provide every source key. */
export type TranslationCatalog = Readonly<
  Record<MessageKey, TranslationMessage>
>;
