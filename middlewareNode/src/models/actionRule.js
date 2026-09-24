/**
 * ActionRule Schema
 *
 * The config layer that decides whether an ActionEvent pays out, and how
 * much. Adding a new currency-earning action is meant to be "one emit line
 * plus one ActionRule document" — zero code changes to the consumer (the
 * plan's "action #47" test).
 *
 * No admin UI this window (deferred per the currency rollout plan) —
 * these are created and edited directly against MongoDB.
 */

const mongoose = require("mongoose");

const ActionRuleSchema = new mongoose.Schema(
  {
    // Matches ActionEvent.actionKey. Unique — one rule per action.
    actionKey: { type: String, required: true, unique: true, index: true },

    // How much lifetimeEarned/balance an occurrence of this action pays out.
    currencyAmount: { type: Number, required: true, min: 0 },

    // A disabled rule's events are still logged (ActionEvent is
    // append-only) but never produce a ledger entry — lets an action be
    // turned off without losing the underlying history.
    active: { type: Boolean, default: true, index: true },

    // Minimum seconds between two payouts for the same user+action. 0
    // disables cooldown enforcement for this action.
    cooldownSeconds: { type: Number, default: 0, min: 0 },

    // Max payouts per user+action per UTC day. 0 disables the cap.
    dailyCap: { type: Number, default: 0, min: 0 },

    // Optional free-form notes on why the rule exists / its current amount
    // — this collection has no admin UI, so this is the only place that
    // context lives outside a commit message.
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActionRule", ActionRuleSchema);
