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
                lessons: 4,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Start with variables, operators, control flow, methods, and the Java execution model."
            },
            {
                id: "object-oriented-java",
                title: "Object-oriented Java",
                lessons: 4,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Model application behavior with classes, objects, encapsulation, inheritance, and interfaces."
            },
            {
                id: "collections-exceptions",
                title: "Collections and exceptions",
                lessons: 4,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Work with common collections and handle recoverable failures using Java exceptions."
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
                lessons: 6,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Create a Spring Boot project, understand its structure, and configure the application for local development."
            },
            {
                id: "rest-api-layer",
                title: "REST controllers and HTTP",
                lessons: 6,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Expose HTTP endpoints with controllers and practice request, response, and status-code handling."
            },
            {
                id: "service-data-flow",
                title: "Service and data flow",
                lessons: 6,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Move business logic into services and follow data as it travels through the application layers."
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
                lessons: 3,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Understand tables, rows, columns, keys, and the relationships that connect application data."
            },
            {
                id: "queries-filtering",
                title: "Queries and filtering",
                lessons: 3,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Retrieve the data you need with SELECT, WHERE, ordering, and practical filtering conditions."
            },
            {
                id: "joins-aggregation",
                title: "Joins and aggregation",
                lessons: 4,
                // Day 8.1: GS-008 add a concise preview for each course section
                summary: "Combine related tables and summarize data with joins, grouping, and aggregate functions."
            }
        ]
    }
];
