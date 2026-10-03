/**
 * Returns a persistent user ID for this browser session/device.
 * Stored in localStorage so the user retains their Host/Moderator status
 * across page reloads and socket reconnections.
 */
export const getPersistentUserId = (): string => {
  let userId = localStorage.getItem('watchparty_userid');
  if (!userId || !userId.trim()) {
    userId = `user_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem('watchparty_userid', userId);
  }
  return userId;
};
