import type { OverlayRect } from './overlay';
import { DOM_TYPE, FONT_STACK, UI } from './theme';
import { DRAW_START_CARD_ART_URL } from './visualassets';

const DRAW_CLOSE_BUTTON_ART_URL = new URL(
  '../assets/ui-button-close.webp',
  import.meta.url
).href;

export type DrawStartOverlayOptions = Readonly<{
  viewport: Readonly<{ width: number; height: number }>;
  canvasRect: OverlayRect;
  prompt: string;
  accessibleDescription: string;
  contextLabel: string;
  tapeLabel: string;
  timed: boolean;
  reducedMotion: boolean;
  allowFreeDraw: boolean;
  communityThemeAvailable: boolean;
  communityThemeUnavailableMessage: string;
  onClose: () => void;
  onStartTheme: () => void | Promise<void>;
  onStartFreeDraw: () => void;
}>;

export type DrawStartOverlay = Readonly<{
  element: HTMLDivElement;
  placement: OverlayRect;
  appendCountdown: (element: HTMLElement) => void;
  setVisible: (requestedVisible: boolean, countdownActive: boolean) => void;
  focusStart: () => void;
  destroy: () => void;
}>;

export const createDrawClockIcon = (size: number): HTMLSpanElement => {
  const icon = document.createElement('span');
  Object.assign(icon.style, {
    position: 'relative',
    width: `${size}px`,
    height: `${size}px`,
    flex: `0 0 ${size}px`,
    border: `${Math.max(3, Math.round(size * 0.1))}px solid ${UI.ink}`,
    borderRadius: '50%',
    background: '#ffd447',
    boxSizing: 'border-box',
  });
  const hourHand = document.createElement('span');
  Object.assign(hourHand.style, {
    position: 'absolute',
    left: 'calc(50% - 2px)',
    top: '17%',
    width: '4px',
    height: '33%',
    borderRadius: '2px',
    background: UI.ink,
  });
  const minuteHand = document.createElement('span');
  minuteHand.className = 'draw-clock-minute-hand';
  Object.assign(minuteHand.style, {
    position: 'absolute',
    left: 'calc(50% - 2px)',
    top: 'calc(50% - 2px)',
    width: '29%',
    height: '4px',
    borderRadius: '2px',
    background: UI.ink,
    transform: 'rotate(24deg)',
    transformOrigin: '2px 2px',
  });
  icon.append(hourHand, minuteHand);
  return icon;
};

const createThemeArtMotionLayer = (
  motionClassName: string,
  clipPath: string,
  transformOrigin: string
): HTMLDivElement => {
  const artLayer = document.createElement('div');
  artLayer.className = `draw-theme-art-piece ${motionClassName}`;
  artLayer.setAttribute('aria-hidden', 'true');
  Object.assign(artLayer.style, {
    backgroundImage: `url(${DRAW_START_CARD_ART_URL})`,
    clipPath,
    transformOrigin,
  });
  return artLayer;
};

const createThemeJourneyStrip = (): HTMLDivElement => {
  const journey = document.createElement('div');
  journey.className = 'draw-theme-journey';
  journey.setAttribute('aria-hidden', 'true');
  Object.assign(journey.style, {
    width: '94%',
    marginTop: '14px',
    padding: '12px 10px 10px',
    display: 'grid',
    gridTemplateColumns: '1fr 34px 1fr 34px 1fr',
    alignItems: 'start',
    boxSizing: 'border-box',
    borderTop: `2px dashed ${UI.coralText}`,
    borderBottom: `2px dashed ${UI.coralText}`,
    background: 'rgba(255, 247, 232, 0.34)',
    transform: 'rotate(-0.35deg)',
  });

  const steps = ['DRAW', 'NAME', 'RUMBLE'] as const;
  steps.forEach((step, index) => {
    const stepContainer = document.createElement('div');
    stepContainer.className = 'draw-theme-journey-step';
    stepContainer.style.setProperty(
      '--draw-theme-step-delay',
      `${index * 0.58}s`
    );
    Object.assign(stepContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: '0',
    });

    const number = document.createElement('span');
    number.className = 'draw-theme-journey-number';
    number.textContent = String(index + 1);
    number.style.setProperty(
      '--draw-theme-step-rotation',
      index === 1 ? '2deg' : '-2deg'
    );
    Object.assign(number.style, {
      width: '38px',
      height: '38px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `3px solid ${UI.coralText}`,
      borderRadius: index === 1 ? '46% 54% 48% 52%' : '50%',
      background: 'rgba(255, 247, 232, 0.88)',
      color: UI.coralText,
      boxShadow: '1px 2px 0 rgba(43, 32, 22, 0.2)',
      ...DOM_TYPE.caption,
      fontSize: '20px',
    });

    const stepLabel = document.createElement('span');
    stepLabel.className = 'draw-theme-journey-label';
    stepLabel.textContent = step;
    Object.assign(stepLabel.style, {
      marginTop: '5px',
      color: UI.ink,
      ...DOM_TYPE.caption,
      fontSize: '18px',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
    });
    stepContainer.append(number, stepLabel);
    journey.append(stepContainer);

    if (index < steps.length - 1) {
      const connector = document.createElement('span');
      connector.className = 'draw-theme-journey-connector';
      connector.style.setProperty(
        '--draw-theme-connector-rotation',
        index === 0 ? '-3deg' : '3deg'
      );
      connector.style.setProperty(
        '--draw-theme-connector-delay',
        `${0.34 + index * 0.58}s`
      );
      Object.assign(connector.style, {
        width: '100%',
        marginTop: '20px',
        height: '3px',
        backgroundImage: `repeating-linear-gradient(90deg, ${UI.ink} 0 8px, transparent 8px 14px)`,
        backgroundSize: '28px 3px',
        opacity: '0.52',
      });
      journey.append(connector);
    }
  });
  return journey;
};

