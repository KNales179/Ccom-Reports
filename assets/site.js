(function () {
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  // A manual choice is only ever kept in memory. It survives moving between pages
  // (passed in the address, then removed) but a refresh goes back to the system setting.
  var params = new URLSearchParams(location.search);
  var chosen = params.get('theme');
  if (chosen === 'light' || chosen === 'dark') {
    root.setAttribute('data-theme', chosen);
    params.delete('theme');
    var rest = params.toString();
    try {
      history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    } catch (e) {}
  }

  function currentTheme() {
    return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
  }
  window.getTheme = currentTheme;

  function announce() {
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: currentTheme() } }));
  }

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.querySelector('.theme-toggle');

    function updateLabel() {
      if (!button) return;
      var dark = currentTheme() === 'dark';
      button.textContent = dark ? 'Light mode' : 'Dark mode';
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    updateLabel();

    if (button) {
      button.addEventListener('click', function () {
        root.setAttribute('data-theme', currentTheme() === 'dark' ? 'light' : 'dark');
        updateLabel();
        announce();
      });
    }

    mq.addEventListener('change', function () {
      if (!root.getAttribute('data-theme')) {
        updateLabel();
        announce();
      }
    });

    document.addEventListener('click', function (event) {
      var theme = root.getAttribute('data-theme');
      var link = event.target.closest && event.target.closest('a[href]');
      if (!theme || !link) return;
      var url = new URL(link.href, location.href);
      var samePage = url.pathname === location.pathname && url.hash;
      if (url.origin !== location.origin || samePage) return;
      url.searchParams.set('theme', theme);
      link.href = url.href;
    });
  });
})();
