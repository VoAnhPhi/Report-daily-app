/**
 * Ensures each comment id only increments feed `commentCount` once when both
 * the socket ack and a `commentAdded` broadcast arrive for the same comment.
 */
const countedCommentIds = new Set<string>();

export function tryCountCommentTowardPost(commentId: string | undefined): boolean {
  if (!commentId) return true;
  if (countedCommentIds.has(commentId)) return false;
  countedCommentIds.add(commentId);
  if (countedCommentIds.size > 3000) {
    countedCommentIds.clear();
  }
  return true;
}
