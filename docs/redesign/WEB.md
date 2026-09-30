# Everything that opens in a browser, and the reset email

The redesign is for the phone app, but people also meet Pianoverse in a browser and in their inbox. This file lists every one of those places, what was wrong with them, and what Batch 14 did about it. The decisions are also in [PLAN.md](PLAN.md); questions are in [QUESTIONS.md](QUESTIONS.md).

## 1. The list

| # | What | Where | Who sees it |
| --- | --- | --- | --- |
| 1 | **Landing page** (`index.html`) | https://grlnsngh.github.io/pianoverse/ | Anyone with the address; the "Back to Pianoverse" link from the reset page |
| 2 | **Reset password page** (`reset-password.html`) | https://grlnsngh.github.io/pianoverse/reset-password.html?userId=…&secret=… | A person who tapped the link in the reset email, on a phone or a computer |
| 3 | **The reset email** ("Reset password") | Sent by Appwrite when someone taps **Forgot password?** in the app | The person's inbox |
| 4 | **The app itself in a browser** | `npm run web` (Expo web, static output); not deployed anywhere | Only you, while developing |
| 5 | Links those pages open | `pianoverse://sign-in`, `pianoverse://forget-password` (the app), `mailto:support@pianoverse.com` | Whoever taps them |

Not ours, but part of the path: Google Fonts (Figtree), and `cloud.appwrite.io`, which the reset page calls to save the new password.

The only email the app can trigger is the reset email. The app never asks Appwrite for a verification, magic link or invitation email.

GitHub Pages publishes the whole `main` folder (`source: main, /`), so the boards in `docs/` and the rest of the repository are reachable under the same address. That is harmless but not intended. Moving the two pages into their own folder would break the link already printed in emails people have received, so they stay where they are.

## 2. What was wrong (the audit)

**Landing page.** Titled "Password Reset Service", with a piano emoji for a logo, navy with drifting circles, a button to a reset page that cannot do anything without a link, and "© 2025".

**Reset page.**
- The form showed even without a link, so the page offered an empty form that could only fail.
- Errors and success were `alert()` pop-ups; after success it jumped to `pianoverse://sign-in` with no explanation.
- The passwords were checked only on Send, there was no Show / Hide, and Appwrite's raw message was shown ("Invalid token passed in the request.").
- It was navy, with a rotating gradient and a gradient button, unlike the app; no labels for a screen reader, no focus handling.
- Scripts and styles were inline, so nothing limited what the page could do; the link's secret could be sent on to another site in the `Referer` header; and if JavaScript failed to load, the browser would have put the passwords in the address.

**Email.** Appwrite's plain default text. It cannot be changed without your own SMTP server (see Q23).

**App in a browser.** It builds and starts, and the Welcome screen draws, but the phone layout is stretched across the whole window (the keys become huge), and I have not checked any other screen. See Q25.

## 3. What Batch 14 did

| | |
| --- | --- |
| **W1. One look** | `web/site.css` uses the app's tokens (colours, radii, type, motion) with `__tests__/webPages.test.ts` keeping it in step; `web/mark.svg` and `web/mark.png` are the app's own mark (the ink tile with the keyboard), the PNG being for email, which cannot show SVG. Light only, like the app. Phone-width column; on a wide screen the reset form sits in a white card on the grey page colour. |
| **W2. Landing page** | The Welcome screen's words and orange keyboard picture, and a "Forgot your password?" panel with the three steps. No dead-end button. |
| **W3. Reset page** | Four states instead of `alert()`: **link not valid** (missing or cut-short link, with a way to ask for a new one), **the form**, **working** ("Updating" with a spinner, greyed like the app), and **done** (the orange check drawn in, as on the Published board, with **Open Pianoverse**). The fields are the app's Field (label inside, 2 px ink border when focused, red with the message and icon when wrong, Show / Hide), and **the words are the app's** (a test compares them with `utils/authForms.ts`). A refused link says "This link has expired or was already used. Ask for a new one in the app." Motion is the app's (24 px rise and fade in 240 ms, 100 ms press, 280 ms check pop); with Reduce Motion everything only fades for 120 ms. |
| **W4. Safer page** | No inline script or style, a Content-Security-Policy, `no-referrer`, `noindex`, and `form-action 'none'` with a POST form, so a failed script can never put the passwords in the address. |
| **W5. The email** | `email/password-recovery.html`: the same card, the mark and name, the headline, an ink-on-orange button, the link as text for when the button fails, "works once", and "Didn't ask for this? You can ignore this email." Inline and table based, because email apps ignore style blocks; light in any inbox mode. |
| **W6. Tests and docs** | 48 new tests in `webPages`, `resetPage` (the real page run in jsdom with Appwrite faked: every state, every message) and `recoveryEmail`. This file, the README and the Session log. |

**Not done on purpose.** (a) Putting the email into Appwrite: it needs your own SMTP server, so it waits for Q23. (b) A phone-width column for the app in a browser: it needs a decision (Q25). (c) Real inboxes: I previewed the email in a browser with sample values, not in Gmail, Outlook or Apple Mail.

## 4. How to put the email into Appwrite

1. **Turn on your own SMTP server.** Appwrite does not let the built-in email service use a custom template ("to prevent malicious templates"). In the Appwrite Console open the project, **Settings → SMTP**, and enter the server of your email provider (Resend, Brevo, Mailgun, or Gmail with an app password), the sender's name and address.
2. Open **Auth → Templates → Email → Reset password**, language **English**.
3. Sender name `Pianoverse`; the sender email and reply-to as you like. **Subject:** `Reset your Pianoverse password`.
4. **Message:** paste the whole of `email/password-recovery.html` and save. Appwrite fills in `{{user}}` (the account's name) and `{{redirect}}` (the link to the reset page).
5. The mark in the email loads from `https://grlnsngh.github.io/pianoverse/web/mark.png`. GitHub Pages builds from `main`, so **the picture (and the new pages) appear only after this work is merged**. Until then the name next to it is still there, and the page the email links to is the old one.
6. Test it: in the app choose **Sign in → Forgot password?**, use your own email, open the email on your phone and follow the button.

## 5. How to check

- **The pages:** after the merge, open the landing page and the reset page on your phone and on a computer; or now, run `npx serve` (or any static server) in the project folder and open `index.html` and `reset-password.html?userId=a&secret=b`. Try: a short password, two that differ, Show / Hide, the Tab key, and the page with no link (`reset-password.html`). A real reset needs the email.
- **A real reset** (after the merge): ask for a link in the app, open it on your phone, choose a new password, tap **Open Pianoverse**, sign in.
- **Reduce Motion:** turn it on in your phone's settings; the pages should only fade.
- **The email:** in your inbox, on a phone and on a computer, in light and dark mode (it stays light). Check the button, the plain link, that it says who it is from, and that "Hello …" shows your name.
