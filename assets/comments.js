(function () {
  var script = document.currentScript;
  var REPORT = (script && script.getAttribute('data-report')) || 'blueprint';
  var cfg = window.COMMENTS_CONFIG || {};
  var configured = !!(cfg.url && cfg.anonKey);

  var boxes = [].slice.call(document.querySelectorAll('[data-comment-form]'));
  if (!boxes.length) return;

  var token = readerToken();
  var saved = {};     // this reader's saved answer for each question, by key
  var lastName = '';

  var PEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  // A private, random id kept in this browser. It is how a reader gets their own answers back
  // after a refresh. If the browser won't store it, answers still save, they just won't reappear.
  function readerToken() {
    var key = 'ccom_reader_token', t = null;
    try { t = localStorage.getItem(key); } catch (e) {}
    if (!t) {
      t = uuid();
      try { localStorage.setItem(key, t); } catch (e) {}
    }
    return t;
  }

  function endpoint(path) { return cfg.url.replace(/\/+$/, '') + '/rest/v1/' + path; }

  function headers() {
    var h = { apikey: cfg.anonKey, 'Content-Type': 'application/json' };
    // The older anon key is a JWT and is also sent as a bearer token. The newer publishable key is not, so it goes in apikey only.
    if (/^eyJ/.test(cfg.anonKey)) h.Authorization = 'Bearer ' + cfg.anonKey;
    return h;
  }

  function rpc(name, body) {
    return fetch(endpoint('rpc/' + name), { method: 'POST', headers: headers(), body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); });
  }

  function load() {
    return rpc('get_my_site_comments', { p_token: token, p_report: REPORT })
      .then(function (rows) {
        saved = {};
        (rows || []).forEach(function (c) { saved[c.question_key] = c; });
        boxes.forEach(function (box) {
          var ta = box.querySelector('textarea');
          if (box._editing || (ta && ta.value)) return; // never wipe something she is in the middle of typing
          render(box);
        });
      })
      .catch(function () { /* the boxes still work without the saved list */ });
  }

  function save(key, text, name) {
    return rpc('save_my_site_comment', { p_token: token, p_report: REPORT, p_key: key, p_body: text, p_name: name || null })
      .then(function (rows) { if (rows && rows[0]) saved[key] = rows[0]; });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function when(iso) {
    try {
      return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function noun(key) { return key === 'general' ? 'comment' : 'answer'; }

  function startEdit(box) {
    box._editing = true;
    render(box);
    var ta = box.querySelector('textarea');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }

  function stopEdit(box) {
    box._editing = false;
    render(box);
    var pen = box.querySelector('.pen');
    if (pen) pen.focus();
  }

  // The saved answer, with a pen to change it. Double-clicking the text does the same.
  function view(box, key, c) {
    var d = el('div', 'saved');
    var top = el('div', 'saved-top');
    var meta = (c.author_name ? c.author_name + ' · ' : '') + (c.updated_at ? 'Edited ' + when(c.updated_at) : 'Saved ' + when(c.created_at));
    top.appendChild(el('div', 'when', meta));
    var pen = el('button', 'pen');
    pen.type = 'button';
    pen.title = 'Edit your ' + noun(key);
    pen.setAttribute('aria-label', 'Edit your ' + noun(key));
    pen.innerHTML = PEN;
    pen.addEventListener('click', function () { startEdit(box); });
    top.appendChild(pen);
    d.appendChild(top);

    var text = el('p', 'text', c.body);
    text.title = 'Double-click to edit';
    text.addEventListener('dblclick', function () { startEdit(box); });
    d.appendChild(text);

    if (c.reply) {
      var r = el('div', 'reply');
      r.appendChild(el('span', 'who', 'Our reply' + (c.replied_at ? ' · ' + when(c.replied_at) : '')));
      r.appendChild(el('p', 'text', c.reply));
      d.appendChild(r);
    }
    return d;
  }

  // The input: empty the first time, filled in when changing an existing answer.
  function editor(box, key, c, preview) {
    var general = key === 'general';
    var form = el('form');
    form.noValidate = true;

    var label = el('label', null, general ? 'Your comment' : 'Your answer');
    var ta = el('textarea');
    ta.id = 'comment-' + key;
    ta.rows = 4;
    ta.maxLength = 4000;
    ta.value = c ? c.body : '';
    label.htmlFor = ta.id;
    form.appendChild(label);
    form.appendChild(ta);

    var nameInput = null;
    if (general) {
      var nl = el('label', 'name-label', 'Your name (optional)');
      nameInput = el('input');
      nameInput.type = 'text';
      nameInput.id = 'comment-name';
      nameInput.maxLength = 80;
      nameInput.autocomplete = 'name';
      nameInput.value = (c && c.author_name) || lastName;
      nl.htmlFor = nameInput.id;
      form.appendChild(nl);
      form.appendChild(nameInput);
    }

    var trap = el('input', 'hp');
    trap.type = 'text';
    trap.name = 'website';
    trap.tabIndex = -1;
    trap.autocomplete = 'off';
    trap.setAttribute('aria-hidden', 'true');
    form.appendChild(trap);

    var row = el('div', 'row');
    var btn = el('button', 'button', 'Save');
    btn.type = 'submit';
    row.appendChild(btn);
    var cancel = null;
    if (c) {
      cancel = el('button', 'button quiet', 'Cancel');
      cancel.type = 'button';
      cancel.addEventListener('click', function () { stopEdit(box); });
      row.appendChild(cancel);
    }
    var status = el('span', 'status');
    status.setAttribute('role', 'status');
    row.appendChild(status);
    form.appendChild(row);

    // Until the database is connected, show the boxes so the layout can be judged, but don't let anyone type
    if (preview) {
      ta.disabled = true;
      if (nameInput) nameInput.disabled = true;
      btn.disabled = true;
      status.textContent = 'Preview only: saving is not switched on yet.';
    }

    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && c) { e.preventDefault(); stopEdit(box); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = ta.value.trim();
      if (trap.value) { ta.value = ''; return; } // a bot filled the hidden field
      if (!text) { status.textContent = 'Please write something first.'; ta.focus(); return; }
      if (nameInput) lastName = nameInput.value.trim();
      btn.disabled = true;
      if (cancel) cancel.disabled = true;
      status.textContent = 'Saving…';
      save(key, text, lastName)
        .then(function () { box._editing = false; render(box); })
        .catch(function () {
          status.textContent = "That didn't save. Please try again in a moment.";
          btn.disabled = false;
          if (cancel) cancel.disabled = false;
        });
    });

    return form;
  }

  function render(box) {
    var key = box.getAttribute('data-comment-form');
    var c = saved[key];
    box.classList.add('comment-form');
    box.textContent = '';
    if (!configured) { box.appendChild(editor(box, key, null, true)); return; }
    box.appendChild(box._editing || !c ? editor(box, key, c, false) : view(box, key, c));
  }

  boxes.forEach(render);
  if (configured) load();
})();
