/* =====================================================================
   2TRAPZ GAMES :: accounts
   Sign in with a username (or email, Google, GitHub), using Firebase.
   This file only loads when ACCOUNTS.firebase is filled in (assets/data.js).

   What it does for a signed-in player:
   - saves gamertag, avatar, achievements, plays and favorites to the account
   - saves every game's save data to the account, so games continue on
     any device (synced each time a 2trapz page opens and before a game starts)
   - online status ("online", "playing Breachline"), friends, friend
     requests, game invites and live Orb Four matches
   - reviews (wait for admin approval) and the leaderboard
   ===================================================================== */
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
/* Username accounts are Firebase email/password accounts with a made-up
   address on this domain, so players never need a real email. */
const USER_DOMAIN = 'player.edog2trapz.github.io';
export const usernameOk = u => /^[A-Za-z0-9_]{3,16}$/.test(String(u || ''));
const userEmail = u => String(u).trim().toLowerCase() + '@' + USER_DOMAIN;
/* localStorage keys that belong to the website itself. Everything else is game save data. */
const SITE_KEY = k => /^(tz\.|arcade\.|firebase|mock\.|__|_ga|google)/i.test(k);
const MAX_SAVE = 900000;
const ONLINE_MS = 5 * 60 * 1000;

export const fnv = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16).toUpperCase().padStart(8, '0'); };
export const codeOf = uid => fnv(uid);
export const pairOf = (a, b) => [a, b].sort().join('_');

