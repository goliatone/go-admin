import { i as f } from "../../chunks/modal-ClEsOn-S.js";
import { i as C, n as E, r as u, s as y, t as v } from "../../chunks/channel-validation-BBf_63LY.js";
function w(l, e) {
  if (Array.from(l.options).some((o) => o.value === e)) return;
  const n = document.createElement("option");
  n.value = e, n.textContent = e.charAt(0).toUpperCase() + e.slice(1), l.appendChild(n);
}
function A(l = document) {
  const e = l.querySelector("[data-content-types-channel-wrapper]");
  if (!e || e.dataset.channelInit === "true") return;
  const n = e.querySelector("[data-content-types-channel]"), o = e.querySelector("[data-content-types-channel-reset]"), p = e.querySelector("[data-content-types-channel-add]"), i = document.querySelector("[data-content-types-empty-reset-channel]");
  if (!n || !o) return;
  e.dataset.channelInit = "true";
  const r = u(e.getAttribute("data-default-channel")), s = (a) => u(a, r), c = (a) => {
    const t = new URL(window.location.href), h = s(a);
    h === r ? t.searchParams.delete("channel") : t.searchParams.set("channel", h), window.location.href = t.toString();
  }, m = (a) => {
    const t = a === r;
    o.classList.toggle("hidden", t), i?.classList.toggle("hidden", t);
  }, d = s(new URL(window.location.href).searchParams.get("channel") || e.getAttribute("data-active-channel"));
  n.value = d, m(d), n.addEventListener("change", () => c(s(n.value))), o.addEventListener("click", () => c(r)), i?.addEventListener("click", () => c(r)), p?.addEventListener("click", () => {
    new f({
      title: "Add Channel",
      label: "Channel name",
      placeholder: "e.g. staging",
      confirmLabel: "Add",
      helpText: v,
      inputClass: y(),
      onConfirm: (a) => {
        const t = C(a);
        if (!t.ok) return t.error;
        w(n, t.value), n.value = t.value, c(t.value);
      }
    }).show();
  });
}
export {
  v as CHANNEL_HELP_TEXT,
  A as initContentTypeChannelSwitcher,
  E as normalizeChannelName,
  C as validateChannelName
};

//# sourceMappingURL=channel-switcher.js.map