export const createDrawStartOverlay = (
  options: DrawStartOverlayOptions
): DrawStartOverlay => {
  const overlay = document.createElement('div');
  if (options.timed) {
    overlay.className = options.reducedMotion
      ? 'draw-theme-overlay draw-theme-reduced-motion'
      : 'draw-theme-overlay';
  }
  overlay.setAttribute('role', options.timed ? 'group' : 'note');
  overlay.setAttribute('aria-label', options.accessibleDescription);
  Object.assign(overlay.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: UI.ink,
    transition: options.reducedMotion ? 'none' : 'opacity 180ms ease-out',
    ...(options.timed
      ? {
          flexDirection: 'column',
          gap: '12px',
          padding: '24px 20px',
          background: 'rgba(31, 24, 18, 0.82)',
          backdropFilter: 'blur(4px) saturate(0.65)',
          WebkitBackdropFilter: 'blur(4px) saturate(0.65)',
        }
      : {}),
  });

  const card = document.createElement('div');
  if (options.timed) card.className = 'draw-theme-card';
  Object.assign(
    card.style,
    options.timed
      ? {
          position: 'relative',
          width: 'min(88%, 635px)',
          maxHeight: 'calc(100% - 190px)',
          aspectRatio: '719 / 1200',
          backgroundColor: UI.cream,
          backgroundImage: `url(${DRAW_START_CARD_ART_URL})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
          borderRadius: '28px',
          boxShadow: '0 24px 54px rgba(13, 9, 6, 0.52)',
          filter: 'drop-shadow(0 4px 0 rgba(43, 32, 22, 0.38))',
          fontFamily: FONT_STACK,
          overflow: 'hidden',
        }
      : {
          width: '74%',
          padding: '12px 14px',
          background: 'rgba(255, 247, 232, 0.9)',
          border: `2px solid ${UI.coralText}`,
          borderRadius: '14px',
          boxShadow: '0 5px 0 rgba(43, 32, 22, 0.12)',
          fontFamily: FONT_STACK,
        }
  );
  const copy = document.createElement('div');
  if (options.timed) copy.className = 'draw-theme-copy';
  Object.assign(
    copy.style,
    options.timed
      ? {
          position: 'absolute',
          top: '40%',
          right: '9%',
          bottom: '24%',
          left: '9%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }
      : {}
  );

  let startButton: HTMLButtonElement | null = null;
  let freeDrawButton: HTMLButtonElement | null = null;
  if (options.timed) {
    if (!options.reducedMotion) {
      card.append(
        createThemeArtMotionLayer(
          'draw-theme-art-crayon',
          'polygon(10% 34%, 9% 30%, 13% 27%, 29% 21%, 34% 22%, 35% 25%, 29% 29%, 15% 34%)',
          '22% 27%'
        ),
        createThemeArtMotionLayer(
          'draw-theme-art-star-top',
          'polygon(82% 30%, 84% 26%, 87% 25%, 89% 21%, 92% 25%, 96% 27%, 93% 30%, 91% 33%, 87% 31%)',
          '89% 28%'
        ),
        createThemeArtMotionLayer(
          'draw-theme-art-star-bottom',
          'polygon(2% 93%, 4% 89%, 7% 88%, 9% 85%, 12% 89%, 15% 91%, 12% 94%, 9% 96%, 6% 94%)',
          '8% 92%'
        )
      );
    }

    const tapeLabel = document.createElement('div');
    tapeLabel.className = 'draw-theme-tape-label';
    tapeLabel.setAttribute('aria-hidden', 'true');
    tapeLabel.textContent = options.tapeLabel;
    Object.assign(tapeLabel.style, {
      position: 'absolute',
      top: '2.1%',
      right: '30%',
      left: '30%',
      height: '5.8%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: UI.ink,
      ...DOM_TYPE.caption,
      fontSize: '24px',
      letterSpacing: '0.8px',
      textAlign: 'center',
      textShadow: '0 2px 0 rgba(255, 247, 232, 0.32)',
      transform: 'rotate(-0.5deg)',
      pointerEvents: 'none',
      zIndex: '2',
    });
    card.append(tapeLabel);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close drawing theme');
    Object.assign(closeButton.style, {
      position: 'absolute',
      top: '1.8%',
      right: '2.8%',
      zIndex: '2',
      width: '58px',
      height: '58px',
      padding: '0',
      border: '0',
      background: `transparent url(${DRAW_CLOSE_BUTTON_ART_URL}) center / 100% 100% no-repeat`,
      cursor: 'pointer',
      filter: 'drop-shadow(0 3px 0 rgba(43, 32, 22, 0.28))',
      touchAction: 'manipulation',
      pointerEvents: 'auto',
    });
    closeButton.addEventListener('pointerdown', () => {
      closeButton.style.transform = 'translateY(2px) scale(0.94)';
    });
    const releaseCloseButton = (): void => {
      closeButton.style.transform = 'translateY(0) scale(1)';
    };
    closeButton.addEventListener('pointerup', releaseCloseButton);
    closeButton.addEventListener('pointercancel', releaseCloseButton);
    closeButton.addEventListener('pointerleave', releaseCloseButton);
    closeButton.addEventListener('click', options.onClose);
    card.append(closeButton);
  }

  const context = document.createElement('div');
  if (options.timed) context.className = 'draw-theme-context';
  context.textContent = options.contextLabel;
  Object.assign(context.style, {
    ...DOM_TYPE.caption,
    color: UI.coralText,
    marginBottom: options.timed ? '8px' : '5px',
    ...(options.timed
      ? {
          padding: '7px 16px',
          border: `2px solid ${UI.coralText}`,
          borderRadius: '999px',
          background: 'rgba(255, 107, 74, 0.09)',
          fontSize: '22px',
        }
      : {}),
  });
  const prompt = document.createElement('div');
  if (options.timed) prompt.className = 'draw-theme-prompt';
  prompt.textContent = options.prompt;
  Object.assign(prompt.style, {
    ...DOM_TYPE.title,
    ...(options.timed
      ? {
          maxWidth: '100%',
          fontSize: '40px',
          lineHeight: '1.05',
          textWrap: 'balance',
          textShadow: '0 3px 0 rgba(255, 247, 232, 0.82)',
        }
      : {}),
  });
  copy.append(context, prompt);
  if (options.timed) copy.append(createThemeJourneyStrip());
  card.append(copy);

  if (options.timed) {
    startButton = document.createElement('button');
    startButton.className = 'draw-theme-start-button';
    startButton.type = 'button';
    startButton.dataset.sfxCue = 'none';
    startButton.textContent = 'START THEME';
    startButton.setAttribute(
      'aria-label',
      options.communityThemeAvailable
        ? 'Start the 60 second Community Theme drawing round'
        : options.communityThemeUnavailableMessage
    );
    Object.assign(startButton.style, {
      position: 'absolute',
      right: '8%',
      bottom: '6.5%',
      left: '8%',
      height: '15%',
      padding: '0 18px',
      border: '0',
      borderRadius: '18px',
      background: 'rgba(255, 255, 255, 0.01)',
      color: UI.ink,
      cursor: 'pointer',
      ...DOM_TYPE.title,
      fontSize: '36px',
      letterSpacing: '1px',
      textShadow: '0 2px 0 rgba(255, 247, 232, 0.34)',
      touchAction: 'manipulation',
      pointerEvents: 'auto',
      zIndex: '2',
    });
    const releaseButton = (): void => {
      startButton?.classList.remove('is-pressed');
    };
    startButton.addEventListener('pointerdown', () => {
      startButton?.classList.add('is-pressed');
    });
    startButton.addEventListener('pointerup', releaseButton);
    startButton.addEventListener('pointercancel', releaseButton);
    startButton.addEventListener('pointerleave', releaseButton);
    startButton.addEventListener('click', () => {
      void options.onStartTheme();
    });
    if (!options.communityThemeAvailable) {
      startButton.style.opacity = '0.48';
      startButton.style.cursor = 'not-allowed';
    }
    card.append(startButton);
  }
  overlay.append(card);

  if (options.timed) {
    const timerNotice = document.createElement('div');
    timerNotice.className = 'draw-theme-timer-notice';
    timerNotice.setAttribute('aria-hidden', 'true');
    Object.assign(timerNotice.style, {
      width: 'min(88%, 635px)',
      height: '58px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      flex: '0 0 auto',
      fontFamily: FONT_STACK,
    });
    const timerIcon = createDrawClockIcon(48);
    timerIcon.classList.add('draw-theme-timer-icon');
    const timerLabel = document.createElement('span');
    timerLabel.className = 'draw-theme-timer-label';
    timerLabel.textContent = '60 SEC TO DRAW';
    Object.assign(timerLabel.style, {
      color: UI.cream,
      ...DOM_TYPE.title,
      fontSize: '30px',
      letterSpacing: '0.5px',
      textShadow: '0 3px 0 rgba(43, 32, 22, 0.7)',
    });
    timerNotice.append(timerIcon, timerLabel);
    overlay.append(timerNotice);

    if (options.allowFreeDraw) {
      freeDrawButton = document.createElement('button');
      freeDrawButton.type = 'button';
      freeDrawButton.setAttribute(
        'aria-label',
        'Start an untimed Free Draw saved outside the Community Rumble'
      );
      Object.assign(freeDrawButton.style, {
        width: 'min(88%, 635px)',
        minHeight: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '10px 18px',
        border: `3px solid ${UI.cream}`,
        borderRadius: '18px',
        background: 'rgba(43, 32, 22, 0.72)',
        color: UI.cream,
        boxShadow: '0 5px 0 rgba(13, 9, 6, 0.42)',
        cursor: 'pointer',
        fontFamily: FONT_STACK,
        touchAction: 'manipulation',
        pointerEvents: 'auto',
      });
      const freeDrawLabel = document.createElement('span');
      freeDrawLabel.textContent = 'FREE DRAW';
      Object.assign(freeDrawLabel.style, {
        ...DOM_TYPE.title,
        fontSize: '28px',
      });
      const noTimerLabel = document.createElement('span');
      noTimerLabel.textContent = 'NO TIMER';
      Object.assign(noTimerLabel.style, {
        ...DOM_TYPE.caption,
        padding: '5px 9px',
        borderRadius: '999px',
        background: UI.cream,
        color: UI.ink,
      });
      freeDrawButton.append(freeDrawLabel, noTimerLabel);
      freeDrawButton.addEventListener('click', options.onStartFreeDraw);
      overlay.append(freeDrawButton);
    }
  }

  const placement = options.timed
    ? {
        x: 0,
        y: 0,
        width: options.viewport.width,
        height: options.viewport.height,
      }
    : options.canvasRect;
  let destroyed = false;
  const setVisible = (
    requestedVisible: boolean,
    countdownActive: boolean
  ): void => {
    if (destroyed) return;
    const overlayVisible = requestedVisible || countdownActive;
    overlay.style.opacity = overlayVisible ? '1' : '0';
    overlay.style.visibility = overlayVisible ? 'visible' : 'hidden';
    overlay.setAttribute('aria-hidden', String(!overlayVisible));
    const startIsAvailable =
      requestedVisible &&
      !countdownActive &&
      startButton !== null &&
      options.communityThemeAvailable;
    const freeDrawIsAvailable =
      requestedVisible && !countdownActive && freeDrawButton !== null;
    overlay.style.pointerEvents = 'none';
    if (startButton) {
      startButton.disabled = !startIsAvailable;
      startButton.tabIndex = startIsAvailable ? 0 : -1;
      startButton.style.pointerEvents = startIsAvailable ? 'auto' : 'none';
    }
    if (freeDrawButton) {
      freeDrawButton.disabled = !freeDrawIsAvailable;
      freeDrawButton.tabIndex = freeDrawIsAvailable ? 0 : -1;
      freeDrawButton.style.pointerEvents = freeDrawIsAvailable
        ? 'auto'
        : 'none';
    }
  };
  setVisible(true, false);

  return Object.freeze({
    element: overlay,
    placement,
    appendCountdown: (element) => {
      if (!destroyed) overlay.append(element);
    },
    setVisible,
    focusStart: () => {
      if (!destroyed) startButton?.focus();
    },
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      overlay.remove();
    },
  });
};
