const appStatus = document.querySelector("#app-status");
const navToggle = document.querySelector("#nav-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");

appStatus.textContent = "GradStudio application loaded successfully.";

navToggle.addEventListener("click", () => {
    const isOpen = primaryNavigation.classList.toggle("is-open");

    navToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );
});

primaryNavigation.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
        primaryNavigation.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
    }
});
