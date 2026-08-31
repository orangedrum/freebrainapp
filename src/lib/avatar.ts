/**
 * Centralized Avatar Helper Utility
 * Uses DiceBear v10 API with 'critters' style (cute colorful creatures)
 * Route ALL avatar generation strictly through this single file.
 */

export function getAvatarUrl(seed?: string | null, style: string = 'critters'): string {
  const cleanSeed = encodeURIComponent((seed && seed.trim().length > 0) ? seed.trim() : 'FreeBrain');
  // DiceBear v10 supports 'critters'
  return `https://api.dicebear.com/10.x/${style}/svg?seed=${cleanSeed}`;
}

/**
 * Returns initials (1-2 uppercase letters) for AvatarFallback
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'FB';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

