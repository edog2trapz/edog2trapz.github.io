/* =====================================================================
   2TRAPZ GAMES :: accounts
   Sign in with Google, GitHub or email, using Firebase.
   This file only loads when ACCOUNTS.firebase is filled in (assets/data.js).
   It saves each player's gamertag, avatar, achievements, plays and
   favorites to their account, stores reviews online (they wait for an
   admin to approve them) and powers the leaderboard.
   ===================================================================== */
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

export async function start(TZ, cfg){
  const [{ initializeApp }, A, F] = await Promise.all([
    import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(cfg.firebase);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const admins = (cfg.admins || []).map(e => String(e).toLowerCase());
  const emit = () => document.dispatchEvent(new CustomEvent('tz:auth'));
  let user = null, syncState = 'idle', timer = 0, pulling = false;

  const cleanTag = s => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, '').slice(0, 18) || 'Player';
  const setSync = s => { syncState = s; document.dispatchEvent(new CustomEvent('tz:sync', { detail: s })); };

  /* ---------- progress sync ---------- */
  async function pull(){
    pulling = true; setSync('syncing');
    const ref = F.doc(db, 'users', user.uid);
    let cloud = null;
    try { const snap = await F.getDoc(ref); cloud = snap.exists() ? snap.data() : null; } catch (e){ console.warn('[2trapz] could not load profile', e); }
    const local = {
      profile: TZ.get('tz.profile', {}) || {}, ach: TZ.get('tz.ach', {}) || {}, plays: TZ.get('tz.plays', {}) || {},
      favs: TZ.get('tz.favs', []) || [], styles: TZ.get('tz.styles', {}) || {},
    };
    const profile = { ...local.profile };
    if (cloud){
      const ach = { ...(cloud.ach || {}) };
      for (const [k, v] of Object.entries(local.ach)) ach[k] = ach[k] ? Math.min(ach[k], v) : v;
      const plays = { ...(cloud.plays || {}) };
      for (const [k, v] of Object.entries(local.plays)) plays[k] = Math.max(plays[k] || 0, v || 0);
      TZ.set('tz.ach', ach); TZ.set('tz.plays', plays);
      TZ.set('tz.favs', [...new Set([...(cloud.favs || []), ...local.favs])]);
      TZ.set('tz.styles', { ...(cloud.styles || {}), ...local.styles });
      if (cloud.tag && (cloud.custom || !local.profile.custom)){ profile.tag = cleanTag(cloud.tag); profile.custom = !!cloud.custom; }
      if (cloud.avatar) profile.avatar = cloud.avatar;
    } else if (!local.profile.custom && user.displayName){
      profile.tag = cleanTag(user.displayName.split(' ')[0] + Math.floor(10 + Math.random() * 90));
    }
    TZ.set('tz.profile', profile);
    pulling = false;
    TZ.reloadProfile();
    await push();
  }
  async function push(){
    if (!user) return;
    clearTimeout(timer);
    const p = TZ.get('tz.profile', {}) || {};
    const data = {
      tag: cleanTag(p.tag), avatar: String(p.avatar || '🎮').slice(0, 8), custom: !!p.custom,
      score: Math.round(TZ.score()), level: Math.round(TZ.level().lv),
      ach: TZ.get('tz.ach', {}) || {}, plays: TZ.get('tz.plays', {}) || {},
      favs: (TZ.get('tz.favs', []) || []).slice(0, 60), styles: TZ.get('tz.styles', {}) || {},
      updated: F.serverTimestamp(),
    };
    setSync('syncing');
    try { await F.setDoc(F.doc(db, 'users', user.uid), data, { merge: true }); setSync('synced'); }
    catch (e){ console.warn('[2trapz] sync failed', e); setSync('error'); }
  }
  function save(){ if (!user || pulling) return; clearTimeout(timer); timer = setTimeout(push, 2500); }

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

  const api = {
    enabled: true,
    user: () => user && {
      uid: user.uid, name: user.displayName || '', email: user.email || '', photo: user.photoURL || '', verified: !!user.emailVerified,
      provider: ((user.providerData || [])[0] || {}).providerId || 'password',
      created: user.metadata && user.metadata.creationTime,
    },
    isAdmin: () => !!(user && user.email && user.emailVerified && admins.includes(user.email.toLowerCase())),
    sync: () => syncState,
    save, push,
    errorText: e => (e && (ERR[e.code] || e.message)) || 'Something went wrong. Try again.',
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
      await A.signOut(auth);
      ['tz.profile','tz.ach','tz.plays','tz.favs','tz.styles','tz.myReviews','arcade.recent'].forEach(k => { try { localStorage.removeItem(k); } catch (e){} });
    },
    async deleteAccount(){
      if (!user) return;
      try { await F.deleteDoc(F.doc(db, 'users', user.uid)); } catch (e){}
      await A.deleteUser(user);
      ['tz.profile','tz.ach','tz.plays','tz.favs','tz.styles','tz.myReviews','arcade.recent'].forEach(k => { try { localStorage.removeItem(k); } catch (e){} });
    },

    /* reviews */
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
        uid: user.uid, status: 'pending', created: F.serverTimestamp(),
      });
      return ref.id;
    },
    async deleteMyReview(id){ await F.deleteDoc(F.doc(db, 'reviews', id)); },

    /* leaderboard */
    async leaderboard(n){
      const snap = await F.getDocs(F.query(F.collection(db, 'users'), F.orderBy('score', 'desc'), F.limit(n || 50)));
      return snap.docs.map(d => { const x = d.data(); return { uid: d.id, tag: x.tag, avatar: x.avatar, score: x.score || 0, level: x.level || 1, games: Object.keys(x.plays || {}).length, ach: Object.keys(x.ach || {}).length }; });
    },

    /* admin */
    async pendingReviews(){
      const snap = await F.getDocs(F.query(F.collection(db, 'reviews'), F.where('status', '==', 'pending'), F.limit(200)));
      return snap.docs.map(d => ({ id: d.id, ...pick(d.data()) }));
    },
    setReviewStatus: (id, status) => F.updateDoc(F.doc(db, 'reviews', id), { status }),
    removeReview: id => F.deleteDoc(F.doc(db, 'reviews', id)),
  };
  function pick(d){ return { game: d.game, name: d.name, stars: d.stars, text: d.text, date: d.date, avatar: d.avatar, uid: d.uid, status: d.status }; }

  /* ---------- watch the signed-in user ---------- */
  let first = true;
  await new Promise(resolve => {
    A.onAuthStateChanged(auth, async u => {
      const was = user; user = u;
      if (u){
        await pull();
        if (!was && TZ.unlock('online')) save();
      } else setSync('idle');
      if (first){ first = false; resolve(); }
      emit();
    });
  });
  A.getRedirectResult(auth).catch(e => { api.lastError = e; emit(); });
  return api;
}
