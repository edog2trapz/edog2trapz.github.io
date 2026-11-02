# 2trapz games

Free browser games, wrapped in a **DORFic** website (Daylight, Orange, Red, Futurism, Graphic): glossy glass, orange swooshes, a white future-city skyline and a mid-2000s console feel.

```
index.html         ← homepage: news ticker, featured spotlight, new arrivals, genres, reviews
games.html         ← the full library with search, genre filters and sorting
game.html          ← one page per game (game.html?g=breachline): details, ratings, reviews
leaderboard.html   ← the Ranks: top players by TZ score (needs accounts)
reviews.html       ← every review, plus a top-rated leaderboard
achievements.html  ← the trophy room
account.html       ← sign in, Player ID card, profile, your reviews, delete account
news.html          ← news posts (edit NEWS in assets/data.js)
about.html         ← about you and the DORFic style (edit ABOUT in assets/data.js)
faq.html           ← help center
contact.html       ← contact the creator: submit a game, request a game, message or bug
privacy.html, terms.html   ← privacy policy and terms of use
admin.html         ← your review approval console (only you can use it)
404.html           ← "signal lost" page for broken links
assets/
  data.js          ← EDIT THIS: games, reviews, news, about text, accounts settings, your email
  site.css         ← the DORFic look (all 5 styles)
  site.js          ← header, Guide, achievements, sounds, launch screen
  accounts.js      ← sign-in and cloud saving (only loads once accounts are on)
firestore.rules    ← database security rules to paste into Firebase
sitemap.xml, robots.txt, site.webmanifest   ← for Google search and "add to home screen"
games/
  power-hungry/index.html
  sack-lewis-2/index.html + js/   ← some games have extra files; keep them together
  ...
```

To try the site on your own computer, double-click `index.html`. (Sending messages and reviews needs the site to be online.)

---

## Publish it for free (GitHub Pages)

You only do this once.

1. **Make a GitHub account** at https://github.com/signup. Your username becomes part of your web address, so pick it with care (for example `2trapz`).
2. **Create a repository.** Click the **+** in the top right, then **New repository**.
   - Name it `<your-username>.github.io`, for example `2trapz.github.io`. That exact name makes the site live at `https://2trapz.github.io`.
   - Set it to **Public**, then click **Create repository**.
3. **Upload the site.** On the new repository page, click **uploading an existing file**.
   - Open this `2trapz-games` folder in File Explorer, select everything in the folder (all the `.html` files, `assets`, `games`, and the other files), and drag them all onto the GitHub page.
   - Wait for every file to finish uploading, then click **Commit changes** at the bottom.
4. **Turn on Pages.** In the repository go to **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
5. **Wait about a minute**, then visit `https://<your-username>.github.io`. Your site is live.

---

## Update a game

1. Replace the game's file on your computer, for example `games/power-hungry/index.html`.
2. On GitHub, open that same folder (`games/power-hungry`), click **Add file → Upload files**, drag the new `index.html` in, and click **Commit changes**. GitHub replaces the old file.
3. The live site updates within a minute or two. If you still see the old version, press **Ctrl+F5** to refresh.

## Add a new game

1. Make a new folder inside `games/`, named in lowercase with dashes, for example `games/my-new-game/`.
2. Put the game's HTML file in it and name it **`index.html`**. If the game has extra files (like a `js/` folder), put them in the same folder.
3. Open **`assets/data.js`** in a text editor (Notepad works) and find the `GAMES = [` list. Copy any entry and change it:
   ```js
   { slug:'my-new-game', title:'My New Game', icon:'🎮', genre:'Action', colors:['#111111', '#ff8a00'], players:'1 player', isNew:true, featured:true,
     desc:'One or two sentences about the game.' },
   ```
   - `slug` must match the folder name exactly.
   - `icon` is any emoji. `colors` are the two ends of the cover's background.
   - `isNew:true` shows a red NEW badge and puts it in **New arrivals**. Delete it when the game isn't new any more.
   - `featured:true` puts it in the big spotlight at the top of the homepage. Keep about 5 featured games.
   - A new `genre` gets its own filter and genre tile automatically.
4. Upload the new game folder and the changed `assets/data.js` to GitHub (**Add file → Upload files**, then **Commit changes**).

## Remove a game

Delete its entry from the `GAMES` list in `assets/data.js` and upload that file. You can also delete the game's folder on GitHub (open a file in it, click the **…** menu, then **Delete file**).

## Change the site name, tagline or email

At the top of `assets/data.js`, edit `SITE_NAME`, `TAGLINE` or `CREATOR_EMAIL`, then upload the file.

---

## Contact form: turn it on (do this once)

The Contact page and reviews send email through **FormSubmit** (free, no account). The first message ever sent needs you to say yes:

1. Once the site is live, open your Contact page and send yourself a test message.
2. Check **realbug1243@gmail.com** (and the spam folder) for an email from FormSubmit and click **Activate Form**.
3. From then on, every game submission, game request, bug report and review lands in your inbox.

If FormSubmit is ever down, visitors get a button to send the same message with their own email app instead.

## Reviews: approve them

When someone posts a review it shows up for them straight away, and you get an email with the review. At the bottom of that email is a ready-made line like this:

