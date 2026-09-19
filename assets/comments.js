(function () {
  var script = document.currentScript;
  var REPORT = (script && script.getAttribute('data-report')) || 'blueprint';
  var cfg = window.COMMENTS_CONFIG || {};
  var configured = !!(cfg.url && cfg.anonKey);

  var boxes = [].slice.call(document.querySelectorAll('[data-comment-form]'));
  if (!boxes.length) return;

  var LABELS = { general: 'Your comment' };
  var token = readerToken();
  var mine = [];
  var lastName = '';

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  // A private, random id kept in this browser. It is how a reader gets their own comments back
  // after a refresh. If the browser won't store it, comments still save, they just won't reappear.
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

  function headers(extra) {
    var h = { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey, 'Content-Type': 'application/json' };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  function load() {
    return fetch(endpoint('rpc/get_my_comments'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ p_token: token, p_report: REPORT })
    })
      .then(function (r) { if (!r.ok) throw new Error('load ' + r.status); return r.json(); })
      .then(function (rows) { mine = rows || []; renderAll(); })
      .catch(function () { /* the form still works without the list */ });
  }

  function save(key, text, name) {
    return fetch(endpoint('report_comments'), {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ report: REPORT, question_key: key, author_name: name || null, body: text, reader_token: token })
    }).then(function (r) { if (!r.ok) throw new Error('save ' + r.status); });
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

  function card(c) {
    var d = el('div', 'saved');
    d.appendChild(el('div', 'when', (c.author_name ? c.author_name + ' · ' : '') + when(c.created_at)));
    d.appendChild(el('p', 'text', c.body));
    if (c.reply) {
      var r = el('div', 'reply');
      r.appendChild(el('span', 'who', 'Our reply' + (c.replied_at ? ' · ' + when(c.replied_at) : '')));
      r.appendChild(el('p', 'text', c.reply));
      d.appendChild(r);
    }
    return d;
  }

  function renderAll() {
    boxes.forEach(function (box) {
      if (!box._list) return;
      var key = box.getAttribute('data-comment-form');
      box._list.textContent = '';
      mine.filter(function (c) { return c.question_key === key; }).forEach(function (c) { box._list.appendChild(card(c)); });
    });
  }

  function build(box) {
    var key = box.getAttribute('data-comment-form');
    var general = key === 'general';
    box.classList.add('comment-form');

    var list = el('div', 'saved-list');
    var form = el('form');
    form.noValidate = true;

    var label = el('label', null, LABELS[key] || 'Your answer');
    var ta = el('textarea');
    ta.id = 'comment-' + key;
    ta.rows = 4;
    ta.maxLength = 4000;
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
    var status = el('span', 'status');
    status.setAttribute('role', 'status');
    row.appendChild(btn);
    row.appendChild(status);
    form.appendChild(row);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = ta.value.trim();
      if (trap.value) { ta.value = ''; return; } // a bot filled the hidden field
      if (!text) { status.textContent = 'Please write something first.'; ta.focus(); return; }
      if (nameInput) lastName = nameInput.value.trim();
      btn.disabled = true;
      status.textContent = 'Saving…';
      save(key, text, lastName)
        .then(function () { ta.value = ''; status.textContent = 'Saved. Thank you.'; return load(); })
        .catch(function () { status.textContent = "That didn't save. Please try again in a moment."; })
        .then(function () { btn.disabled = false; });
    });

    box.appendChild(list);
    box.appendChild(form);
    box._list = list;
  }

  if (!configured) {
    boxes.forEach(function (box) {
      if (box.getAttribute('data-comment-form') === 'general') {
        box.appendChild(el('p', 'note-muted', "Comments aren't switched on for this page yet."));
      } else {
        box.hidden = true;
      }
    });
    return;
  }

  boxes.forEach(build);
  load();
})();
