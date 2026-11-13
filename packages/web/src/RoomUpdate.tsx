import { AppUpdate } from "./AppUpdate.js";
import type { useOurDay } from "./useOurDay.js";
import type { useRoomActions } from "./useRoomActions.js";
import type { useRoomEnding } from "./useRoomEnding.js";
import type { useSayBox } from "./useSayBox.js";
import type { SeatAccount } from "./useSeatAccount.js";
import type { useRoomSharing } from "./useRoomSharing.js";

export function RoomUpdate({
  editing,
  reply,
  actions,
  day,
  exit,
  account,
  postcard,
}: {
  editing: boolean;
  reply: ReturnType<typeof useSayBox>;
  actions: ReturnType<typeof useRoomActions>;
  day: ReturnType<typeof useOurDay>;
  exit: ReturnType<typeof useRoomEnding>;
  account: SeatAccount;
  postcard: ReturnType<typeof useRoomSharing>;
}) {
  const safe =
    !editing &&
    !reply.open &&
    !reply.saving &&
    !actions.drawingOpen &&
    !actions.drawing &&
    !actions.giftWords.trim() &&
    !actions.gifting &&
    !actions.pendingMood &&
    !postcard.postcardHref &&
    !postcard.imageStatus &&
    !day.dirty &&
    !day.saving &&
    !exit.typedName &&
    !exit.ending &&
    !account.code &&
    !account.claiming &&
    !account.linking;
  return <AppUpdate safe={safe} />;
}
