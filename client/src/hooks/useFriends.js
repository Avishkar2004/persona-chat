import { useCallback, useEffect, useState } from "react";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  fetchFriendsState,
  removeFriend,
  sendFriendRequest,
} from "../services/friendsApi";
import { deleteBot as deleteBotRequest } from "../services/botsApi";
import { displayHandle, normalizeHandle } from "../lib/usernames";

const MIN_USERNAME = 3;

/**
 * Friends list, requests, and API actions.
 * Keeps a selected friend in sync when the friends list changes.
 */
export function useFriends() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [state, setState] = useState({ friends: [], incoming: [], outgoing: [] });
  const [selectedFriend, setSelectedFriend] = useState(null);

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const next = await fetchFriendsState();
      setState(next);
      setSelectedFriend((current) => {
        if (current && next.friends.some((f) => f.username === current.username)) {
          return current;
        }
        return next.friends[0] || null;
      });
      return next;
    } catch (e) {
      setError(e.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function runAction(action) {
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  function requestFriend() {
    const username = normalizeHandle(addUsername);
    setNotice("");
    if (username.length < MIN_USERNAME) {
      setError(`Enter a username with at least ${MIN_USERNAME} characters.`);
      return;
    }
    // Friendly client-side guards before hitting the server.
    if (state.friends.some((f) => f.username === username)) {
      setError(`You’re already friends with ${displayHandle(username)}.`);
      return;
    }
    if (state.outgoing.some((u) => u.username === username)) {
      setError(`Request to ${displayHandle(username)} is already pending.`);
      return;
    }
    return runAction(async () => {
      await sendFriendRequest(username);
      setAddUsername("");
      setNotice(`Friend request sent to ${displayHandle(username)}.`);
    });
  }

  function accept(username) {
    return runAction(async () => {
      await acceptFriendRequest(username);
      setNotice(`You’re now friends with ${displayHandle(username)}.`);
    });
  }

  function decline(username) {
    return runAction(() => declineFriendRequest(username));
  }

  function cancel(username) {
    return runAction(() => cancelFriendRequest(username));
  }

  function remove(username, onRemoved) {
    return runAction(async () => {
      await removeFriend(username);
      onRemoved?.(username);
    });
  }

  /** Reload after the create dialog finishes, and open the new AI friend. */
  async function addBot(bot) {
    const next = await refresh();
    const created = next?.friends.find((f) => f.username === bot.username);
    if (created) {
      setSelectedFriend(created);
      setNotice(`${displayHandle(created.username)} is ready. Say hi.`);
    }
    return created || null;
  }

  function deleteBot(bot, onDeleted) {
    return runAction(async () => {
      await deleteBotRequest(bot.id);
      onDeleted?.(bot.username);
      setNotice(`Deleted the AI friend ${displayHandle(bot.username)}.`);
    });
  }

  return {
    loading,
    error,
    notice,
    dismissError: () => setError(""),
    dismissNotice: () => setNotice(""),
    submitting,
    state,
    addUsername,
    setAddUsername,
    selectedFriend,
    setSelectedFriend,
    refresh,
    requestFriend,
    accept,
    decline,
    cancel,
    remove,
    addBot,
    deleteBot,
    canRequest: normalizeHandle(addUsername).length >= MIN_USERNAME,
  };
}
