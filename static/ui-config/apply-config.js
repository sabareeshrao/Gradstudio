(function () {
    "use strict";

    const config = window.__GRADSTUDIO_UI_CONFIG__;
    if (!config || config.schemaVersion !== 1) {
        console.warn("GradStudio UI configuration is missing or unsupported; using canonical HTML defaults.");
        return;
    }

    applyTheme(config.theme);
    applyBrand(config.site.brand);
    applyNavigation(config.navigation.items);
    applyHero(config.home.hero);
    applyHomepageBlocks(config.home.blocks);
    applyFooter(config.footer);
    applyFeatureFlags(config.site.featureFlags);

    window.__GRADSTUDIO_UI_CONFIG_APPLIED__ = config.schemaVersion;
    document.dispatchEvent(new CustomEvent("gradstudio:ui-config-applied", { detail: { schemaVersion: config.schemaVersion } }));

    function applyTheme(theme) {
        const root = document.documentElement.style;
        const variables = {
            "--page-bg": theme.colors.pageBg,
            "--panel-bg": theme.colors.panelBg,
            "--ink": theme.colors.ink,
            "--ink-soft": theme.colors.inkSoft,
            "--muted": theme.colors.muted,
            "--line": theme.colors.line,
            "--line-strong": theme.colors.lineStrong,
            "--accent": theme.colors.accent,
            "--accent-soft": theme.colors.accentSoft,
            "--success": theme.colors.success,
            "--warning": theme.colors.warning,
            "--ui-font": theme.typography.uiFont,
            "--display-font": theme.typography.displayFont,
            "--base-font-size": `${theme.typography.baseSizePx}px`,
            "--space-xs": `${theme.spacing.xs}px`,
            "--space-sm": `${theme.spacing.sm}px`,
            "--space-md": `${theme.spacing.md}px`,
            "--space-lg": `${theme.spacing.lg}px`,
            "--space-xl": `${theme.spacing.xl}px`,
            "--space-2xl": `${theme.spacing["2xl"]}px`,
            "--space-3xl": `${theme.spacing["3xl"]}px`,
            "--radius-control": `${theme.radii.control}px`,
            "--radius": `${theme.radii.card}px`,
            "--radius-pill": `${theme.radii.pill}px`,
            "--shadow": theme.shadows.panel,
            "--shadow-card": theme.shadows.card,
            "--motion-fast": `${theme.motion.fastMs}ms`,
            "--motion-normal": `${theme.motion.normalMs}ms`,
            "--motion-easing": theme.motion.easing,
            "--catalog-sidebar-width": `${theme.layout.catalogSidebarWidthPx}px`,
            "--catalog-gap": `${theme.layout.catalogGapPx}px`,
            "--course-card-min-width": `${theme.layout.courseCardMinWidthPx}px`,
            "--course-grid-gap": `${theme.layout.courseGridGapPx}px`,
            "--header-min-height": `${theme.layout.headerMinHeightPx}px`
        };
        Object.entries(variables).forEach(([name, value]) => root.setProperty(name, value));
    }

    function applyBrand(brand) {
        const brandLink = document.querySelector("[data-component-id='site.brand']");
        if (!brandLink) return;
        const isCompatibilityPreview = window.location.pathname.endsWith("/gradstudio-learn-demo.html");
        if (!isCompatibilityPreview) brandLink.setAttribute("href", brand.homeHref);
        brandLink.setAttribute("aria-label", `${brand.name} home`);
        const image = brandLink.querySelector("img");
        if (image) {
            image.setAttribute("src", brand.logoSrc);
            image.setAttribute("alt", brand.logoAlt);
        }
        const name = brandLink.querySelector(".brand-name");
        if (name) {
            const leading = brand.name.startsWith("Grad") ? "Grad" : "";
            const trailing = leading ? brand.name.slice(leading.length) : brand.name;
            name.replaceChildren();
            if (leading) {
                const accent = document.createElement("span");
                accent.className = "brand-name-grad";
                accent.textContent = leading;
                name.append(accent);
            }
            name.append(document.createTextNode(trailing));
        }
    }

    function applyNavigation(items) {
        const navigation = document.querySelector("[data-component-id='site.primary-nav']");
        if (!navigation) return;
        const fragment = document.createDocumentFragment();
        items.slice().sort(byOrder).filter((item) => item.visible).forEach((item) => {
            const node = document.createElement(item.kind === "menu-button" ? "button" : "a");
            node.textContent = item.label;
            node.dataset.componentInstance = item.componentId;
            node.dataset[`nav${capitalize(item.route)}`] = "";
            if (item.kind === "menu-button") {
                node.className = "nav-link";
                node.type = "button";
                node.dataset.courseMenuTrigger = "";
                node.setAttribute("aria-expanded", "false");
                node.setAttribute("aria-controls", "courseMegaMenu");
            } else {
                node.href = item.href;
            }
            fragment.append(node);
        });
        navigation.replaceChildren(fragment);
    }

    function applyHero(hero) {
        setText("#heroTitle", hero.title);
        setText(".hero-heading", hero.heading);
        setText(".hero-subheading", hero.subheading);
        applyAction(".hero-actions .primary-action", hero.primaryAction);
        applyAction(".hero-actions .secondary-action", hero.secondaryAction);
        const visual = document.querySelector("[data-component-id='home.hero-feature']");
        if (visual) visual.setAttribute("aria-label", hero.featureAlt);
    }

    function applyHomepageBlocks(blocks) {
        const shell = document.querySelector("[data-component-id='site.shell']");
        const anchor = document.getElementById("courseDetail");
        if (!shell || !anchor) return;
        blocks.slice().sort(byOrder).forEach((block) => {
            const node = document.querySelector(`[data-component-id="${cssEscape(block.componentId)}"]`);
            if (!node) return;
            node.hidden = !block.visible;
            shell.insertBefore(node, anchor);
        });
    }

    function applyFooter(footer) {
        setText("[data-ui-footer-description]", footer.description);
        setText("[data-ui-footer-copyright]", footer.copyright);
        const navigation = document.querySelector("[data-ui-footer-links]");
        if (!navigation) return;
        const fragment = document.createDocumentFragment();
        footer.links.slice().sort(byOrder).filter((item) => item.visible).forEach((item) => {
            const link = document.createElement("a");
            link.href = item.href;
            link.textContent = item.label;
            link.dataset.componentInstance = item.componentId;
            if (item.route === "about" || item.route === "contact") link.dataset[`nav${capitalize(item.route)}`] = "";
            else link.dataset.infoPage = item.route;
            fragment.append(link);
        });
        navigation.replaceChildren(fragment);
    }

    function applyFeatureFlags(flags) {
        const root = document.documentElement;
        Object.entries(flags).forEach(([name, enabled]) => {
            root.dataset[`feature${capitalize(name)}`] = String(enabled);
        });
        toggle("[data-component-id='site.course-menu']", flags.courseMenu);
        toggle("[data-component-id='home.hero-feature']", flags.heroFeature);
        toggle("[data-component-id='home.layout-blocks']", flags.homepageLayoutBlocks);
    }

    function applyAction(selector, action) {
        const node = document.querySelector(selector);
        if (!node) return;
        node.textContent = action.label;
        node.setAttribute("href", action.href);
        if (action.authMode) node.dataset.authOpen = action.authMode;
    }

    function setText(selector, value) {
        const node = document.querySelector(selector);
        if (node) node.textContent = value;
    }

    function toggle(selector, enabled) {
        const node = document.querySelector(selector);
        if (node) node.hidden = !enabled;
    }

    function byOrder(left, right) {
        return left.order - right.order || left.componentId.localeCompare(right.componentId);
    }

    function capitalize(value) {
        return String(value).charAt(0).toUpperCase() + String(value).slice(1);
    }

    function cssEscape(value) {
        return window.CSS && typeof window.CSS.escape === "function" ? window.CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
    }
})();
