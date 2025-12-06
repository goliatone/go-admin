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

  // User menu toggle
  const userMenuToggle = document.getElementById('user-menu-toggle');
  const userMenu = document.getElementById('user-menu');
  const userMenuArrow = document.getElementById('user-menu-arrow');

  userMenuToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isHidden = userMenu.classList.contains('hidden');
    if (isHidden) {
      userMenu.classList.remove('hidden');
      userMenuArrow?.classList.add('rotate-180');
    } else {
      userMenu.classList.add('hidden');
      userMenuArrow?.classList.remove('rotate-180');
    }
  });

  // Close user menu when clicking outside
  document.addEventListener('click', (event) => {
    if (!userMenu?.contains(event.target) && event.target !== userMenuToggle) {
      userMenu?.classList.add('hidden');
      userMenuArrow?.classList.remove('rotate-180');
    }
  });

  document.querySelectorAll('[data-submenu-toggle]').forEach((container) => {
    const target = container.getAttribute('data-submenu-toggle');
    if (!target) {
      return;
    }

    const submenu = document.querySelector(`[data-submenu="${target}"]`);
    const toggleButton = container.querySelector('button.nav-item');
    if (!submenu || !toggleButton) {
      return;
    }

    const storageKey = `submenu-${target}-collapsed`;
    const indicator = toggleButton.querySelector('.submenu-indicator');
    const saved = localStorage.getItem(storageKey);

    const setExpanded = (expanded) => {
      container.setAttribute('data-expanded', expanded.toString());
      submenu.classList.toggle('expanded', expanded);
      submenu.classList.toggle('collapsed', !expanded);
      if (indicator) {
        indicator.classList.toggle('rotate-180', expanded);
      }
      localStorage.setItem(storageKey, (!expanded).toString());
    };

    if (saved === 'true') {
      setExpanded(false);
    } else if (container.getAttribute('data-expanded') === 'true') {
      setExpanded(true);
    }

    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      const isExpanded = container.getAttribute('data-expanded') === 'true';
      setExpanded(!isExpanded);
    });
  });
});