export async function start(TZ, cfg){
  const [{ initializeApp }, A, F] = await Promise.all([
    import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(cfg.firebase);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const admins = (cfg.admins || []).map(e => String(e).toLowerCase());
  const emit = (n, detail) => document.dispatchEvent(new CustomEvent(n || 'tz:auth', { detail }));
  let user = null, syncState = 'idle', timer = 0, pulling = false, pendingTag = null, lastSig = '', cloudSavesAt = 0, savesJob = null, lastBeat = 0;
  const isUsername = u => !!(u && u.email && u.email.endsWith('@' + USER_DOMAIN));
  const me = () => user && user.uid;
  const userRef = uid => F.doc(db, 'users', uid || user.uid);

  const cleanTag = s => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, '').slice(0, 18) || 'Player';
  const setSync = s => { syncState = s; emit('tz:sync', s); };

  /* ---------- profile sync ---------- */
  function profileData(){
    const p = TZ.get('tz.profile', {}) || {};
    return {
      tag: cleanTag(p.tag), avatar: String(p.avatar || '🎮').slice(0, 8), custom: !!p.custom,
      score: Math.round(TZ.score()), level: Math.round(TZ.level().lv),
      ach: TZ.get('tz.ach', {}) || {}, plays: TZ.get('tz.plays', {}) || {},
      favs: (TZ.get('tz.favs', []) || []).slice(0, 60), styles: TZ.get('tz.styles', {}) || {},
      code: codeOf(user.uid),
    };
  }
  async function pull(){
    pulling = true; setSync('syncing');
    let cloud = null;
    try { const snap = await F.getDoc(userRef()); cloud = snap.exists() ? snap.data() : null; } catch (e){ console.warn('[2trapz] could not load profile', e); }
    const local = {
      profile: TZ.get('tz.profile', {}) || {}, ach: TZ.get('tz.ach', {}) || {}, plays: TZ.get('tz.plays', {}) || {},
      favs: TZ.get('tz.favs', []) || [], styles: TZ.get('tz.styles', {}) || {},
    };
    const profile = { ...local.profile };
    if (cloud){
      cloudSavesAt = cloud.savesAt || 0;
      const ach = { ...(cloud.ach || {}) };
      for (const [k, v] of Object.entries(local.ach)) ach[k] = ach[k] ? Math.min(ach[k], v) : v;
      const plays = { ...(cloud.plays || {}) };
      for (const [k, v] of Object.entries(local.plays)) plays[k] = Math.max(plays[k] || 0, v || 0);
      TZ.set('tz.ach', ach); TZ.set('tz.plays', plays);
      TZ.set('tz.favs', [...new Set([...(cloud.favs || []), ...local.favs])]);
      TZ.set('tz.styles', { ...(cloud.styles || {}), ...local.styles });
      if (cloud.tag && (cloud.custom || !local.profile.custom)){ profile.tag = cleanTag(cloud.tag); profile.custom = !!cloud.custom; }
      if (cloud.avatar) profile.avatar = cloud.avatar;
      const c = { tag: cloud.tag, avatar: cloud.avatar, custom: cloud.custom, score: cloud.score, level: cloud.level, ach: cloud.ach || {}, plays: cloud.plays || {}, favs: cloud.favs || [], styles: cloud.styles || {}, code: cloud.code };
      lastSig = JSON.stringify(c);
    } else if (!local.profile.custom && user.displayName){
      profile.tag = cleanTag(user.displayName.split(' ')[0] + Math.floor(10 + Math.random() * 90));
    }
    if (pendingTag){ profile.tag = cleanTag(pendingTag); profile.custom = true; pendingTag = null; }
    TZ.set('tz.profile', profile);
    pulling = false;
    TZ.reloadProfile();
    await push();
  }
  async function push(){
    if (!user) return;
    clearTimeout(timer);
    const data = profileData(), sig = JSON.stringify(data);
    if (sig === lastSig){ setSync('synced'); return; }
    setSync('syncing');
    try { await F.setDoc(userRef(), { ...data, updated: Date.now() }, { merge: true }); lastSig = sig; setSync('synced'); }
    catch (e){ console.warn('[2trapz] sync failed', e); setSync('error'); }
  }
  function save(){ if (!user || pulling) return; clearTimeout(timer); timer = setTimeout(push, 2500); }

  /* ---------- game save sync ----------
     Each game keeps its saves in this site's localStorage. We copy every
     non-site key to users/{uid}/saves and back. A local manifest remembers
     what was last synced, so only changed saves are uploaded. */
  const MAN = 'tz.saveman';
  const docId = k => encodeURIComponent(k).replace(/\./g, '%2E');
  function gameKeys(){ const out = []; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && !SITE_KEY(k)) out.push(k); } return out; }
  function syncSaves(force){
    if (!user) return Promise.resolve({ pulled:0, pushed:0 });
    if (savesJob) return savesJob;
    savesJob = (async () => {
      const man = TZ.get(MAN, {}) || {};
      if (man.__uid && man.__uid !== user.uid){ for (const k of Object.keys(man)) delete man[k]; }
      man.__uid = user.uid;
      let cloud = null, pulled = 0, pushed = 0;
      if (force || !man.__pulled || cloudSavesAt > man.__pulled){
        const snap = await F.getDocs(F.collection(db, 'users', user.uid, 'saves'));
        cloud = {}; snap.docs.forEach(d => { const x = d.data(); if (x && typeof x.k === 'string') cloud[x.k] = x; });
      }
      const keys = new Set(gameKeys()); if (cloud) Object.keys(cloud).forEach(k => keys.add(k));
      for (const k of keys){
        if (k.startsWith('__')) continue;
        const L = localStorage.getItem(k), m = man[k] || {};
        const lh = L == null ? null : fnv(L) + ':' + L.length;
        const C = cloud && cloud[k];
        if (C && lh && C.h === lh){ man[k] = { h: lh, t: C.t }; continue; }
        const localChanged = L != null && lh !== m.h;
        const cloudChanged = !!(C && C.t > (m.t || 0) && C.h !== m.h);
        if (cloudChanged && (!localChanged || String(C.v).length >= L.length)){
          try { localStorage.setItem(k, C.v); man[k] = { h: C.h, t: C.t }; pulled++; } catch (e){ console.warn('[2trapz] could not restore save', k, e); }
        } else if (localChanged && L.length <= MAX_SAVE){
          const t = Date.now();
          try { await F.setDoc(F.doc(db, 'users', user.uid, 'saves', docId(k)), { k, v: L, h: lh, t }); man[k] = { h: lh, t }; pushed++; }
          catch (e){ console.warn('[2trapz] could not upload save', k, e); }
        }
      }
      if (pushed){ const t = Date.now(); try { await F.setDoc(userRef(), { savesAt: t }, { merge: true }); cloudSavesAt = t; } catch (e){} }
      man.__pulled = Math.max(cloudSavesAt, man.__pulled || 0, cloud ? Date.now() : 0);
      TZ.set(MAN, man);
      if (pulled || pushed) emit('tz:saves', { pulled, pushed });
      return { pulled, pushed };
    })().finally(() => { savesJob = null; });
    return savesJob;
  }

  /* ---------- presence ---------- */
  async function beat(playing){
    if (!user) return;
    const now = Date.now();
    if (playing == null && now - lastBeat < 150000) return;
    lastBeat = now;
    try { await F.setDoc(userRef(), { seen: now, playing: playing || '' }, { merge: true }); } catch (e){}
  }
  const publicProfile = (uid, x) => ({ uid, tag: x.tag || 'Player', avatar: x.avatar || '🎮', score: x.score || 0, level: x.level || 1,
    games: Object.keys(x.plays || {}).length, ach: Object.keys(x.ach || {}).length, code: x.code || codeOf(uid),
    seen: x.seen || 0, playing: x.playing || '', online: !!(x.seen && Date.now() - x.seen < ONLINE_MS) });

  /* ---------- sign in / out ---------- */
  async function withPopup(provider){
    try { return await A.signInWithPopup(auth, provider); }
    catch (e){
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return A.signInWithRedirect(auth, provider);
      throw e;
    }
  }
  const ERR = {
    'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
    'auth/cancelled-popup-request': 'The sign-in window was closed before finishing.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email. Create one instead?',
    'auth/invalid-email': 'That email address doesn\'t look right.',
    'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
    'auth/weak-password': 'Pick a password with at least 6 characters.',
    'auth/missing-password': 'Type your password.',
    'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
    'auth/network-request-failed': 'Couldn\'t reach the internet. Check your connection.',
    'auth/unauthorized-domain': 'This website isn\'t on Firebase\'s approved list yet (Authentication → Settings → Authorized domains).',
    'auth/operation-not-allowed': 'That sign-in method isn\'t switched on in Firebase yet.',
    'auth/account-exists-with-different-credential': 'That email already signed in a different way. Try the other button.',
    'auth/requires-recent-login': 'For safety, sign out, sign back in, then try again.',
    'permission-denied': 'The server said no. (Check the Firestore rules in the README.)',
  };
  const UERR = {
    'auth/email-already-in-use': 'That username is taken. Try another one.',
    'auth/invalid-credential': 'Wrong username or password.',
    'auth/wrong-password': 'Wrong username or password.',
    'auth/user-not-found': 'No account with that username. Create one instead?',
    'auth/invalid-email': 'Usernames can only use letters, numbers and _ (3 to 16 of them).',
    'auth/operation-not-allowed': 'Accounts aren\'t switched on in Firebase yet (turn on Email/Password).',
  };
  const LOCAL_KEYS = ['tz.profile','tz.ach','tz.plays','tz.favs','tz.styles','tz.myReviews','arcade.recent','tz.saveman'];
  const wipeLocal = () => LOCAL_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch (e){} });
  const unsubs = new Set();
  const listen = (q, cb, err) => { const u = F.onSnapshot(q, cb, err || (e => console.warn('[2trapz] live update failed', e))); unsubs.add(u); return () => { unsubs.delete(u); u(); }; };

  const api = {
    enabled: true,
    user: () => user && {
      uid: user.uid, name: user.displayName || '', photo: user.photoURL || '', verified: !!user.emailVerified,
      username: isUsername(user) ? user.email.split('@')[0] : '',
      email: isUsername(user) ? '' : (user.email || ''),
      provider: isUsername(user) ? 'username' : (((user.providerData || [])[0] || {}).providerId || 'password'),
      created: user.metadata && user.metadata.creationTime,
      code: codeOf(user.uid),
    },
    usernameOk,
    signInUser: (name, pw) => A.signInWithEmailAndPassword(auth, userEmail(name), pw),
    async signUpUser(name, pw){ pendingTag = name; try { return await A.createUserWithEmailAndPassword(auth, userEmail(name), pw); } catch (e){ pendingTag = null; throw e; } },
    isAdmin: () => !!(user && user.email && user.emailVerified && admins.includes(user.email.toLowerCase())),
    sync: () => syncState,
    save, push, syncSaves, beat,
    errorText: (e, kind) => {
      if (kind === 'username' && e && UERR[e.code]) return UERR[e.code];
      return (e && (ERR[e.code] || e.message)) || 'Something went wrong. Try again.';
    },
    signIn(which){
      const p = which === 'github' ? new A.GithubAuthProvider() : new A.GoogleAuthProvider();
      if (which !== 'github') p.setCustomParameters({ prompt: 'select_account' });
      return withPopup(p);
    },
    signInEmail: (email, pw) => A.signInWithEmailAndPassword(auth, email, pw),
    async signUpEmail(email, pw){
      const cred = await A.createUserWithEmailAndPassword(auth, email, pw);
      try { await A.sendEmailVerification(cred.user); } catch (e){}
      return cred;
    },
    resetPassword: email => A.sendPasswordResetEmail(auth, email),
    async signOut(){
      try { await syncSaves(); } catch (e){}
      unsubs.forEach(u => { try { u(); } catch (e){} }); unsubs.clear();
      await A.signOut(auth);
      wipeLocal();
    },
    async deleteAccount(){
      if (!user) return;
      const uid = user.uid;
      try { const s = await F.getDocs(F.collection(db, 'users', uid, 'saves')); await Promise.all(s.docs.map(d => F.deleteDoc(F.doc(db, 'users', uid, 'saves', d.id)))); } catch (e){}
      try { const s = await F.getDocs(F.query(F.collection(db, 'friendships'), F.where('members', 'array-contains', uid))); await Promise.all(s.docs.map(d => F.deleteDoc(F.doc(db, 'friendships', d.id)))); } catch (e){}
      try { await F.deleteDoc(userRef(uid)); } catch (e){}
      unsubs.forEach(u => { try { u(); } catch (e){} }); unsubs.clear();
      await A.deleteUser(user);
      wipeLocal();
    },

    /* things the site calls right before a game starts */
    async beforePlay(slug){ await Promise.all([syncSaves().catch(() => {}), beat(slug || '')]); },

    /* ---------- friends ---------- */
    myCode: () => user ? codeOf(user.uid) : '',
    async profile(uid){ const s = await F.getDoc(userRef(uid)); return s.exists() ? publicProfile(uid, s.data()) : null; },
    async profiles(uids){ return (await Promise.all([...new Set(uids)].map(u => api.profile(u).catch(() => null)))).filter(Boolean); },
    async findPlayers(q){
      q = String(q || '').trim(); if (!q) return [];
      const code = q.toUpperCase().replace(/^2TZ/, '').replace(/[^0-9A-F]/g, '');
      let docs = [];
      if (code.length === 8) docs = (await F.getDocs(F.query(F.collection(db, 'users'), F.where('code', '==', code), F.limit(5)))).docs;
      if (!docs.length) docs = (await F.getDocs(F.query(F.collection(db, 'users'), F.where('tag', '==', q.replace(/\s+/g, '')), F.limit(10)))).docs;
      return docs.filter(d => d.id !== me()).map(d => publicProfile(d.id, d.data()));
    },
    async friendships(){
      if (!user) return [];
      const s = await F.getDocs(F.query(F.collection(db, 'friendships'), F.where('members', 'array-contains', me())));
      return s.docs.map(d => shapeFriendship(d.id, d.data()));
    },
    watchFriendships(cb){
      if (!user) return () => {};
      return listen(F.query(F.collection(db, 'friendships'), F.where('members', 'array-contains', me())), s => cb(s.docs.map(d => shapeFriendship(d.id, d.data()))));
    },
    async addFriend(other){
      if (!user || !other || other.uid === me()) throw new Error('You can\'t add yourself.');
      const id = pairOf(me(), other.uid), existing = (await api.friendships()).find(f => f.id === id);
      if (existing){
        if (existing.status === 'accepted') return 'already';
        if (existing.to === me()){ await api.acceptFriend(id); return 'accepted'; }
        return 'pending';
      }
      const p = TZ.profile();
      await F.setDoc(F.doc(db, 'friendships', id), { members: [me(), other.uid], from: me(), to: other.uid, status: 'pending',
        tags: { [me()]: cleanTag(p.tag), [other.uid]: cleanTag(other.tag) }, avatars: { [me()]: p.avatar, [other.uid]: other.avatar || '🎮' }, created: Date.now() });
      return 'sent';
    },
    acceptFriend: id => F.updateDoc(F.doc(db, 'friendships', id), { status: 'accepted', acceptedAt: Date.now() }),
    removeFriend: id => F.deleteDoc(F.doc(db, 'friendships', id)),

    /* ---------- invites ---------- */
    async invite(toUid, game, match){
      const p = TZ.profile();
      return F.addDoc(F.collection(db, 'invites'), { from: me(), to: toUid, pair: pairOf(me(), toUid), fromTag: cleanTag(p.tag), fromAvatar: p.avatar,
        game: String(game || ''), match: match || '', status: 'open', created: Date.now() });
    },
    watchInvites(cb){
      if (!user) return () => {};
      return listen(F.query(F.collection(db, 'invites'), F.where('to', '==', me()), F.where('status', '==', 'open')),
        s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => Date.now() - (x.created || 0) < 30 * 60 * 1000)));
    },
    closeInvite: id => F.updateDoc(F.doc(db, 'invites', id), { status: 'done' }),

    /* ---------- live matches (Orb Four) ---------- */
    async createMatch(friend, game){
      const p = TZ.profile(), now = Date.now();
      const ref = await F.addDoc(F.collection(db, 'matches'), {
        game: game || 'orb-four', players: [me(), friend.uid], pair: pairOf(me(), friend.uid),
        tags: { [me()]: cleanTag(p.tag), [friend.uid]: cleanTag(friend.tag) }, avatars: { [me()]: p.avatar, [friend.uid]: friend.avatar || '🎮' },
        board: '.'.repeat(42), turn: me(), status: 'waiting', winner: '', moves: 0, last: -1, emote: null, rematch: '', created: now, updated: now,
      });
      await api.invite(friend.uid, game || 'orb-four', ref.id);
      return ref.id;
    },
    watchMatch(id, cb, err){ return listen(F.doc(db, 'matches', id), s => cb(s.exists() ? { id: s.id, ...s.data() } : null), err); },
    updateMatch: (id, data) => F.updateDoc(F.doc(db, 'matches', id), { ...data, updated: Date.now() }),

    /* ---------- reviews ---------- */
    async approvedReviews(){
      const snap = await F.getDocs(F.query(F.collection(db, 'reviews'), F.where('status', '==', 'approved'), F.limit(400)));
      return snap.docs.map(d => ({ id: d.id, ...pick(d.data()) }));
    },
    async myReviews(){
      if (!user) return [];
      const snap = await F.getDocs(F.query(F.collection(db, 'reviews'), F.where('uid', '==', user.uid), F.limit(100)));
      return snap.docs.map(d => ({ id: d.id, ...pick(d.data()) }));
    },
    async postReview(r){
      if (!user) throw new Error('Sign in first.');
      const ref = await F.addDoc(F.collection(db, 'reviews'), {
        game: r.game, name: r.name, stars: r.stars, text: r.text, date: r.date, avatar: r.avatar,
        uid: user.uid, status: 'pending', created: Date.now(),
      });
      return ref.id;
    },
    async deleteMyReview(id){ await F.deleteDoc(F.doc(db, 'reviews', id)); },

    /* ---------- leaderboard ---------- */
    async leaderboard(n){
      const snap = await F.getDocs(F.query(F.collection(db, 'users'), F.orderBy('score', 'desc'), F.limit(n || 50)));
      return snap.docs.map(d => publicProfile(d.id, d.data())).filter(x => x.tag);
    },

    /* ---------- admin ---------- */
    async pendingReviews(){
      const snap = await F.getDocs(F.query(F.collection(db, 'reviews'), F.where('status', '==', 'pending'), F.limit(200)));
      return snap.docs.map(d => ({ id: d.id, ...pick(d.data()) }));
    },
    setReviewStatus: (id, status) => F.updateDoc(F.doc(db, 'reviews', id), { status }),
    removeReview: id => F.deleteDoc(F.doc(db, 'reviews', id)),
  };
  function pick(d){ return { game: d.game, name: d.name, stars: d.stars, text: d.text, date: d.date, avatar: d.avatar, uid: d.uid, status: d.status }; }
  function shapeFriendship(id, x){
    const other = (x.members || []).find(u => u !== me()) || '';
    return { id, other, status: x.status, from: x.from, to: x.to, incoming: x.status === 'pending' && x.to === me(),
      tag: (x.tags || {})[other] || 'Player', avatar: (x.avatars || {})[other] || '🎮', created: x.created || 0 };
  }

  /* ---------- watch the signed-in user ---------- */
  let first = true;
  await new Promise(resolve => {
    A.onAuthStateChanged(auth, async u => {
      const was = user; user = u;
      if (u){
        await pull();
        if (!was && TZ.unlock('online')) save();
        beat();
        syncSaves().catch(e => console.warn('[2trapz] save sync failed', e));
      } else { setSync('idle'); unsubs.forEach(x => { try { x(); } catch (e){} }); unsubs.clear(); }
      if (first){ first = false; resolve(); }
      emit();
    });
  });
  A.getRedirectResult(auth).catch(e => { api.lastError = e; emit(); });
  /* keep online status fresh while a 2trapz page is open */
  setInterval(() => { if (user && !document.hidden) beat(); }, 160000);
  addEventListener('pageshow', e => { if (e.persisted && user){ syncSaves().catch(() => {}); beat(''); } });
  return api;
}
