// Day 13.2: GS-013 map stable lesson ids to lesson-specific overview content
const lessonOverviewCatalog = {
    "java-program-structure": "See how source code, the compiler, bytecode, and the JVM work together to run a Java program.",
    "variables-data-types": "Learn how Java stores values with primitive and reference types, and how type choices affect program behavior.",
    "operators-control-flow": "Use operators, conditions, and loops to express decisions and repeated work in Java programs.",
    "methods-parameters": "Organize reusable behavior with methods, parameters, return values, and clear method boundaries.",
    "classes-objects": "Model real application concepts with classes as definitions and objects as runtime instances.",
    "constructors-encapsulation": "Initialize valid objects with constructors and protect internal state through encapsulation.",
    "inheritance-polymorphism": "Reuse and specialize behavior with inheritance while using polymorphism to program against shared contracts.",
    "interfaces-abstraction": "Define capabilities with interfaces and hide unnecessary implementation details through abstraction.",
    "list-set-map": "Choose between List, Set, and Map based on ordering, uniqueness, lookup, and application access patterns.",
    "generics-iteration": "Use generics for type-safe collections and iterate through data with common Java iteration techniques.",
    "checked-unchecked-exceptions": "Distinguish checked and unchecked exceptions and decide where failures should be handled or propagated.",
    "custom-exceptions": "Represent domain-specific failures with custom exceptions and handle them at appropriate application boundaries.",
    "generate-project": "Create a Spring Boot project with the dependencies and structure needed for a small web application.",
    "application-entry-point": "Understand how the Spring Boot entry point starts the application context and launches the embedded server.",
    "project-structure": "Read a Spring Boot project layout and identify where application, configuration, and feature code belongs.",
    "application-properties": "Configure application behavior with properties while keeping environment-specific values outside source logic.",
    "dependency-injection": "Let Spring provide collaborating objects so application components depend on clear contracts instead of manual construction.",
    "profiles-local-run": "Use profiles and local configuration to run the same application safely across different environments.",
    "rest-controller": "Expose application behavior over HTTP with a REST controller and a small, focused endpoint.",
    "request-mappings": "Map HTTP verbs and routes to controller methods so API behavior matches the intent of each request.",
    "path-query-parameters": "Read path and query parameters and use them to identify resources or refine a request.",
    "request-bodies": "Accept structured request bodies and map incoming JSON into Java objects at the API boundary.",
    "response-entity-status": "Return response bodies and HTTP status codes that accurately communicate API outcomes.",
    "http-exception-handling": "Translate application failures into consistent HTTP error responses without leaking internal details.",
    "service-layer": "Move business rules out of controllers into services so HTTP concerns and domain behavior stay separated.",
    "controller-service-flow": "Trace a request from controller to service and back to understand responsibility across application layers.",
    "dto-boundaries": "Use DTOs to control the data that crosses API boundaries without exposing persistence or domain internals.",
    "validation-flow": "Validate incoming data early and keep invalid requests from reaching deeper application logic.",
    "error-propagation": "Carry domain failures through the service boundary and convert them into meaningful API responses.",
    "api-layer-review": "Review the complete layered request flow and identify where routing, validation, business logic, and response mapping belong.",
    "tables-rows-columns": "Understand how relational databases organize information into tables made of rows and typed columns.",
    "primary-foreign-keys": "Use primary and foreign keys to identify records and connect related data across tables.",
    "data-types-constraints": "Choose SQL data types and constraints that protect data quality before application code reads the data.",
    "select-basics": "Retrieve specific columns and rows with SELECT and build a reliable foundation for reading relational data.",
    "where-order-by": "Filter result sets with WHERE and present them predictably with ORDER BY.",
    "null-functions": "Handle NULL values deliberately and use common SQL functions to transform values in query results.",
    "inner-joins": "Combine matching rows from related tables with INNER JOIN using clear key relationships.",
    "outer-joins": "Use outer joins when related data may be missing but the primary row still needs to appear.",
    "group-by-aggregates": "Summarize many rows with GROUP BY and aggregate functions such as COUNT, SUM, and AVG.",
    "having-subqueries": "Filter grouped results with HAVING and use subqueries when a query depends on another result set."
};

// Day 13.3: GS-013 wire reusable lesson content targets
const lessonContent = document.querySelector("#lesson-content");
const selectedLessonOverview = document.querySelector("#selected-lesson-overview");
const selectedLessonObjectives = document.querySelector("#selected-lesson-objectives");

// Day 13.4: GS-013 resolve the current lesson from existing course and URL state
function getSelectedLessonContext() {
    const courseId = getCourseIdFromUrl();
    const lessonId = getLessonIdFromUrl();

    if (!courseId || !lessonId) {
        return null;
    }

    const course = courseCatalog.find(
        (candidate) => candidate.id === courseId
    );

    if (!course) {
        return null;
    }

    const match = findLessonInCourse(
        course,
        lessonId
    );

    if (!match) {
        return null;
    }

    return {
        course,
        section: match.section,
        lesson: match.lesson
    };
}

// Day 13.5: GS-013 derive practical objectives from the selected lesson context
function getLessonObjectives(course, section, lesson) {
    return [
        `Explain the core idea behind ${lesson.title} in your own words.`,
        `Relate ${lesson.title} to the ${section.title} section.`,
        `Identify where this concept appears in practical ${course.title} work.`
    ];
}

// Day 13.6: GS-013 render or clear lesson-specific learning content
function syncLessonContent() {
    const context = getSelectedLessonContext();

    if (!context) {
        lessonContent.hidden = true;
        selectedLessonOverview.textContent = "";
        selectedLessonObjectives.replaceChildren();
        return;
    }

    const {
        course,
        section,
        lesson
    } = context;

    const overview = lessonOverviewCatalog[lesson.id];

    if (!overview) {
        lessonContent.hidden = true;
        selectedLessonOverview.textContent = "";
        selectedLessonObjectives.replaceChildren();
        return;
    }

    selectedLessonOverview.textContent = overview;

    const objectiveItems = getLessonObjectives(
        course,
        section,
        lesson
    ).map((objective) => {
        const item = document.createElement("li");
        item.textContent = objective;
        return item;
    });

    selectedLessonObjectives.replaceChildren(
        ...objectiveItems
    );

    lessonContent.hidden = false;
}

// Day 13.7: GS-013 keep lesson content synchronized with existing user navigation
syncLessonContent();

window.addEventListener("popstate", syncLessonContent);

document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
        return;
    }

    const learningAction = event.target.closest(
        ".course-select, .course-lesson-select, #previous-lesson, #next-lesson"
    );

    if (!learningAction) {
        return;
    }

    syncLessonContent();
});
