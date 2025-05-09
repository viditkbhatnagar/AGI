# Database Seed Scripts

This directory contains scripts for seeding the MongoDB database with test data.

## How to Run

To populate the database with all test data, run:

```bash
tsx server/seedDb.ts
```

## What Gets Created

The seed script creates:

1. **Users**:
   - Admin user (admin@example.com / password)
   - Student user (peter@example.com / password)

2. **Courses**:
   - Certified Investment Associate (CIA)
   - Certified Supply Chain Professional (CSCP)
   - Introduction to Artificial Intelligence

3. **Enrollments**:
   - Peter Parker enrolled in CIA (2 modules completed)
   - Peter Parker enrolled in CSCP (1 module completed)

4. **Live Classes**:
   - Multiple upcoming live classes for each course

## Adding New Data

To add new test data, modify the `server/seeds/index.ts` file as needed.