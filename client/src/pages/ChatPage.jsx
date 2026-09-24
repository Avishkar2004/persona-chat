import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import ChatLayout from "../components/chat/ChatLayout";
import ChatSidebarHeader from "../components/chat/ChatSidebarHeader";
import FriendsSidebar from "../components/chat/FriendsSidebar";
import RoomsSidebar from "../components/chat/RoomsSidebar";
import FriendsChat from "./FriendsChat";
import RoomsChat from "./RoomsChat";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useDmChat } from "../hooks/useDmChat";
import { useFriends } from "../hooks/useFriends";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useMessageComposer } from "../hooks/useMessageComposer";
import { usePresence } from "../hooks/usePresence";
import { useRoomChat } from "../hooks/useRoomChat";
import { useSocket } from "../hooks/useSocket";

/**
 * The one chat screen.
 *
 * Direct messages and group chats used to be two separate pages with almost
 * identical shells, and nothing on screen said which one you were on. They are
 * now a single screen with one list and two labelled tabs. This component owns
 * all the state so both tabs can share one socket connection.
 */
export default function ChatPage() {
  const { user } = useAuth();
  const { socketRef, connected } = useSocket();

  // "direct" | "groups"
  const [tab, setTab] = useState("direct");
  // Phones show one column at a time; this is which one.
  const [showConversation, setShowConversation] = useState(false);
  // Tailwind's `md`: from here up, ChatLayout always shows both columns.
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const friends = useFriends();
  const presence = usePresence({ socketRef, friends: friends.state.friends });
  const dmChat = useDmChat({
    socketRef,
    username: user?.username,
    selectedFriend: friends.selectedFriend,
    // Only a chat that is actually on screen gets marked read.
    active: tab === "direct" && (showConversation || isDesktop),
  });
  const roomChat = useRoomChat({ socketRef, username: user?.username });

  const dmComposer = useMessageComposer({
    onTypingChange: (isTyping) => dmChat.emitTyping(isTyping),
  });
  const roomComposer = useMessageComposer({
    onTypingChange: (isTyping) => roomChat.emitTyping(isTyping),
  });

  // The selection also changes without openFriend (adding a bot selects it,
  // removing the open friend falls back to another), so catch those here too.
  const draftFriendRef = useRef(friends.selectedFriend?.username);
  useEffect(() => {
    const current = friends.selectedFriend?.username;
    if (draftFriendRef.current === current) return;
    draftFriendRef.current = current;
    dmComposer.clearComposer();
  }, [friends.selectedFriend?.username, dmComposer]);

  // `tab` and `showConversation` are in the deps so the feed also jumps to the
  // newest message when a hidden column becomes visible again.
  const dmListRef = useAutoScroll([
    tab,
    showConversation,
    friends.selectedFriend?.username,
    dmChat.messages.length,
  ]);
  const roomListRef = useAutoScroll([
    tab,
    showConversation,
    roomChat.activeRoomId,
    roomChat.messages.length,
  ]);

  function changeTab(next) {
    setTab(next);
    setShowConversation(false);
  }

  function openFriend(friend) {
    // One composer serves every chat, so a draft must not follow you to someone
    // else. Clear it before switching: clearing also sends "stopped typing",
    // and that belongs to the friend you are leaving.
    if (friend?.username !== friends.selectedFriend?.username) {
      dmComposer.clearComposer();
      // Already cleared, so the effect below has nothing left to do.
      draftFriendRef.current = friend?.username;
    }
    friends.setSelectedFriend(friend);
    setShowConversation(true);
  }

  function openRoom(roomId) {
    roomChat.setActiveRoomId(roomId);
    setShowConversation(true);
  }

  async function addBot(bot) {
    const created = await friends.addBot(bot);
    if (created) setShowConversation(true);
  }

  function deleteBot(bot) {
    return friends.deleteBot(bot, (u) => dmChat.clearThread(u));
  }

  function sendDm() {
    if (!friends.selectedFriend) return;
    const payload = dmComposer.buildPayload();
    if (!payload.hasContent) return;
    if (!dmChat.sendMessage(payload)) return;
    dmComposer.clearComposer();
  }

  function sendRoom() {
    const payload = roomComposer.buildPayload();
    if (!payload.hasContent) return;
    if (!roomChat.sendMessage(payload)) return;
    roomComposer.clearComposer();
  }

  const isDirect = tab === "direct";

  return (
    <div className="h-full">
      <ChatLayout
        showConversation={showConversation}
        sidebar={
          <>
            <ChatSidebarHeader
              username={user?.username}
              connected={connected}
              tab={tab}
              onTabChange={changeTab}
              requestCount={friends.state.incoming?.length || 0}
              groupCount={roomChat.rooms.length}
            />
            {isDirect ? (
              <FriendsSidebar
                loading={friends.loading}
                error={friends.error}
                notice={friends.notice}
                onDismissError={friends.dismissError}
                onDismissNotice={friends.dismissNotice}
                submitting={friends.submitting}
                state={friends.state}
                addUsername={friends.addUsername}
                setAddUsername={friends.setAddUsername}
                canRequest={friends.canRequest}
                onRequest={friends.requestFriend}
                onAccept={friends.accept}
                onDecline={friends.decline}
                onCancel={friends.cancel}
                onRemove={(username) =>
                  friends.remove(username, (u) => dmChat.clearThread(u))
                }
                onDeleteBot={deleteBot}
                onBotCreated={addBot}
                selectedFriend={friends.selectedFriend}
                onSelectFriend={openFriend}
                presence={presence}
              />
            ) : (
              <RoomsSidebar
                rooms={roomChat.rooms}
                activeRoomId={roomChat.activeRoomId}
                onSelectRoom={openRoom}
              />
            )}
          </>
        }
        conversation={
          isDirect ? (
            <FriendsChat
              friend={friends.selectedFriend}
              presence={presence[friends.selectedFriend?.username]}
              myUsername={user?.username}
              connected={connected}
              messages={dmChat.messages}
              typingUser={dmChat.typingUser}
              composer={dmComposer}
              listRef={dmListRef}
              onSend={sendDm}
              onBack={() => setShowConversation(false)}
              onDeleteBot={(bot) => {
                deleteBot(bot);
                setShowConversation(false);
              }}
            />
          ) : (
            <RoomsChat
              room={roomChat.activeRoom}
              myUsername={user?.username}
              connected={connected}
              messages={roomChat.messages}
              typingUser={roomChat.typingUser}
              composer={roomComposer}
              listRef={roomListRef}
              onSend={sendRoom}
              onBack={() => setShowConversation(false)}
            />
          )
        }
      />
    </div>
  );
}
