const bootStatus = document.getElementById('game-boot-status');
const bootMessage = document.getElementById('game-boot-message');

const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'The game could not finish opening.';
};

export const markGameBootPhase = (
  phase: 'loading' | 'starting' | 'ready' | 'error',
  message?: string
): void => {
  document.documentElement.dataset.scribbitsBoot = phase;
  if (bootStatus) {
    bootStatus.dataset.phase = phase;
    bootStatus.hidden = phase === 'ready';
  }
  if (message && bootMessage) bootMessage.textContent = message;
};

export const reportGameBootError = (error: unknown): void => {
  console.error('Scribbits expanded-view startup failed:', error);
  markGameBootPhase(
    'error',
    `${errorMessage(error)} Close Scribbits and open it again.`
  );
};

window.addEventListener('error', (event) => {
  reportGameBootError(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  reportGameBootError(event.reason);
});

markGameBootPhase('loading');
