import React, { useState } from "react";
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

  const friends = useFriends();
  const presence = usePresence({ socketRef, friends: friends.state.friends });
  const dmChat = useDmChat({
    socketRef,
    username: user?.username,
    selectedFriend: friends.selectedFriend,
  });
  const roomChat = useRoomChat({ socketRef, username: user?.username });

  // "direct" | "groups"
  const [tab, setTab] = useState("direct");
  // Phones show one column at a time; this is which one.
  const [showConversation, setShowConversation] = useState(false);

  const dmComposer = useMessageComposer({
    onTypingChange: (isTyping) => dmChat.emitTyping(isTyping),
  });
  const roomComposer = useMessageComposer({
    onTypingChange: (isTyping) => roomChat.emitTyping(isTyping),
  });

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
    dmChat.sendMessage(payload);
    dmComposer.clearComposer();
  }

  function sendRoom() {
    const payload = roomComposer.buildPayload();
    if (!payload.hasContent) return;
    roomChat.sendMessage(payload);
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
