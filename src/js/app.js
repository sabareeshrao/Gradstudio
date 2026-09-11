// Day 2.6: GS-002 wire the application status element
const appStatus = document.querySelector("#app-status");

// Day 3.6: GS-003 wire responsive navigation DOM elements
const navToggle = document.querySelector("#nav-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");

// Day 2.7: GS-002 prove JavaScript loaded successfully
appStatus.textContent = "GradStudio application loaded successfully.";

// Day 3.7: GS-003 toggle the mobile menu and accessibility state
navToggle.addEventListener("click", () => {
    const isOpen = primaryNavigation.classList.toggle("is-open");

    navToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );
});

// Day 3.8: GS-003 close mobile navigation after selecting a link
primaryNavigation.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
        primaryNavigation.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
    }
});
