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
      if (/^https?:\/\//.test(p.repo)) links.appendChild(link(p.repo, 'GitHub'));
      if (/^https?:\/\//.test(p.demo)) links.appendChild(link(p.demo, 'Играть в демо'));
      li.appendChild(links); ul.appendChild(li);
    });
  }).catch(function () { document.getElementById('projects').innerHTML = '<li>Не удалось загрузить проекты.</li>'; });

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
    if (d.name.length < 2) e.name = 'Введите имя (от 2 до 100 символов).';
    if (!EMAIL.test(d.email)) e.email = 'Введите корректный email.';
    if (!d.projectType) e.projectType = 'Выберите тип проекта.';
    if (d.message.length < 20) e.message = 'Опишите проект, минимум 20 символов.';
    if (!d.consent) e.consent = 'Нужно согласие на обработку данных.';
    return e;
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (btn.disabled) return; // prevent duplicate submissions
    var v = function (n) { return form.elements[n].value.trim(); };
    var d = { name: v('name'), email: v('email'), contact: v('contact'), projectType: v('projectType'), budget: v('budget'), timeline: v('timeline'), message: v('message'), consent: form.elements.consent.checked, website: v('website'), startedAt: startedAt };
    ['name', 'email', 'contact', 'projectType', 'budget', 'timeline', 'message', 'consent'].forEach(function (k) { setErr(k, ''); });
    var e = validate(d), keys = Object.keys(e);
    if (keys.length) { keys.forEach(function (k) { setErr(k, e[k]); }); status.className = 'bad'; status.textContent = 'Исправьте отмеченные поля.'; form.elements[keys[0]].focus(); return; }

    btn.disabled = true; btn.textContent = 'Отправляем...'; status.className = ''; status.textContent = 'Отправляем запрос...';
    fetch('/api/consultation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.ok && x.j.ok === true) {
          status.className = 'ok'; status.textContent = 'Запрос отправлен. Скоро свяжусь с вами по email или в Telegram.';
          form.reset(); count.textContent = '0/2000'; startedAt = Date.now();
        } else {
          if (x.j.fields) Object.keys(x.j.fields).forEach(function (k) { setErr(k, x.j.fields[k]); });
          status.className = 'bad'; status.textContent = x.j.error || 'Что-то пошло не так. Попробуйте ещё раз.';
        }
      })
      .catch(function () { status.className = 'bad'; status.textContent = 'Ошибка сети. Проверьте соединение и попробуйте снова.'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Отправить запрос'; });
  });

  // Gallery lightbox
  var shots = Array.prototype.slice.call(document.querySelectorAll('.shot')), box = document.getElementById('lightbox'), cur = 0, opener = null;
  function show(i) {
    cur = (i + shots.length) % shots.length;
    document.getElementById('lb-img').innerHTML = shots[cur].querySelector('svg').outerHTML;
    document.getElementById('lb-cap').textContent = shots[cur].getAttribute('data-cap');
  }
  shots.forEach(function (b, i) { b.addEventListener('click', function () { opener = b; show(i); box.showModal(); }); });
  document.getElementById('lb-prev').addEventListener('click', function () { show(cur - 1); });
  document.getElementById('lb-next').addEventListener('click', function () { show(cur + 1); });
  document.getElementById('lb-close').addEventListener('click', function () { box.close(); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  box.addEventListener('close', function () { if (opener) opener.focus(); });
  box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
})();
