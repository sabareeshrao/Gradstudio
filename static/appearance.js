/* Lesson-only device-local appearance; the application shell stays light. */
(function () {
    "use strict";
    const key = "gradstudio.lessonAppearance.v2";
    const modes = ["light", "dark", "system"];
    const root = document.documentElement;
    const media = matchMedia("(prefers-color-scheme: dark)");
    let preference = "dark";
    try { const saved = localStorage.getItem(key); if (modes.includes(saved)) preference = saved; } catch {}
    function apply() {
        const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;
        root.dataset.lessonAppearance = preference;
        root.dataset.lessonTheme = resolved;
        // CSS color-scheme propagates to embedded documents, including cross-origin
        // sandboxed frames, via prefers-color-scheme; never reload or inspect them.
        // Only the iframe inherits the lesson preference; all shell controls stay light.
        root.style.colorScheme = "light";
        document.querySelectorAll("[data-appearance-select]").forEach(select => { select.value = preference; });
    }
    function set(value) {
        if (!modes.includes(value)) return;
        preference = value;
        try { localStorage.setItem(key, value); } catch {}
        apply();
    }
    function control() {
        return '<select class="appearance-select" data-component-id="site.appearance" data-appearance-select aria-label="Lesson appearance" title="Lesson appearance">' +
            modes.map(mode => '<option value="' + mode + '"' + (preference === mode ? ' selected' : '') + '>' + mode[0].toUpperCase() + mode.slice(1) + '</option>').join('') + '</select>';
    }
    media.addEventListener("change", () => { if (preference === "system") apply(); });
    document.addEventListener("change", event => { if (event.target.matches("[data-appearance-select]")) set(event.target.value); });
    window.addEventListener("storage", event => { if (event.key === key) { preference = modes.includes(event.newValue) ? event.newValue : "dark"; apply(); } });
    window.GradStudioAppearance = Object.freeze({control, set});
    apply();
})();
