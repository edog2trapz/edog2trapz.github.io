// Shows a clear message if the game cannot start, instead of an endless loading screen.
(function () {
  var shown = false;
  function show(html) {
    if (shown || window.app) return;
    var el = document.getElementById('loading');
    if (!el) return;
    shown = true;
    el.classList.remove('hidden');
    el.innerHTML = '<div class="boot-err"><b>Breachline could not start</b><p>' + html + '</p><button onclick="location.reload()">Reload</button></div>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  window.__bootFail = function (msg) { show(esc(msg)); };
  window.addEventListener('error', function (e) {
    if (window.app) return;
    var t = e.target;
    if (t && t.tagName === 'SCRIPT') show('A game file failed to load (' + esc(t.src || 'script') + '). Check your internet connection and reload.');
    else if (e.message) show('Error while starting: ' + esc(e.message));
  }, true);
  setTimeout(function () {
    if (!window.app) show('Loading is taking too long. Reload the page; if it keeps happening, your browser may be blocking scripts or WebGL.');
  }, 25000);
})();
