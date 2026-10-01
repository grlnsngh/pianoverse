/* eslint-env browser, node */
/*
 * The reset page: shows the right view (link not valid, new password form,
 * done), checks the two fields like the app does, and sends the new password
 * to Appwrite. What to check and say lives in reset-logic.js.
 */
(function () {
  "use strict";

  var logic = window.PianoverseReset;
  var byId = function (id) {
    return document.getElementById(id);
  };

  var link = logic.readLink(window.location.search);
  var form = byId("reset-form");
  var submit = byId("submit");
  var busy = false;

  function show(name, moveFocus) {
    ["invalid", "form", "success"].forEach(function (key) {
      byId("view-" + key).hidden = key !== name;
    });
    if (moveFocus) byId("title-" + name).focus();
  }

  // ---- The two fields: a hint or an error under each, like the app's Field
  function field(key, idle, check) {
    return {
      key: key,
      input: byId(key),
      box: byId(key + "-field"),
      note: byId(key + "-note"),
      text: byId(key + "-note-text"),
      icon: byId(key + "-note-icon"),
      idle: idle,
      check: check,
    };
  }

  var fields = {
    password: field("password", "At least 8 characters.", function () {
      return logic.passwordProblem(fields.password.input.value);
    }),
    confirm: field("confirm", "", function () {
      return logic.confirmationProblem(
        fields.password.input.value,
        fields.confirm.input.value
      );
    }),
  };

  function setProblem(f, message) {
    f.box.classList.toggle("is-error", !!message);
    f.note.classList.toggle("is-error", !!message);
    // An svg has no .hidden property, only the attribute
    f.icon.toggleAttribute("hidden", !message);
    f.input.setAttribute("aria-invalid", message ? "true" : "false");
    f.text.textContent = message || f.idle;
    f.note.hidden = !message && !f.idle;
  }

  Object.keys(fields).forEach(function (key) {
    var f = fields[key];

    // Leaving the field checks it, unless focus only moved between the input
    // and its Show button
    f.box.addEventListener("focusout", function (event) {
      if (event.relatedTarget && f.box.contains(event.relatedTarget)) return;
      setProblem(f, f.check());
    });

    // Typing takes the message away, and the other field is re-checked if it has one
    f.input.addEventListener("input", function () {
      if (f.box.classList.contains("is-error")) setProblem(f, "");
      hideFailure();
      if (
        key === "password" &&
        fields.confirm.box.classList.contains("is-error")
      ) {
        setProblem(fields.confirm, fields.confirm.check());
      }
    });
  });

  Array.prototype.forEach.call(
    document.querySelectorAll(".reveal"),
    function (button) {
      var input = byId(button.getAttribute("data-for"));
      var name = button.getAttribute("data-name");
      button.addEventListener("click", function () {
        var hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        button.textContent = hidden ? "Hide" : "Show";
        button.setAttribute("aria-label", (hidden ? "Hide " : "Show ") + name);
        button.setAttribute("aria-pressed", hidden ? "true" : "false");
      });
    }
  );

  // ---- The red box above the fields
  var failure = byId("failure");
  function showFailure(message) {
    byId("failure-text").textContent = message;
    failure.hidden = false;
  }
  function hideFailure() {
    failure.hidden = true;
  }

  // ---- Sending it
  function setBusy(value) {
    busy = value;
    submit.setAttribute("aria-disabled", value ? "true" : "false");
    submit.setAttribute("aria-busy", value ? "true" : "false");
    byId("submit-label").textContent = value ? "Updating" : "Update password";
    byId("submit-spinner").hidden = !value;
    Object.keys(fields).forEach(function (key) {
      fields[key].input.readOnly = value;
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy || !link) return;

    var found = {
      password: fields.password.check(),
      confirm: fields.confirm.check(),
    };
    setProblem(fields.password, found.password);
    setProblem(fields.confirm, found.confirm);
    var first = found.password
      ? fields.password
      : found.confirm
        ? fields.confirm
        : null;
    if (first) {
      first.input.focus();
      return;
    }

    hideFailure();
    setBusy(true);
    logic
      .updatePassword(
        window.fetch.bind(window),
        link,
        fields.password.input.value
      )
      .then(function (message) {
        setBusy(false);
        if (message) {
          showFailure(message);
          return;
        }
        fields.password.input.value = "";
        fields.confirm.input.value = "";
        show("success", true);
      });
  });

  show(link ? "form" : "invalid");
})();
