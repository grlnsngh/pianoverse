/* eslint-env browser, node */
/*
 * What the reset page checks and says. The wording is the app's (utils/authForms.ts),
 * and __tests__/resetPage.test.ts keeps the two the same. A plain script, so the
 * page can load it without a build step; Jest loads it as a module.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PianoverseReset = api;
})(typeof self !== "undefined" ? self : this, function () {
  // The same Appwrite project the app talks to (lib/appwrite.ts)
  var ENDPOINT = "https://cloud.appwrite.io/v1";
  var PROJECT = "66b2693000154e2fa3c8";

  var CONNECTION =
    "We couldn’t reach Pianoverse. Check your connection and try again.";
  var FALLBACK = "Something went wrong. Please try again.";
  var EXPIRED =
    "This link has expired or was already used. Ask for a new one in the app.";
  var TOO_MANY = "Too many attempts. Wait a minute and try again.";

  /** Appwrite rejects passwords shorter than 8 characters. */
  function passwordProblem(password) {
    if (!password) return "Enter a new password.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return "";
  }

  function confirmationProblem(password, confirmation) {
    if (!confirmation) return "Confirm your password.";
    if (password !== confirmation) return "Passwords do not match.";
    return "";
  }

  /** The user and secret in the link from the email, or null when either is missing. */
  function readLink(search) {
    var params = new URLSearchParams(search || "");
    var userId = (params.get("userId") || "").trim();
    var secret = (params.get("secret") || "").trim();
    return userId && secret ? { userId: userId, secret: secret } : null;
  }

  /** Why Appwrite said no, in words for the red box. */
  function failureMessage(status, body) {
    var type = body && body.type;
    if (status === 401 || type === "user_invalid_token") return EXPIRED;
    if (status === 429 || type === "general_rate_limit_exceeded")
      return TOO_MANY;
    return (body && body.message) || FALLBACK;
  }

  /** Sets the new password. Resolves to "" when it worked, or the message to show. */
  function updatePassword(fetchFn, link, password) {
    return fetchFn(ENDPOINT + "/account/recovery", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": PROJECT,
      },
      body: JSON.stringify({
        userId: link.userId,
        secret: link.secret,
        password: password,
      }),
    }).then(
      function (response) {
        if (response.ok) return "";
        return response.json().then(
          function (body) {
            return failureMessage(response.status, body);
          },
          function () {
            return failureMessage(response.status, null);
          }
        );
      },
      function () {
        return CONNECTION;
      }
    );
  }

  return {
    ENDPOINT: ENDPOINT,
    PROJECT: PROJECT,
    CONNECTION: CONNECTION,
    FALLBACK: FALLBACK,
    EXPIRED: EXPIRED,
    TOO_MANY: TOO_MANY,
    passwordProblem: passwordProblem,
    confirmationProblem: confirmationProblem,
    readLink: readLink,
    failureMessage: failureMessage,
    updatePassword: updatePassword,
  };
});
