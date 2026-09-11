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

// Day 10.3: GS-010 wire the reusable selected-lesson workspace
const lessonWorkspace = document.querySelector("#lesson-workspace");
const selectedLessonTitle = document.querySelector("#selected-lesson-title");
const selectedLessonCourse = document.querySelector("#selected-lesson-course");
const selectedLessonSection = document.querySelector("#selected-lesson-section");
const selectedLessonContext = document.querySelector("#selected-lesson-context");

// Day 10.3: GS-010 keep the active course identity available to lesson selection
let activeCourseId = null;

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

// Day 9.4: GS-009 convert one lesson object into ordered lesson markup
function createCourseLesson(lesson, index) {
    return `
        <li
            class="course-lesson-item"
            data-lesson-id="${lesson.id}"
        >
            <!-- Day 10.2: GS-010 turn each lesson row into a native accessible control -->
            <button
                class="course-lesson-select"
                type="button"
                data-lesson-id="${lesson.id}"
                aria-pressed="false"
            >
                <!-- Day 9.5: GS-009 expose human-friendly lesson order beside stable lesson ids -->
                <span class="course-lesson-number">Lesson ${index + 1}</span>
                <span class="course-lesson-title">${lesson.title}</span>
            </button>
        </li>
    `;
}

// Day 7.4: GS-007 convert one course section into ordered outline markup
function createCourseSection(section, index) {
    // Day 8.2: GS-008 give each section preview a stable DOM id for aria-controls
    const previewId = `section-preview-${section.id}`;

    // Day 9.4: GS-009 render the section's lesson objects as an ordered lesson list
    const lessonItems = section.lessons
        .map(createCourseLesson)
        .join("");

    return `
        <li class="course-section" data-section-id="${section.id}">
            <!-- Day 8.2: GS-008 render each section heading as a real accessible toggle -->
            <button
                class="course-section-toggle"
                type="button"
                aria-expanded="false"
                aria-controls="${previewId}"
            >
                <span>
                    <span class="course-section-number">Section ${index + 1}</span>
                    <strong>${section.title}</strong>
                </span>
                <!-- Day 9.3: GS-009 derive section counts from actual lesson data -->
                <span class="course-section-lessons">${section.lessons.length} lessons</span>
            </button>

            <!-- Day 8.3: GS-008 keep section preview content hidden until requested -->
            <div
                id="${previewId}"
                class="course-section-preview"
                hidden
            >
                <p>${section.summary}</p>

                <!-- Day 9.5: GS-009 expose the real ordered lessons inside the expanded section -->
                <ol class="course-lesson-list">
                    ${lessonItems}
                </ol>
            </div>
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

// Day 10.4: GS-010 resolve a lesson together with the section that owns it
function findLessonInCourse(course, lessonId) {
    for (const section of course.sections) {
        const lesson = section.lessons.find(
            (candidate) => candidate.id === lessonId
        );

        if (lesson) {
            return {
                section,
                lesson
            };
        }
    }

    return null;
}

// Day 10.5: GS-010 expose selected lesson state on the rendered lesson controls
function setSelectedLessonButton(lessonId) {
    const buttons = selectedCourseSections.querySelectorAll(".course-lesson-select");

    buttons.forEach((button) => {
        const isSelected = button.dataset.lessonId === lessonId;

        button.setAttribute(
            "aria-pressed",
            String(isSelected)
        );

        button
            .closest(".course-lesson-item")
            .classList
            .toggle("is-selected", isSelected);
    });
}

// Day 10.5: GS-010 render the chosen lesson with its real course and section context
function renderLessonWorkspace(course, section, lesson) {
    selectedLessonTitle.textContent = lesson.title;
    selectedLessonCourse.textContent = course.title;
    selectedLessonSection.textContent = section.title;
    selectedLessonContext.textContent = section.summary;

    lessonWorkspace.hidden = false;
}

// Day 10.7: GS-010 clear lesson UI whenever its parent course state becomes stale
function clearLessonSelection() {
    lessonWorkspace.hidden = true;
    setSelectedLessonButton(null);
}

// Day 10.5: GS-010 centralize lesson selection before future URL or player behavior
function selectLesson(lessonId) {
    const course = courseCatalog.find(
        (candidate) => candidate.id === activeCourseId
    );

    if (!course) {
        clearLessonSelection();
        return;
    }

    const match = findLessonInCourse(
        course,
        lessonId
    );

    if (!match) {
        clearLessonSelection();
        return;
    }

    renderLessonWorkspace(
        course,
        match.section,
        match.lesson
    );

    setSelectedLessonButton(
        lessonId
    );
}

// Day 6.4: GS-006 clear stale course UI when the URL has no valid selection
function clearCourseSelection() {
    activeCourseId = null;
    courseDetails.hidden = true;

    // Day 10.7: GS-010 clear any lesson that belonged to the previous course
    clearLessonSelection();

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

    // Day 10.7: GS-010 establish the new parent course and discard stale lesson state
    activeCourseId = selectedCourse.id;

    renderCourseDetails(selectedCourse);
    clearLessonSelection();
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

// Day 8.4: GS-008 synchronize aria-expanded and hidden preview state together
function setCourseSectionExpanded(button, isExpanded) {
    const previewId = button.getAttribute("aria-controls");
    const preview = document.getElementById(previewId);

    button.setAttribute(
        "aria-expanded",
        String(isExpanded)
    );

    if (preview) {
        preview.hidden = !isExpanded;
    }
}

// Day 8.5: GS-008 expand one section at a time through outline-level event delegation
selectedCourseSections.addEventListener("click", (event) => {
    const sectionButton = event.target.closest(".course-section-toggle");

    if (!sectionButton) {
        return;
    }

    const wasExpanded = sectionButton.getAttribute("aria-expanded") === "true";
    const sectionButtons = selectedCourseSections.querySelectorAll(".course-section-toggle");

    sectionButtons.forEach((button) => {
        if (button !== sectionButton) {
            setCourseSectionExpanded(button, false);
        }
    });

    setCourseSectionExpanded(
        sectionButton,
        !wasExpanded
    );
});

// Day 10.6: GS-010 select lessons through the existing outline-level event boundary
selectedCourseSections.addEventListener("click", (event) => {
    const lessonButton = event.target.closest(".course-lesson-select");

    if (!lessonButton) {
        return;
    }

    selectLesson(
        lessonButton.dataset.lessonId
    );
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
