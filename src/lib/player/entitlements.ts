/** New topic cases a player gets for free; opening a topic someone already generated is always free. */
export const FREE_TOPIC_CASES = 1;

export function canCreateTopicCase(topicCasesCreated: number): boolean {
  return topicCasesCreated < FREE_TOPIC_CASES;
}
