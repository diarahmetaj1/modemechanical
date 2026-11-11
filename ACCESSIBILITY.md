# Accessibility

What is checked automatically, and the 10-minute screen-reader test to do yourself on a phone
before launch and after big changes.

## Checked automatically

Run on the production build (`npm run build`, then serve `dist/`), on all 17 pages, at desktop
and phone sizes, with the phone menu open as well:

| Check | Result |
| --- | --- |
| axe-core 4.14, WCAG 2.0 / 2.1 / 2.2 A and AA plus best practices | 0 violations |
| Lighthouse accessibility | 100 on every page |
| Landmarks | One `main`, a header, a footer; the top bar is a named region; every navigation has its own name (Main, Mobile, Breadcrumb, Service pages, Company, Services) |
| Skip link | "Skip to content" is the first thing on every page and jumps to the main content |
| Headings | One H1 per page, no skipped levels (also enforced by `npm run verify`) |
| Images | Every image has alt text; decorative copies are hidden from screen readers |
| Buttons and links | Every control has a name (icon-only links such as Facebook and Instagram are labelled); body-text links are underlined |
| Contact form | Each field has a label and is announced as required; errors are announced, linked to their field, and focus moves to the first one; "Message sent" is announced |
| Phone menu and FAQ | Buttons announce whether they are expanded or collapsed |
| "Ask a question" assistant (when switched on) | 0 axe violations in the open panel; focus moves into it, Escape closes it and focus returns to the button |
| Colour contrast | Text meets 4.5:1 (large text 3:1) |
| Touch targets | At least 44×44 px on phones and tablets, apart from links inside sentences |

Automated tools catch roughly a third to a half of real problems. Below is the test only a person can do.

## 10-minute screen-reader test (do this yourself)

### iPhone (VoiceOver)

**Turn it on:** Settings → Accessibility → VoiceOver → On. Easier: Settings → Accessibility →
Accessibility Shortcut → VoiceOver. Then triple-click the side button turns it on and off.

**Gestures:**
- Swipe right or left: next or previous item.
- Double-tap: activate.
- Two-finger swipe up: read the whole page from the top.
- Rotor (twist two fingers like a dial): choose Headings, Links or Form Controls, then swipe up or down to jump between them.
- Three-finger swipe: scroll.

**On modemechanical.com in Safari, check:**

1. **Home page (2 min).** Swipe right from the top. You should hear "Skip to content", then the logo,
   then the menu button. Double-tap "Skip to content": the next swipe should land on the main heading.
2. **Headings (1 min).** Set the rotor to Headings and swipe down. The headings should read like a table
   of contents, starting with the page title.
3. **Menu (1 min).** Double-tap the menu button. You should hear "Close menu, expanded". Open "Services":
   it should say expanded and read its links. Close the menu.
4. **Repair page (2 min).** Open AC & Heating Repair. Find "Air conditioning not cooling" and double-tap it.
   It should say expanded and read the answer.
5. **Contact form (3 min).** Open Contact. Swipe to the form. Each field should say its name and "required".
   Double-tap Send Message with the form empty. You should hear an error, and focus should be on the first field
   with its error message read. Fill the fields with test text (or a real test message) and send.
   You should hear "Message sent".
6. **Call link (30 s).** Swipe to the phone number and double-tap. The phone should offer to call
   (cancel the call).

### Android (TalkBack)

Settings → Accessibility → TalkBack → On. Swipe right or left to move, double-tap to activate, and
swipe down then right for the reading controls (Headings, Links). Do the same six steps in Chrome.

### What counts as a problem

Write down the page, what you did and what you heard, and send it over:
- something read in the wrong order, or not read at all;
- a button or link that is just "button" or "link" with no name;
- having to swipe through lots of noise (for example the same thing read twice);
- focus jumping somewhere unexpected after tapping;
- an error or the "Message sent" confirmation that is never announced.

## Keeping it that way

- Every new image needs alt text that says what it shows; decorative duplicates use `alt=""`.
- New icon-only buttons and links need an `aria-label`.
- Links inside sentences must be underlined, not marked by colour alone.
- Keep one H1 per page and don't skip heading levels (`npm run verify` fails otherwise).
