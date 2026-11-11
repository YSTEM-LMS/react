const config = require("config");
const { RtcTokenBuilder, RtcRole } = require("agora-token");

/**
 * Agora RTC token issuing for mentor⇄student live sessions.
 *
 * When the Agora project has an App Certificate enabled, Agora rejects
 * App-ID-only joins ("dynamic use static key"), so each participant needs a
 * token signed with the certificate, bound to one channel and one uid.
 * Without a certificate configured, no tokens are issued and clients join
 * with the App ID alone (only works for projects in "testing mode").
 *
 * Each participant gets two uids: their camera, and their screen share (a
 * second Agora client, so the camera stays on while sharing). They are
 * deterministic so the other side can tell camera from screen.
 */

// Camera uids mirror the legacy Angular client so mixed clients still match.
const CAMERA_UID = { mentor: 123, student: 456 };
const SCREEN_UID_OFFSET = 1000;
// Long enough for a lesson; tokens are re-fetched on every (re)join.
const TOKEN_TTL_SECONDS = 4 * 60 * 60;

const readConfig = (key) => (config.has(key) ? String(config.get(key) || "") : "");

const getAppId = () => readConfig("appID");

const isTokenAuthEnabled = () => !!(getAppId() && readConfig("appCertificate"));

const buildToken = (channel, uid) =>
  RtcTokenBuilder.buildTokenWithUid(
    getAppId(),
    readConfig("appCertificate"),
    channel,
    uid,
    RtcRole.PUBLISHER,
    TOKEN_TTL_SECONDS,
    TOKEN_TTL_SECONDS,
  );

/**
 * Credentials for one participant to join `channel` with camera + screen share.
 * @param {string} channel - the meetingId
 * @param {"mentor"|"student"} role
 */
const buildRtcCredentials = (channel, role) => {
  const uid = CAMERA_UID[role];
  if (!uid) throw new Error(`No Agora uid for role "${role}"`);
  const screenUid = uid + SCREEN_UID_OFFSET;
  const hasTokens = isTokenAuthEnabled();
  return {
    appId: getAppId() || null,
    channel,
    uid,
    screenUid,
    token: hasTokens ? buildToken(channel, uid) : null,
    screenToken: hasTokens ? buildToken(channel, screenUid) : null,
  };
};

/** Token for the Agora cloud recorder's uid, or undefined when tokens are off. */
const buildRecorderToken = (channel, recorderUid) =>
  isTokenAuthEnabled() ? buildToken(channel, Number(recorderUid)) : undefined;

module.exports = {
  CAMERA_UID,
  SCREEN_UID_OFFSET,
  TOKEN_TTL_SECONDS,
  isTokenAuthEnabled,
  buildRtcCredentials,
  buildRecorderToken,
};
