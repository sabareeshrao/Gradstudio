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
            { id: "language-basics", title: "Java language basics", lessons: 4 },
            { id: "object-oriented-java", title: "Object-oriented Java", lessons: 4 },
            { id: "collections-exceptions", title: "Collections and exceptions", lessons: 4 }
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
            { id: "spring-boot-setup", title: "Spring Boot application setup", lessons: 6 },
            { id: "rest-api-layer", title: "REST controllers and HTTP", lessons: 6 },
            { id: "service-data-flow", title: "Service and data flow", lessons: 6 }
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
            { id: "relational-basics", title: "Relational data basics", lessons: 3 },
            { id: "queries-filtering", title: "Queries and filtering", lessons: 3 },
            { id: "joins-aggregation", title: "Joins and aggregation", lessons: 4 }
        ]
    }
];
