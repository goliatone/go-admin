document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const desktopToggle = document.getElementById('sidebar-toggle');
  const mobileToggle = document.getElementById('sidebar-mobile-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebarStateKey = 'admin-sidebar-collapsed';
  const narrowSidebarQuery = window.matchMedia('(max-width: 1023px)');

  const setDesktopCollapsed = (collapsed) => {
    if (!sidebar) return;
    sidebar.setAttribute('data-collapsed', String(collapsed));
    desktopToggle?.setAttribute('aria-expanded', String(!collapsed));
    desktopToggle?.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  };

  const setMobileOpen = (open, restoreFocus = false) => {
    if (!sidebar) return;
    sidebar.setAttribute('data-mobile-open', String(open));
    sidebar.setAttribute('aria-hidden', String(!open));
    sidebar.inert = !open;
    mobileToggle?.setAttribute('aria-expanded', String(open));
    mobileToggle?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (backdrop) {
      backdrop.hidden = !open;
    }
    document.documentElement.classList.toggle('sidebar-mobile-open', open);
    if (open) {
      const firstFocusable = sidebar.querySelector(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    } else if (restoreFocus) {
      mobileToggle?.focus();
    }
  };

  const applySidebarState = () => {
    if (!sidebar) return;
    if (narrowSidebarQuery.matches) {
      setDesktopCollapsed(false);
      setMobileOpen(false);
      return;
    }
    sidebar.removeAttribute('aria-hidden');
    sidebar.inert = false;
    sidebar.setAttribute('data-mobile-open', 'false');
    mobileToggle?.setAttribute('aria-expanded', 'false');
    if (backdrop) {
      backdrop.hidden = true;
    }
    document.documentElement.classList.remove('sidebar-mobile-open');
    setDesktopCollapsed(localStorage.getItem(sidebarStateKey) === 'true');
  };

  applySidebarState();
  narrowSidebarQuery.addEventListener?.('change', applySidebarState);

  desktopToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!sidebar || narrowSidebarQuery.matches) return;
    const nextCollapsed = sidebar.getAttribute('data-collapsed') !== 'true';
    setDesktopCollapsed(nextCollapsed);
    localStorage.setItem(sidebarStateKey, String(nextCollapsed));
  });

  mobileToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!sidebar || !narrowSidebarQuery.matches) return;
    setMobileOpen(sidebar.getAttribute('data-mobile-open') !== 'true', true);
  });

  backdrop?.addEventListener('click', () => {
    if (narrowSidebarQuery.matches) {
      setMobileOpen(false, true);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && narrowSidebarQuery.matches &&
        sidebar?.getAttribute('data-mobile-open') === 'true') {
      event.preventDefault();
      setMobileOpen(false, true);
    }
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

    // Attach click handler ONLY to the button, not the entire container
    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      const isExpanded = container.getAttribute('data-expanded') === 'true';
      setExpanded(!isExpanded);
    });
  });

  // Group collapse toggle (top-level menu groups like Navigation, Tools, Translations)
  document.querySelectorAll('[data-group-toggle]').forEach((container) => {
    const target = container.getAttribute('data-group-toggle');
    if (!target) {
      return;
    }

    const childrenContainer = container.querySelector(`[data-group="${target}"]`);
    const toggleButton = container.querySelector('button');
    if (!childrenContainer || !toggleButton) {
      return;
    }

    const storageKey = `group-${target}-collapsed`;
    const indicator = toggleButton.querySelector('.group-indicator');
    const saved = localStorage.getItem(storageKey);

    const setExpanded = (expanded) => {
      container.setAttribute('data-expanded', expanded.toString());
      childrenContainer.classList.toggle('expanded', expanded);
      childrenContainer.classList.toggle('collapsed', !expanded);
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
