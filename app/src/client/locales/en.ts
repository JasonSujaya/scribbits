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

  'nav.arena': 'Arena',
  'nav.bag': 'Bag',
  'nav.draw': 'Draw',
  'nav.drawDone': 'Done',
  'nav.drawFull': 'Full',
  'nav.battles': 'Battles',
  'nav.shop': 'Shop',

  'drawEligibility.loading': 'Loading the arena…',
  'drawEligibility.signIn': 'Sign in to draw a Scribbit.',
  'drawEligibility.alreadyDrawn':
    'Today’s Scribbit is already in the Rumble. Draw again after UTC reset.',
  'drawEligibility.full':
    'Your three living Scribbit slots are full. Remove one or wait for one to fade.',

  'appMenu.title': 'SETTINGS',
  'appMenu.gallery': 'GALLERY',
  'appMenu.fieldGuide': 'FIELD GUIDE',
  'appMenu.close': 'Close',
  'appMenu.modalTitle': 'Settings',
  'appMenu.modalDescription': 'Open Gallery or the Field Guide.',
  'appMenu.openGallery': 'Open Gallery',
  'appMenu.openFieldGuide': 'Open Field Guide',
  'appMenu.closeSettings': 'Close settings',
  'appMenu.openSettings': 'Open settings and Gallery',

  'splash.tagline': 'Draw a Scribbit. Watch it fight.',
  'splash.showcase.sketchbook': 'FROM OUR SKETCHBOOK',
  'splash.showcase.community': 'FROM THE COMMUNITY',
  'splash.action.enterArena': 'ENTER ARENA',
  'splash.action.drawToday': 'DRAW TODAY',
  'splash.action.continue': 'CONTINUE',
  'splash.creation.fallbackAlt': '{name}, drawn in Scribbits',
  'splash.creation.communityAlt': '{name}, drawn by u/{artist}',
  'splash.creation.fallbackArtist': 'BY {artist}',
  'splash.creation.communityArtist': 'BY u/{artist}',

  'preloader.tagline': 'Draw it. Its shape becomes its stats.',
  'preloader.loading': 'Reading the forecast…',

  'screen.arena': 'ARENA',
  'screen.bag': 'BAG',
  'screen.gallery': 'GALLERY',
  'screen.draw': 'DRAW',
  'screen.practice': 'PRACTICE',
  'screen.battles': 'BATTLES',
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
