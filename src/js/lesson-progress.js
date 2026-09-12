// Day 14.1: GS-014 define browser-local progress storage without introducing a backend
const LESSON_PROGRESS_STORAGE_KEY = "gradstudio.lessonProgress.v1";

// Day 14.2: GS-014 validate stored lesson ids against the current course model
function sanitizeLessonProgress(candidateProgress) {
    const sanitizedProgress = {};

    if (!candidateProgress || typeof candidateProgress !== "object" || Array.isArray(candidateProgress)) {
        return sanitizedProgress;
    }

    courseCatalog.forEach((course) => {
        const validLessonIds = new Set(
            getCourseLessonSequence(course).map(({ lesson }) => lesson.id)
        );

        const storedLessonIds = Array.isArray(candidateProgress[course.id])
            ? candidateProgress[course.id]
            : [];

        const completedLessonIds = Array.from(
            new Set(
                storedLessonIds.filter(
                    (lessonId) => typeof lessonId === "string" && validLessonIds.has(lessonId)
                )
            )
        );

        if (completedLessonIds.length > 0) {
            sanitizedProgress[course.id] = completedLessonIds;
        }
    });

    return sanitizedProgress;
}

// Day 14.3: GS-014 load saved progress defensively when browser storage is available
function readStoredLessonProgress() {
    try {
        const storedProgress = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY);

        return storedProgress
            ? sanitizeLessonProgress(JSON.parse(storedProgress))
            : {};
    } catch {
        return {};
    }
}

let completedLessonsByCourse = readStoredLessonProgress();

// Day 14.4: GS-014 persist completion state while keeping the current session usable on storage failure
function persistLessonProgress() {
    try {
        localStorage.setItem(
            LESSON_PROGRESS_STORAGE_KEY,
            JSON.stringify(completedLessonsByCourse)
        );
    } catch {
        // Completion still works for the current page if browser storage is unavailable.
    }
}

// Day 14.5: GS-014 create reusable progress controls only when JavaScript learning state exists
const lessonProgressControl = document.createElement("div");
lessonProgressControl.className = "lesson-progress-control";

const courseProgressSummary = document.createElement("p");
courseProgressSummary.className = "course-progress-summary";
courseProgressSummary.setAttribute("aria-live", "polite");

const lessonCompleteToggle = document.createElement("button");
lessonCompleteToggle.className = "lesson-complete-toggle";
lessonCompleteToggle.type = "button";
lessonCompleteToggle.setAttribute("aria-pressed", "false");
lessonCompleteToggle.textContent = "Mark lesson complete";

lessonProgressControl.append(
    courseProgressSummary,
    lessonCompleteToggle
);

lessonContent.append(lessonProgressControl);

// Day 14.6: GS-014 derive completed lessons and expose them on the rendered outline
function getCompletedLessonSet(courseId) {
    return new Set(completedLessonsByCourse[courseId] ?? []);
}

function syncRenderedLessonCompletion(course) {
    const completedLessonIds = getCompletedLessonSet(course.id);

    selectedCourseSections
        .querySelectorAll(".course-lesson-item")
        .forEach((item) => {
            const isComplete = completedLessonIds.has(item.dataset.lessonId);

            item.classList.toggle("is-complete", isComplete);

            const button = item.querySelector(".course-lesson-select");
            const title = button
                ?.querySelector(".course-lesson-title")
                ?.textContent
                .trim();

            if (button && title) {
                button.setAttribute(
                    "aria-label",
                    isComplete ? `${title}, completed` : title
                );
            }
        });
}

// Day 14.7: GS-014 synchronize selected lesson state and course progress summary
function syncLessonProgress() {
    const context = getSelectedLessonContext();

    if (!context) {
        lessonCompleteToggle.disabled = true;
        lessonCompleteToggle.setAttribute("aria-pressed", "false");
        lessonCompleteToggle.textContent = "Mark lesson complete";
        courseProgressSummary.textContent = "";

        const course = courseCatalog.find(
            (candidate) => candidate.id === getCourseIdFromUrl()
        );

        if (course) {
            syncRenderedLessonCompletion(course);
        }

        return;
    }

    const { course, lesson } = context;
    const completedLessonIds = getCompletedLessonSet(course.id);
    const isComplete = completedLessonIds.has(lesson.id);
    const totalLessons = getCourseLessonSequence(course).length;

    lessonCompleteToggle.disabled = false;
    lessonCompleteToggle.setAttribute("aria-pressed", String(isComplete));
    lessonCompleteToggle.textContent = isComplete
        ? "Mark lesson incomplete"
        : "Mark lesson complete";

    courseProgressSummary.textContent =
        `${completedLessonIds.size} of ${totalLessons} lessons completed in ${course.title}.`;

    syncRenderedLessonCompletion(course);
}

// Day 14.8: GS-014 toggle completion in course order and keep navigation/history synchronized
function setLessonCompletion(course, lessonId, isComplete) {
    const completedLessonIds = getCompletedLessonSet(course.id);

    if (isComplete) {
        completedLessonIds.add(lessonId);
    } else {
        completedLessonIds.delete(lessonId);
    }

    const orderedCompletedLessonIds = getCourseLessonSequence(course)
        .map(({ lesson }) => lesson.id)
        .filter((candidateLessonId) => completedLessonIds.has(candidateLessonId));

    if (orderedCompletedLessonIds.length === 0) {
        delete completedLessonsByCourse[course.id];
    } else {
        completedLessonsByCourse[course.id] = orderedCompletedLessonIds;
    }

    persistLessonProgress();
}

lessonCompleteToggle.addEventListener("click", () => {
    const context = getSelectedLessonContext();

    if (!context) {
        return;
    }

    const { course, lesson } = context;
    const isComplete = getCompletedLessonSet(course.id).has(lesson.id);

    setLessonCompletion(course, lesson.id, !isComplete);
    syncLessonProgress();
});

syncLessonProgress();

window.addEventListener("popstate", syncLessonProgress);

window.addEventListener("storage", (event) => {
    if (event.key !== LESSON_PROGRESS_STORAGE_KEY) {
        return;
    }

    completedLessonsByCourse = readStoredLessonProgress();
    syncLessonProgress();
});

document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
        return;
    }

    const learningAction = event.target.closest(
        ".course-select, .course-lesson-select, #previous-lesson, #next-lesson"
    );

    if (learningAction) {
        syncLessonProgress();
    }
});
