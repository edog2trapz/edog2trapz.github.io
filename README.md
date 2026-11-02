# 2trapz games

Free browser games. `index.html` is the homepage, and every game lives in its own folder under `games/`.

```
2trapz-games/
  index.html            ← the homepage (and the list of games)
  games/
    power-hungry/index.html
    vector-terminal/index.html
    sack-lewis-2/index.html + js/   ← some games have extra files; keep them together
    ...
```

To try the site on your own computer, double-click `index.html`.

---

## Publish it for free (GitHub Pages)

You only do this once.

1. **Make a GitHub account** at https://github.com/signup. Your username becomes part of your web address, so pick it with care (for example `2trapz`).
2. **Create a repository.** Click the **+** in the top right, then **New repository**.
   - Name it `<your-username>.github.io`, for example `2trapz.github.io`. That exact name makes the site live at `https://2trapz.github.io`.
   - Set it to **Public**, then click **Create repository**.
3. **Upload the site.** On the new repository page, click **uploading an existing file**.
   - Open this `2trapz-games` folder in File Explorer, select `index.html`, `README.md` and the `games` folder, and drag them all onto the GitHub page.
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
3. Open the homepage `index.html` in a text editor (Notepad works) and find the `GAMES = [` list near the top. Copy any entry and change it:
   ```js
   { slug:'my-new-game', title:'My New Game', icon:'🎮', genre:'Action', colors:['#111111', '#39ff8a'], players:'1 player', isNew:true,
     desc:'One or two sentences about the game.' },
   ```
   - `slug` must match the folder name exactly.
   - `icon` is any emoji. `colors` are the two ends of the card's background.
   - `isNew:true` shows a pink NEW tag. Delete it when the game isn't new any more.
4. Upload both the new game folder and the changed homepage `index.html` to GitHub (**Add file → Upload files**, then **Commit changes**).

## Remove a game

Delete its entry from the `GAMES` list in `index.html` and upload that file. You can also delete the game's folder on GitHub (open a file in it, click the **…** menu, then **Delete file**).

## Change the site name or tagline

At the top of `index.html`, edit `SITE_NAME` and `TAGLINE`, then upload the file.

---

## Easier updates (optional): GitHub Desktop

If you update a lot, install **GitHub Desktop** (https://desktop.github.com). Sign in, then choose **File → Clone repository** and pick your `<username>.github.io` repository. That makes a folder on your computer that stays linked to the website.

From then on:
1. Edit, add or replace files in that folder.
2. Open GitHub Desktop. It lists everything that changed.
3. Type a short note (like "added Vector Terminal") and click **Commit to main**, then **Push origin**.

That's it: every change you make goes live with two clicks.

## Good to know

- Saved games live in each player's own browser, so every visitor gets their own progress.
- Power Hungry downloads its world map from the internet when it starts, so it needs a connection.
- Stick Brawl's online room mode only works inside Claude. Everything else works anywhere.
- Breachline plays against bots right on the site. Its online and LAN mode needs the separate Breachline server (`node server.js`), which GitHub Pages can't run.
