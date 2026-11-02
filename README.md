# 2trapz games

Free browser games, wrapped in a **DORFic** website (Daylight, Orange, Red, Futurism, Graphic): glossy glass, orange swooshes, a white future-city skyline and a mid-2000s console feel.

```
index.html      ← homepage: featured spotlight, new arrivals, genres, reviews
games.html      ← the full library with search, genre filters and sorting
game.html       ← one page per game (game.html?g=breachline): details, ratings, reviews
reviews.html    ← every review, plus a top-rated leaderboard
contact.html    ← contact the creator: submit a game, request a game, message or bug
404.html        ← "signal lost" page for broken links
assets/
  data.js       ← EDIT THIS: games list, approved reviews, site name, your email
  site.css      ← the DORFic look (all 5 styles)
  site.js       ← header, Guide, achievements, sounds, launch screen
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
   - Open this `2trapz-games` folder in File Explorer, select all the `.html` files, `README.md`, and the `assets` and `games` folders, and drag them all onto the GitHub page.
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

## The cool stuff

- **5 DORFic styles.** Click the swirly swatch button in the top bar (or press **S**): Daylight, Night, Industrial, Blaze and Aero. Auto follows the device's light or dark setting.
- **Guide.** Click your gamertag (or press **G**) to change your gamertag and avatar, see your level, achievements, recently played games and favorites.
- **Achievements.** 17 of them, worth TZ points, with a pop-up and a chime when you unlock one. Two are secret.
- **Favorites.** Tap the ♡ on any game.
- **Launch screen, startup intro and sounds.** Sounds can be turned off in the Guide's settings.
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
