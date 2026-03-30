(function siteRuntimeUI() {
  function bindToggle(buttonSelector, panelSelector) {
    var button = document.querySelector(buttonSelector);
    var panel = document.querySelector(panelSelector);
    if (!button || !panel) return;

    function setOpen(nextOpen) {
      panel.classList.toggle('hidden', !nextOpen);
      panel.classList.toggle('is-open', nextOpen);
      button.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    }

    setOpen(false);
    button.addEventListener('click', function () {
      var expanded = button.getAttribute('aria-expanded') === 'true';
      setOpen(!expanded);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  bindToggle('[data-site-nav-toggle]', '[data-site-nav-panel]');
  bindToggle('[data-site-search-toggle]', '[data-site-search-panel]');
})();
