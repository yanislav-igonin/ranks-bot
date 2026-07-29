const TELEGRAM_MESSAGE_LIMIT = 4096;

interface ReplyContext {
  reply(text: string): Promise<unknown>;
}

export const replyInChunks = async (
  ctx: ReplyContext,
  text: string,
): Promise<void> => {
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= TELEGRAM_MESSAGE_LIMIT) {
      // Replies must arrive in the same order as their source text.
      await ctx.reply(remaining);
      return;
    }

    const newlineIndex = remaining.lastIndexOf('\n', TELEGRAM_MESSAGE_LIMIT);
    const splitIndex = newlineIndex > 0 ? newlineIndex : TELEGRAM_MESSAGE_LIMIT;

    // Replies must arrive in the same order as their source text.
    await ctx.reply(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex + (newlineIndex === splitIndex ? 1 : 0));
  }
};
