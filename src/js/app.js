// Day 2.7: GS-002 wire the application status element
const appStatus = document.querySelector("#app-status");

// Day 3.7: GS-003 wire responsive navigation DOM elements
const navToggle = document.querySelector("#nav-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");

// Day 4.5: GS-004 locate the course catalog rendering target
const courseGrid = document.querySelector("#course-grid");

// Day 2.8: GS-002 prove JavaScript loaded successfully
appStatus.textContent = "GradStudio application loaded successfully.";

// Day 4.6: GS-004 convert one course object into card markup
function createCourseCard(course) {
    return `
        <article class="course-card">
            <p class="course-level">${course.level}</p>
            <h3>${course.title}</h3>
            <p class="course-description">${course.description}</p>
            <p class="course-lessons">${course.lessons} lessons</p>
        </article>
    `;
}

// Day 4.7: GS-004 render the course catalog from JavaScript data
function renderCourseCatalog() {
    const courseCards = courseCatalog
        .map(createCourseCard)
        .join("");

    courseGrid.innerHTML = courseCards;
}

renderCourseCatalog();

// Day 3.8: GS-003 toggle the mobile menu and accessibility state
navToggle.addEventListener("click", () => {
    const isOpen = primaryNavigation.classList.toggle("is-open");

    navToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );
});

// Day 3.9: GS-003 close mobile navigation after selecting a link
primaryNavigation.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
        primaryNavigation.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
    }
});
