import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    // Stamped when the user's last socket closes, so friends can be told
    // "last seen 5 minutes ago" instead of just "offline".
    lastSeenAt: { type: Date, default: null },

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    friendRequestsIncoming: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    friendRequestsOutgoing: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],

    // AI friends are ordinary users so DMs, ticks and presence work unchanged.
    // Only their owner is on their friends list, and they can never log in.
    isBot: { type: Boolean, default: false },
    botOwner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // The system prompt built from the uploaded chat. Never sent to a client.
    botPersona: { type: String, select: false },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
