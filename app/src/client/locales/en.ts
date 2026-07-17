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
  'nav.mystery': '???',
  'nav.lockedUntilProgress':
    '{destination}, locked. Keep playing to reveal it.',

  'drawEligibility.loading': 'Loading the arena…',
  'drawEligibility.signIn': 'Sign in to draw a Scribbit.',
  'drawEligibility.alreadyDrawn':
    'Today’s Scribbit is already in the Rumble. Draw again after UTC reset.',
  'drawEligibility.refilling':
    'No Draw Charges left. One refills every 8 hours.',
  'drawEligibility.full':
    'Your {capacity} growing Scribbit slots are full. Remove one or wait for one to mature.',

  'appMenu.title': 'SETTINGS',
  'appMenu.version': 'VERSION {version}',
  'appMenu.fieldGuide': 'FIGHTER STYLES',
  'appMenu.account': 'ACCOUNT',
  'appMenu.feedback': 'SEND A NOTE',
  'appMenu.close': 'Close',
  'appMenu.modalTitle': 'Settings',
  'appMenu.modalDescription':
    'Scribbits {version}. Open fighter rules, manage your data, or send feedback.',
  'appMenu.openFieldGuide': 'Open Who Beats Who guide',
  'appMenu.openAccount': 'Open Account',
  'appMenu.openFeedback': 'Open player feedback form',
  'appMenu.fieldGuideTitle': 'WHO BEATS WHO',
  'appMenu.fieldGuideSubtitle': 'Each style beats one and loses to one',
  'appMenu.fieldGuideDescription':
    'Brawler beats Mage. Mage beats Longshot. Longshot beats Brawler.',
  'appMenu.closeFieldGuide': 'Close Who Beats Who guide',
  'appMenu.moreRules': 'More rules',
  'appMenu.openMoreRules': 'Open the full fighter rules guide',
  'appMenu.closeSettings': 'Close settings',
  'appMenu.openSettings': 'Open settings',

  'home.gallery': 'GALLERY',
  'home.openGallery': 'Open Gallery',

  'splash.invite.gameType': 'A REDDIT DRAWING GAME',
  'splash.invite.promise': 'YOUR DRAWING BECOMES THE FIGHTER.',
  'splash.invite.hook': 'DRAW A SCRIBBIT. WATCH IT FIGHT.',
  'splash.showcase.sketchbook': 'FROM OUR SKETCHBOOK',
  'splash.showcase.community': 'DRAWN BY THE COMMUNITY',
  'splash.showcase.shared': 'WATCH THIS ONE FIGHT',
  'splash.action.drawYours': 'DRAW YOURS',
  'splash.action.backToYours': 'BACK TO YOUR GUY',
  'splash.action.opening': 'OPENING…',
  'splash.error.expand':
    'Scribbits could not open. Tap Draw Yours to try again.',
  'splash.creation.fallbackAlt': '{name}, drawn in Scribbits',
  'splash.creation.communityAlt': '{name}, drawn by u/{artist}',
  'splash.creation.fallbackArtist': 'BY {artist}',
  'splash.creation.communityArtist': 'BY u/{artist}',

  'preloader.tagline': 'Draw it. Its shape becomes its stats.',
  'preloader.loading': 'Reading the forecast…',
  'preloader.preparing': 'Preparing pages and artwork…',
  'preloader.progressLabel': 'Opening Scribbits',
  'preloader.tipLabel': 'SCRIBBIT TIP',
  'preloader.tipShape': 'Your drawing’s shape decides how it fights.',
  'preloader.tipColor': 'Your colors help choose your fighter style.',
  'preloader.tipGear': 'Battles earn Ink. Ink opens Mystery Gear.',
  'preloader.tipLife': 'Every Scribbit grows up and leaves a story behind.',
  'preloader.ready': 'Your Home is ready!',
  'preloader.start': 'ENTER HOME',
  'preloader.retry': 'TRY AGAIN',
  'preloader.error.load':
    'The game could not finish loading. Check your connection and retry.',
  'preloader.error.artwork': 'The game artwork did not finish loading.',

  'screen.home': 'HOME',
  'screen.arena': 'ARENA',
  'screen.bag': 'BAG',
  'screen.gallery': 'GALLERY',
  'gallery.backToHome': 'Back to Home',
  'screen.draw': 'DRAW',
  'screen.practice': 'PRACTICE',
  'screen.battles': 'BATTLES',
  'screen.pastBattles': 'PAST BATTLES',
  'screen.shop': 'SHOP',
  'screen.scout': 'SCOUT',
  'screen.fieldGuide': 'WHO BEATS WHO',

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
  'battles.card.saved': 'NO REPLAY',
  'battles.card.view': 'RESULT',
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
  'error.forbidden': 'This account cannot play Scribbits.',
  'error.notFound': 'That item is no longer available.',
  'error.conflict': 'The arena changed. Try again.',
  'error.busy': 'Another game action is finishing. Try again.',
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
