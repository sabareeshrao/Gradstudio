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

            <!-- Day 5.4: GS-005 expose course selection with a stable course id -->
            <button
                class="course-select"
                type="button"
                data-course-id="${course.id}"
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

// Day 5.5: GS-005 render one selected course into the reusable details panel
function renderCourseDetails(course) {
    selectedCourseLevel.textContent = course.level;
    selectedCourseTitle.textContent = course.title;
    selectedCourseDescription.textContent = course.description;
    selectedCourseLessons.textContent = `${course.lessons} lessons`;

    selectedCourseTopics.innerHTML = course.topics
        .map((topic) => `<li>${topic}</li>`)
        .join("");

    courseDetails.hidden = false;
}

// Day 5.5: GS-005 resolve course selection through event delegation and stable ids
courseGrid.addEventListener("click", (event) => {
    const courseButton = event.target.closest(".course-select");

    if (!courseButton) {
        return;
    }

    const selectedCourse = courseCatalog.find(
        (course) => course.id === courseButton.dataset.courseId
    );

    if (!selectedCourse) {
        return;
    }

    renderCourseDetails(selectedCourse);
});

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
