# ormadillo
Zero-config, fully customisable cross-database object-relational mapping (ORM) library

## Priorities
1. Sandboxing good testing strategies
2. Adequate documentation for basic usage (whether possible or not just yet)
3. Linting
4. Get **Objectives** to work with databases in the following order: Postgres, MySQL

## Objectives
1. Create a connection with the database
2. Test this connection
3. Create tables/schemas in the database based on the Models provided including complex data structures such as a) arrays b) relations c) enums d) embedded/objects
4. Insert document/row into database including the complex data structures above
5. Query document/row from database including the complex data structures above
6. Update document/row in database including the complex data structures above
7. Delete document/row from database including dependent objects
8. Support for common operators for INSERT, QUERY, UPDATE and DELETE such as "$in" or "$gt"