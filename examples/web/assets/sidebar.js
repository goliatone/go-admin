document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const toggleButton = document.getElementById('sidebar-toggle');
  const sidebarStateKey = 'admin-sidebar-collapsed';

  if (sidebar) {
    const savedState = localStorage.getItem(sidebarStateKey);
    if (savedState === 'true') {
      sidebar.setAttribute('data-collapsed', 'true');
    }
  }

  toggleButton?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!sidebar) return;
    const isCollapsed = sidebar.getAttribute('data-collapsed') === 'true';
    const nextState = (!isCollapsed).toString();
    sidebar.setAttribute('data-collapsed', nextState);
    localStorage.setItem(sidebarStateKey, nextState);
  });

  document.querySelectorAll('[data-submenu-toggle]').forEach((toggle) => {
    const target = toggle.getAttribute('data-submenu-toggle');
    if (!target) {
      return;
    }

    const submenu = document.querySelector(`[data-submenu="${target}"]`);
    if (!submenu) {
      return;
    }

    const storageKey = `submenu-${target}-collapsed`;
    const indicator = toggle.querySelector('.submenu-indicator');
    const saved = localStorage.getItem(storageKey);

    const setExpanded = (expanded) => {
      toggle.setAttribute('data-expanded', expanded.toString());
      submenu.classList.toggle('expanded', expanded);
      submenu.classList.toggle('collapsed', !expanded);
      if (indicator) {
        indicator.classList.toggle('rotate-180', expanded);
      }
      localStorage.setItem(storageKey, (!expanded).toString());
    };

    if (saved === 'true') {
      setExpanded(false);
    } else if (toggle.getAttribute('data-expanded') === 'true') {
      setExpanded(true);
    }

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      const isExpanded = toggle.getAttribute('data-expanded') === 'true';
      setExpanded(!isExpanded);
    });
  });
});
