declare global {
  /**
   * A simple event framework used throughout Foundry Virtual Tabletop.
   * When key actions or events occur, a "hook" is defined where user-defined callback functions can execute.
   * This class manages the registration and execution of hooked callback functions.
   */
  class Hooks extends foundry.helpers.Hooks {}

  // These functions simply re‐export from foundry.utils so that you can call them
  const fromUuid: typeof foundry.utils.fromUuid;
  const fromUuidSync: typeof foundry.utils.fromUuidSync;
}

export {};