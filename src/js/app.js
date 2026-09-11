// Day 2.7: GS-002 wire the application status element
const appStatus = document.querySelector("#app-status");

// Day 3.7: GS-003 wire responsive navigation DOM elements
const navToggle = document.querySelector("#nav-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");

// Day 4.5: GS-004 locate the course catalog rendering target
const courseGrid = document.querySelector("#course-grid");

// Day 5.3: GS-005 wire the selected-course details elements
const courseDetails = document.querySelector("#course-details");
const selectedCourseLevel = document.querySelector("#selected-course-level");
const selectedCourseTitle = document.querySelector("#selected-course-title");
const selectedCourseDescription = document.querySelector("#selected-course-description");
const selectedCourseLessons = document.querySelector("#selected-course-lessons");
const selectedCourseTopics = document.querySelector("#selected-course-topics");

// Day 7.3: GS-007 wire the selected-course section outline element
const selectedCourseSections = document.querySelector("#selected-course-sections");

// Day 2.8: GS-002 prove JavaScript loaded successfully
appStatus.textContent = "GradStudio application loaded successfully.";

// Day 6.1: GS-006 read the selected course id from the URL
function getCourseIdFromUrl() {
    const parameters = new URLSearchParams(window.location.search);

    return parameters.get("course");
}

// Day 6.2: GS-006 store course selection in browser history
function updateCourseUrl(courseId) {
    if (getCourseIdFromUrl() === courseId) {
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("course", courseId);

    history.pushState(
        { courseId },
        "",
        url
    );
}

// Day 4.6: GS-004 convert one course object into card markup
function createCourseCard(course) {
    return `
        <article class="course-card">
            <p class="course-level">${course.level}</p>
            <h3>${course.title}</h3>
            <p class="course-description">${course.description}</p>
            <p class="course-lessons">${course.lessons} lessons</p>

            <!-- Day 5.4: GS-005 expose course selection with a stable course id -->
            <button
                class="course-select"
                type="button"
                data-course-id="${course.id}"
                aria-pressed="false"
            >
                View course
            </button>
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

// Day 7.4: GS-007 convert one course section into ordered outline markup
function createCourseSection(section, index) {
    return `
        <li class="course-section" data-section-id="${section.id}">
            <div>
                <span class="course-section-number">Section ${index + 1}</span>
                <strong>${section.title}</strong>
            </div>
            <span class="course-section-lessons">${section.lessons} lessons</span>
        </li>
    `;
}

// Day 5.5: GS-005 render one selected course into the reusable details panel
function renderCourseDetails(course) {
    selectedCourseLevel.textContent = course.level;
    selectedCourseTitle.textContent = course.title;
    selectedCourseDescription.textContent = course.description;
    selectedCourseLessons.textContent = `${course.lessons} lessons`;

    selectedCourseTopics.innerHTML = course.topics
        .map((topic) => `<li>${topic}</li>`)
        .join("");

    // Day 7.5: GS-007 render ordered sections for the selected course
    selectedCourseSections.innerHTML = course.sections
        .map(createCourseSection)
        .join("");

    courseDetails.hidden = false;
}

// Day 6.3: GS-006 expose the current course selection on every card
function setSelectedCourseCard(courseId) {
    const buttons = courseGrid.querySelectorAll(".course-select");

    buttons.forEach((button) => {
        const isSelected = button.dataset.courseId === courseId;

        button.setAttribute(
            "aria-pressed",
            String(isSelected)
        );

        button
            .closest(".course-card")
            .classList
            .toggle("is-selected", isSelected);
    });
}

// Day 6.4: GS-006 clear stale course UI when the URL has no valid selection
function clearCourseSelection() {
    courseDetails.hidden = true;
    setSelectedCourseCard(null);
}

// Day 6.5: GS-006 centralize course selection for clicks, refreshes, and history
function selectCourse(courseId, updateUrl = true) {
    const selectedCourse = courseCatalog.find(
        (course) => course.id === courseId
    );

    if (!selectedCourse) {
        clearCourseSelection();
        return;
    }

    renderCourseDetails(selectedCourse);
    setSelectedCourseCard(courseId);

    if (updateUrl) {
        updateCourseUrl(courseId);
    }
}

// Day 5.5: GS-005 resolve course selection through event delegation and stable ids
courseGrid.addEventListener("click", (event) => {
    const courseButton = event.target.closest(".course-select");

    if (!courseButton) {
        return;
    }

    // Day 6.6: GS-006 route user clicks through the centralized selection flow
    selectCourse(courseButton.dataset.courseId);
});

// Day 6.7: GS-006 restore a shared or refreshed course selection from the URL
function restoreCourseFromUrl() {
    const courseId = getCourseIdFromUrl();

    if (!courseId) {
        clearCourseSelection();
        return;
    }

    selectCourse(courseId, false);
}

restoreCourseFromUrl();

// Day 6.8: GS-006 synchronize details with browser Back and Forward navigation
window.addEventListener(
    "popstate",
    restoreCourseFromUrl
);

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
