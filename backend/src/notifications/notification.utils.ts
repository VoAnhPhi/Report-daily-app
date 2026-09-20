export function buildNotificationWrite({
  action,
  actor,
  refs,
}: {
  action: string;
  actor: { id: string; fullName?: string | null; avatarUrl?: string | null };
  refs: {
    relatedModel?: string;
    relatedModelId?: string;
    postId?: string;
    commentId?: string;
    orderId?: string;
    messageId?: string;
  };
}) {
  const payload: Record<string, unknown> = {
    actorId: actor.id,
    actorName: actor.fullName,
    actorAvatarUrl: actor.avatarUrl,
    ...refs,
  };

  let linkUrl: string | undefined;
  if (refs.postId) linkUrl = `/posts/${refs.postId}`;
  else if (refs.commentId) linkUrl = `/comments/${refs.commentId}`;
  else if (refs.orderId) linkUrl = `/orders/${refs.orderId}`;
  else if (refs.messageId) linkUrl = `/messages/${refs.messageId}`;

  return { linkUrl, payload };
}
