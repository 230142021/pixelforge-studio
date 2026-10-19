'use strict';
(function () {
  var startedAt = Date.now();

  // Portfolio cards from data/projects.json (text set via textContent: no HTML injection)
  function el(tag, text, cls) { var n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; }
  function link(href, label) { var a = el('a', label); a.href = href; a.rel = 'noopener noreferrer'; a.target = '_blank'; return a; }
  fetch('data/projects.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
    var ul = document.getElementById('projects'); ul.textContent = '';
    list.forEach(function (p) {
      var li = el('li', '', 'card');
      li.appendChild(el('h3', p.title)); li.appendChild(el('p', p.description));
      var tags = el('ul', '', 'tags'); (p.tech || []).forEach(function (t) { tags.appendChild(el('li', t)); }); li.appendChild(tags);
      var links = el('div', '', 'links');
      links.appendChild(/^https?:\/\//.test(p.repo) ? link(p.repo, 'GitHub repository') : el('span', 'Repository: not set', 'muted'));
      links.appendChild(/^https?:\/\//.test(p.demo) ? link(p.demo, 'Play demo') : el('span', 'Demo: not set', 'muted'));
      li.appendChild(links); ul.appendChild(li);
    });
  }).catch(function () { document.getElementById('projects').innerHTML = '<li>Projects could not be loaded.</li>'; });

  var form = document.getElementById('form'), btn = document.getElementById('submit'), status = document.getElementById('status');
  var msg = document.getElementById('message'), count = document.getElementById('count');
  msg.addEventListener('input', function () { count.textContent = msg.value.length + '/2000'; });
  var EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

  function setErr(k, text) {
    var s = document.getElementById('err-' + k), f = form.elements[k];
    if (s) s.textContent = text || '';
    if (f) { if (text) { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', 'err-' + k); } else { f.removeAttribute('aria-invalid'); } }
  }
  function validate(d) {
    var e = {};
    if (d.name.length < 2) e.name = 'Enter your name (2-100 characters).';
    if (!EMAIL.test(d.email)) e.email = 'Enter a valid email address.';
    if (!d.projectType) e.projectType = 'Choose a project type.';
    if (d.message.length < 20) e.message = 'Describe your project in at least 20 characters.';
    if (!d.consent) e.consent = 'Consent is required to send your request.';
    return e;
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (btn.disabled) return; // prevent duplicate submissions
    var v = function (n) { return form.elements[n].value.trim(); };
    var d = { name: v('name'), email: v('email'), contact: v('contact'), projectType: v('projectType'), budget: v('budget'), timeline: v('timeline'), message: v('message'), consent: form.elements.consent.checked, website: v('website'), startedAt: startedAt };
    ['name', 'email', 'contact', 'projectType', 'budget', 'timeline', 'message', 'consent'].forEach(function (k) { setErr(k, ''); });
    var e = validate(d), keys = Object.keys(e);
    if (keys.length) { keys.forEach(function (k) { setErr(k, e[k]); }); status.className = 'bad'; status.textContent = 'Please fix the highlighted fields.'; form.elements[keys[0]].focus(); return; }

    btn.disabled = true; btn.textContent = 'Sending...'; status.className = ''; status.textContent = 'Sending your request...';
    fetch('/api/consultation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.ok && x.j.ok === true) {
          status.className = 'ok'; status.textContent = 'Request sent. We will reply by email or Telegram soon.';
          form.reset(); count.textContent = '0/2000'; startedAt = Date.now();
        } else {
          if (x.j.fields) Object.keys(x.j.fields).forEach(function (k) { setErr(k, x.j.fields[k]); });
          status.className = 'bad'; status.textContent = x.j.error || 'Something went wrong. Please try again.';
        }
      })
      .catch(function () { status.className = 'bad'; status.textContent = 'Network error. Check your connection and try again.'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Send request'; });
  });
})();