```js
{ game:"breachline", name:"Sam", stars:5, text:"The case openings are addictive.", date:"2026-11-02" },
```

If you like it, paste that line into the `REVIEWS = [` list at the bottom of `assets/data.js` and upload the file. Now everyone sees it, and it counts toward the game's stars and the top-rated leaderboard. Ignore the email if you don't want it on the site.

---

## Turn on accounts (sign in with Google, email and GitHub)

Until you do this, everyone plays as a guest and their progress stays on their own device. Turning on accounts adds Google and email sign-in, cloud-saved progress, the Ranks leaderboard, and a review approval console. It's free (Firebase's free plan) and takes about 10 minutes.

1. Go to **https://console.firebase.google.com** and sign in with **realbug1243@gmail.com**.
2. Click **Create a project**, name it `2trapz-games`, switch Google Analytics **off**, and finish.
3. On the project home page, click the **</>** (Web) button to add a web app. Give it any nickname, leave "Firebase Hosting" unticked, and click **Register app**.
4. Firebase shows some code with `const firebaseConfig = { ... }`. Copy everything **inside the curly braces**.
5. Open `assets/data.js`, find `firebase: null,` and replace it with what you copied, inside `{ }`:
   ```js
   firebase: { apiKey: "AIza...", authDomain: "2trapz-games.firebaseapp.com", projectId: "2trapz-games", storageBucket: "...", messagingSenderId: "...", appId: "..." },
   ```
   (These keys are meant to be public. The security comes from the rules in step 8.)
6. In Firebase, open **Build → Authentication → Get started → Sign-in method**. Turn on **Google** (pick your email as the support email) and **Email/Password**. Save each one.
7. Still in Authentication, open **Settings → Authorized domains → Add domain** and add `edog2trapz.github.io`.
8. Open **Build → Firestore Database → Create database**. Pick a location near you, choose **production mode**, and create it. Then open the **Rules** tab, delete everything there, paste in everything from this repo's `firestore.rules` file, and click **Publish**.
9. Upload the changed `assets/data.js` to GitHub. Wait a minute, open the site, go to **Account** and sign in with Google using **realbug1243@gmail.com**. You're the admin: your account page shows an **Admin console** button.

**Approving reviews with accounts on:** players must sign in to post reviews. You get an email for each one with a link to `admin.html`, where you click **Approve**, **Hide** or **Delete**. (No more pasting code into `data.js`.)

**Optional, sign in with GitHub:** in Firebase, open Authentication → Sign-in method → **GitHub**, switch it on, and copy the callback URL it shows. On GitHub, go to Settings → Developer settings → OAuth Apps → **New OAuth App**. Use `https://edog2trapz.github.io` as the homepage and paste the callback URL. Create it, then copy the **Client ID** and a new **Client secret** back into Firebase and save. Finally, change `providers: ['google', 'email']` to `providers: ['google', 'email', 'github']` in `assets/data.js`.

**Adding another admin:** add their email to `admins` in `assets/data.js` **and** to the list in `isAdmin()` in `firestore.rules`, then publish the rules again.

## News and About

- **News:** add a post to the top of the `NEWS` list in `assets/data.js`. It shows on the News page and scrolls across the homepage ticker.
- **About:** change `ABOUT` in `assets/data.js` to tell people about yourself.

---

## The cool stuff

- **5 DORFic styles.** Click the swirly swatch button in the top bar (or press **S**): Daylight, Night, Industrial, Blaze and Aero. Auto follows the device's light or dark setting.
- **Guide.** Click your gamertag (or press **G**) to change your gamertag and avatar, see your level, achievements, recently played games and favorites.
- **Achievements.** 17 of them (18 with accounts on), worth TZ points, with a pop-up and a chime when you unlock one. Two are secret.
- **Favorites.** Tap the ♡ on any game.
- **Launch screen, startup intro and sounds.** Sounds can be turned off in the Guide's settings.
- **Accounts** (once turned on): Player ID card, cloud saves, the Ranks leaderboard and an admin console.
- **Shortcuts:** **/** search, **R** random game, **S** switch style, **G** Guide, **Esc** close.
- **Secret:** there is a classic cheat code. On a phone, tap the orange 2t logo 7 times on the homepage.

---

## Easier updates (optional): GitHub Desktop

If you update a lot, install **GitHub Desktop** (https://desktop.github.com). Sign in, then choose **File → Clone repository** and pick your `<username>.github.io` repository. That makes a folder on your computer that stays linked to the website.

From then on:
1. Edit, add or replace files in that folder.
2. Open GitHub Desktop. It lists everything that changed.
3. Type a short note (like "added Vector Terminal") and click **Commit to main**, then **Push origin**.

That's it: every change you make goes live with two clicks.

## Good to know

- Saved games, gamertags, achievements and favorites live in each player's own browser, so every visitor gets their own progress.
- Power Hungry downloads its world map from the internet when it starts, so it needs a connection.
- Stick Brawl's online room mode only works inside Claude. Everything else works anywhere.
- Breachline plays against bots right on the site. Its online and LAN mode needs the separate Breachline server (`node server.js`), which GitHub Pages can't run.
- Besieged plays against bots anywhere, but its online matches only work inside Claude. It loads its 3D engine from the internet when it starts, so it needs a connection.
