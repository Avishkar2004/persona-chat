import User from "../models/User.js";

function toPublicUser(u) {
  return { id: u._id, username: u.username, isBot: Boolean(u.isBot) };
}

async function getUserByUsername(username) {
  const normalized = String(username || "").trim();
  if (!normalized) return null;
  return await User.findOne({ username: normalized }).select("_id username isBot");
}

export async function getFriendsState(req, res) {
  try {
    const me = await User.findById(req.user._id)
      .select("friends friendRequestsIncoming friendRequestsOutgoing")
      .populate("friends", "_id username isBot")
      .populate("friendRequestsIncoming", "_id username")
      .populate("friendRequestsOutgoing", "_id username");

    return res.json({
      friends: (me?.friends || []).map(toPublicUser),
      incoming: (me?.friendRequestsIncoming || []).map(toPublicUser),
      outgoing: (me?.friendRequestsOutgoing || []).map(toPublicUser),
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function requestFriend(req, res) {
  try {
    const { username } = req.body ?? {};
    const target = await getUserByUsername(username);
    // Someone else's AI friend is private to them.
    if (!target || target.isBot) {
      return res.status(404).json({ message: "User not found" });
    }
    if (String(target._id) === String(req.user._id)) {
      return res.status(400).json({ message: "You can’t add yourself" });
    }

    const [me, other] = await Promise.all([
      User.findById(req.user._id).select(
        "_id friends friendRequestsIncoming friendRequestsOutgoing",
      ),
      User.findById(target._id).select(
        "_id friends friendRequestsIncoming friendRequestsOutgoing",
      ),
    ]);

    if (!me || !other) return res.status(404).json({ message: "User not found" });

    const alreadyFriends = me.friends.some((id) => String(id) === String(other._id));
    if (alreadyFriends) return res.status(409).json({ message: "Already friends" });

    const alreadyOutgoing = me.friendRequestsOutgoing.some(
      (id) => String(id) === String(other._id),
    );
    if (alreadyOutgoing) {
      return res.status(409).json({ message: "Friend request already sent" });
    }

    const alreadyIncoming = me.friendRequestsIncoming.some(
      (id) => String(id) === String(other._id),
    );
    if (alreadyIncoming) {
      return res
        .status(409)
        .json({ message: "They already sent you a request—accept it instead" });
    }

    await Promise.all([
      User.updateOne(
        { _id: me._id },
        { $addToSet: { friendRequestsOutgoing: other._id } },
      ),
      User.updateOne(
        { _id: other._id },
        { $addToSet: { friendRequestsIncoming: me._id } },
      ),
    ]);

    return res.status(201).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { username } = req.body ?? {};
    const other = await getUserByUsername(username);
    if (!other) return res.status(404).json({ message: "User not found" });

    const meId = req.user._id;
    const otherId = other._id;

    const me = await User.findById(meId).select("_id friendRequestsIncoming friends");
    if (!me) return res.status(404).json({ message: "User not found" });

    const hasIncoming = me.friendRequestsIncoming.some(
      (id) => String(id) === String(otherId),
    );
    if (!hasIncoming) {
      return res.status(409).json({ message: "No incoming request from that user" });
    }

    await Promise.all([
      User.updateOne(
        { _id: meId },
        {
          // Both directions: if they both sent a request, neither is left behind.
          $pull: { friendRequestsIncoming: otherId, friendRequestsOutgoing: otherId },
          $addToSet: { friends: otherId },
        },
      ),
      User.updateOne(
        { _id: otherId },
        {
          $pull: { friendRequestsOutgoing: meId, friendRequestsIncoming: meId },
          $addToSet: { friends: meId },
        },
      ),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function declineFriendRequest(req, res) {
  try {
    const { username } = req.body ?? {};
    const other = await getUserByUsername(username);
    if (!other) return res.status(404).json({ message: "User not found" });

    const meId = req.user._id;
    const otherId = other._id;

    await Promise.all([
      User.updateOne({ _id: meId }, { $pull: { friendRequestsIncoming: otherId } }),
      User.updateOne({ _id: otherId }, { $pull: { friendRequestsOutgoing: meId } }),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function cancelFriendRequest(req, res) {
  try {
    const { username } = req.body ?? {};
    const other = await getUserByUsername(username);
    if (!other) return res.status(404).json({ message: "User not found" });

    const meId = req.user._id;
    const otherId = other._id;

    await Promise.all([
      User.updateOne({ _id: meId }, { $pull: { friendRequestsOutgoing: otherId } }),
      User.updateOne({ _id: otherId }, { $pull: { friendRequestsIncoming: meId } }),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function removeFriend(req, res) {
  try {
    const { username } = req.body ?? {};
    const other = await getUserByUsername(username);
    if (!other) return res.status(404).json({ message: "User not found" });
    // Unfriending would orphan the bot; deleting it also clears the chat.
    if (other.isBot) {
      return res.status(400).json({ message: "Use “Delete AI friend” instead" });
    }

    const meId = req.user._id;
    const otherId = other._id;

    await Promise.all([
      User.updateOne({ _id: meId }, { $pull: { friends: otherId } }),
      User.updateOne({ _id: otherId }, { $pull: { friends: meId } }),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

