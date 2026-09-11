// Day 4.3: GS-004 define the first GradStudio course catalog
const courseCatalog = [
    {
        id: "java-foundations",
        title: "Java Foundations",
        description: "Learn core Java concepts through practical examples.",
        level: "Beginner",
        lessons: 12,

        // Day 5.1: GS-005 extend course data with detail topics
        topics: [
            "Java syntax and variables",
            "Object-oriented programming",
            "Collections and exceptions"
        ],

        // Day 7.1: GS-007 model the course as ordered sections with lesson counts
        sections: [
            {
                id: "language-basics",
                title: "Java language basics",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Start with variables, operators, control flow, methods, and the Java execution model.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "java-program-structure", title: "Java program structure and execution" },
                    { id: "variables-data-types", title: "Variables and data types" },
                    { id: "operators-control-flow", title: "Operators and control flow" },
                    { id: "methods-parameters", title: "Methods and parameters" }
                ]
            },
            {
                id: "object-oriented-java",
                title: "Object-oriented Java",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Model application behavior with classes, objects, encapsulation, inheritance, and interfaces.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "classes-objects", title: "Classes and objects" },
                    { id: "constructors-encapsulation", title: "Constructors and encapsulation" },
                    { id: "inheritance-polymorphism", title: "Inheritance and polymorphism" },
                    { id: "interfaces-abstraction", title: "Interfaces and abstraction" }
                ]
            },
            {
                id: "collections-exceptions",
                title: "Collections and exceptions",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Work with common collections and handle recoverable failures using Java exceptions.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "list-set-map", title: "List, Set, and Map" },
                    { id: "generics-iteration", title: "Generics and iteration" },
                    { id: "checked-unchecked-exceptions", title: "Checked and unchecked exceptions" },
                    { id: "custom-exceptions", title: "Creating and handling custom exceptions" }
                ]
            }
        ]
    },
    {
        id: "spring-boot-api",
        title: "Spring Boot APIs",
        description: "Build REST APIs step by step with Spring Boot.",
        level: "Intermediate",
        lessons: 18,

        // Day 5.1: GS-005 extend course data with detail topics
        topics: [
            "Spring Boot application structure",
            "REST controllers and services",
            "Request and response handling"
        ],

        // Day 7.1: GS-007 model the course as ordered sections with lesson counts
        sections: [
            {
                id: "spring-boot-setup",
                title: "Spring Boot application setup",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Create a Spring Boot project, understand its structure, and configure the application for local development.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "generate-project", title: "Generate a Spring Boot project" },
                    { id: "application-entry-point", title: "Understand the application entry point" },
                    { id: "project-structure", title: "Explore the project structure" },
                    { id: "application-properties", title: "Configure application properties" },
                    { id: "dependency-injection", title: "Use dependency injection" },
                    { id: "profiles-local-run", title: "Run locally with application profiles" }
                ]
            },
            {
                id: "rest-api-layer",
                title: "REST controllers and HTTP",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Expose HTTP endpoints with controllers and practice request, response, and status-code handling.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "rest-controller", title: "Create a REST controller" },
                    { id: "request-mappings", title: "Map HTTP methods and routes" },
                    { id: "path-query-parameters", title: "Read path and query parameters" },
                    { id: "request-bodies", title: "Accept request bodies" },
                    { id: "response-entity-status", title: "Return responses and status codes" },
                    { id: "http-exception-handling", title: "Handle API errors consistently" }
                ]
            },
            {
                id: "service-data-flow",
                title: "Service and data flow",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Move business logic into services and follow data as it travels through the application layers.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "service-layer", title: "Introduce the service layer" },
                    { id: "controller-service-flow", title: "Trace controller-to-service flow" },
                    { id: "dto-boundaries", title: "Use DTOs at API boundaries" },
                    { id: "validation-flow", title: "Validate incoming data" },
                    { id: "error-propagation", title: "Propagate domain errors to HTTP" },
                    { id: "api-layer-review", title: "Review a layered API request flow" }
                ]
            }
        ]
    },
    {
        id: "sql-fundamentals",
        title: "SQL Fundamentals",
        description: "Learn how applications store and query relational data.",
        level: "Beginner",
        lessons: 10,

        // Day 5.1: GS-005 extend course data with detail topics
        topics: [
            "Tables and relational data",
            "SELECT and filtering",
            "Joins and aggregation"
        ],

        // Day 7.1: GS-007 model the course as ordered sections with lesson counts
        sections: [
            {
                id: "relational-basics",
                title: "Relational data basics",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Understand tables, rows, columns, keys, and the relationships that connect application data.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "tables-rows-columns", title: "Tables, rows, and columns" },
                    { id: "primary-foreign-keys", title: "Primary and foreign keys" },
                    { id: "data-types-constraints", title: "Data types and constraints" }
                ]
            },
            {
                id: "queries-filtering",
                title: "Queries and filtering",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Retrieve the data you need with SELECT, WHERE, ordering, and practical filtering conditions.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "select-basics", title: "Write basic SELECT queries" },
                    { id: "where-order-by", title: "Filter and order query results" },
                    { id: "null-functions", title: "Handle NULL values and common functions" }
                ]
            },
            {
                id: "joins-aggregation",
                title: "Joins and aggregation",
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Combine related tables and summarize data with joins, grouping, and aggregate functions.",
                // Day 9.1: GS-009 replace duplicated section counts with actual lesson objects
                lessons: [
                    // Day 9.2: GS-009 give every lesson a stable id and title
                    { id: "inner-joins", title: "Combine tables with INNER JOIN" },
                    { id: "outer-joins", title: "Use outer joins when data is missing" },
                    { id: "group-by-aggregates", title: "Group rows and calculate aggregates" },
                    { id: "having-subqueries", title: "Filter groups and introduce subqueries" }
                ]
            }
        ]
    }
];
