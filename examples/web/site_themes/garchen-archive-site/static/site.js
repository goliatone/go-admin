(function () {
  const initializedHeaders = new WeakSet();
  const initializedToggles = new WeakSet();
  const initializedSearches = new WeakSet();
  const toggleRootState = new WeakMap();

  function bindToggle(scope, buttonSelector, panelSelector, options = {}) {
    const root = scope || document;
    const button = root.querySelector(buttonSelector);
    const panel = root.querySelector(panelSelector);
    if (!button || !panel || initializedToggles.has(button)) return;
    initializedToggles.add(button);

    function syncExpanded(nextOpen) {
      button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      panel.classList.toggle("is-open", nextOpen);
      if (options.useHiddenAttribute === true && "hidden" in panel) {
        panel.hidden = !nextOpen;
      }
      if (typeof options.syncHidden === "function") {
        options.syncHidden(panel, nextOpen);
      }
    }

    function setOpen(nextOpen) {
      syncExpanded(nextOpen);
      toggleRootState.set(button, nextOpen);
    }

    const initiallyExpanded = button.getAttribute("aria-expanded") === "true";
    if (options.useHiddenAttribute === true && "hidden" in panel) {
      panel.hidden = !initiallyExpanded;
    }
    setOpen(initiallyExpanded);
    button.addEventListener("click", () => {
      setOpen(!toggleRootState.get(button));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  function initSiteHeader(root) {
    const scope = root || document;
    const headers = scope.querySelectorAll("[data-site-header]");
    headers.forEach((header) => {
      if (initializedHeaders.has(header)) return;
      initializedHeaders.add(header);

      const menus = Array.from(header.querySelectorAll("[data-site-header-menu]"));

      const closeMenus = (except) => {
        menus.forEach((menu) => {
          const isTarget = except !== undefined && menu === except;
          const button = menu.querySelector("[data-site-header-trigger]");
          menu.dataset.open = isTarget ? "true" : "false";
          if (button) {
            button.setAttribute("aria-expanded", isTarget ? "true" : "false");
          }
        });
      };

      menus.forEach((menu) => {
        const button = menu.querySelector("[data-site-header-trigger]");
        if (!button) return;

        button.addEventListener("click", (event) => {
          event.preventDefault();
          const isOpen = menu.dataset.open === "true";
          closeMenus(isOpen ? undefined : menu);
        });
      });

      header.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenus();
      });

      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (!header.contains(target)) closeMenus();
      });
    });
  }

  function initDropdown(root) {
    const scope = root || document;
    const triggers = scope.querySelectorAll("[data-ui-dropdown-trigger]");

    triggers.forEach((trigger) => {
      if (trigger.dataset.uiDropdownBound === "true") return;
      trigger.dataset.uiDropdownBound = "true";

      trigger.addEventListener("click", () => {
        const host = trigger.closest("[data-ui-dropdown]");
        if (!host) return;

        const nextOpen = host.dataset.open !== "true";
        host.dataset.open = nextOpen ? "true" : "false";
        trigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");

        const panel = host.querySelector(".ui-dropdown__surface");
        if (panel) {
          panel.hidden = !nextOpen;
        }
      });
    });
  }

  function initNewsletterCta(root) {
    const scope = root || document;
    const forms = scope.querySelectorAll("[data-newsletter-cta-form]");

    forms.forEach((form) => {
      if (form.dataset.newsletterCtaBound === "true") return;
      form.dataset.newsletterCtaBound = "true";

      form.addEventListener("submit", (event) => {
        event.preventDefault();
      });
    });
  }

  function initSiteSearch(root) {
    const scope = root || document;
    const inputs = scope.querySelectorAll("[data-site-search-input]");

    inputs.forEach((input) => {
      if (initializedSearches.has(input)) return;
      initializedSearches.add(input);

      if (!(input instanceof HTMLInputElement)) return;
      const field = input.closest(".site-search-page__field") || input.parentElement;
      const box = field && field.querySelector("[data-site-search-suggestions]");
      if (!(box instanceof HTMLElement)) return;
      let timer = 0;
      let requestId = 0;

      function hideBox() {
        box.hidden = true;
        box.innerHTML = "";
      }

      async function fetchSuggestions(query, expectedRequestId) {
        const endpoint = input.dataset.siteSearchSuggestEndpoint || "/api/v1/site/search/suggest";
        const params = new URLSearchParams();
        params.set("q", query);
        const localeInput = scope.querySelector('input[name="locale"]');
        if (localeInput instanceof HTMLInputElement && localeInput.value.trim()) {
          params.set("locale", localeInput.value.trim());
        }

        const response = await fetch(endpoint + "?" + params.toString(), {
          headers: { Accept: "application/json" }
        });
        if (!response.ok) {
          hideBox();
          return;
        }
        const payload = await response.json();
        if (expectedRequestId !== requestId) {
          return;
        }
        const suggestions = (((payload || {}).data || {}).suggestions) || [];
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
          hideBox();
          return;
        }

        box.innerHTML = suggestions
          .map((item) => (
            '<button type="button" class="site-search-page__suggestion-item">' + item + "</button>"
          ))
          .join("");
        box.querySelectorAll("button").forEach((button) => {
          button.addEventListener("click", () => {
            input.value = button.textContent || "";
            if (input.form) input.form.submit();
          });
        });
        box.hidden = false;
      }

      input.addEventListener("input", () => {
        const query = input.value.trim();
        clearTimeout(timer);
        if (query.length < 2) {
          hideBox();
          return;
        }
        const nextRequestId = requestId + 1;
        requestId = nextRequestId;
        timer = setTimeout(() => {
          fetchSuggestions(query, nextRequestId).catch(hideBox);
        }, 180);
      });

      input.addEventListener("blur", () => {
        setTimeout(hideBox, 150);
      });
    });
  }

  function initSiteTheme(root) {
    initSiteHeader(root);
    initDropdown(root);
    initNewsletterCta(root);
    bindToggle(root || document, "[data-site-nav-toggle]", "[data-site-nav-panel]");
    bindToggle(root || document, "[data-site-search-toggle]", "[data-site-search-panel]");
    initSiteSearch(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initSiteTheme(document));
  } else {
    initSiteTheme(document);
  }

  window.GarchenSiteTheme = {
    init: initSiteTheme
  };
})();
