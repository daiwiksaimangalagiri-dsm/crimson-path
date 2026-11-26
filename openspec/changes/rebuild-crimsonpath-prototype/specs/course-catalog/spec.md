# Spec Delta

## Purpose

Provides the IU Bloomington undergraduate course list as the only source of classes, with lookup, search and code detection that the quiz, the AI and the rule checks all share.

## ADDED Requirements

### Requirement: Catalog is the only source of classes
The system SHALL load the IU Bloomington undergraduate course list (levels 100–499: the original catalog paste plus courses from IU's public course API) with code, title and credits for every course, plus terms offered where present, and SHALL never show or recommend a class that is not in it.

#### Scenario: Catalog loaded
- **WHEN** the roadmap screen opens
- **THEN** it lists each data source with its count, or "not loaded" for any opportunity file that is missing

#### Scenario: Catalog shown as a source
- **WHEN** the roadmap screen opens
- **THEN** the sources panel shows the catalog's course count and that it includes credits and GenEd areas

### Requirement: Courses carry their GenEd areas
Each course SHALL list the IU Bloomington GenEd areas it is approved for (A&H, S&H, N&M, World Cultures, World Languages, English Composition, Mathematical Modeling), from IU's approved GenEd list, and the AI's course search SHALL be able to filter by area.

#### Scenario: Search by area
- **WHEN** the AI searches "literature" with area A&H
- **THEN** every result is approved for A&H

### Requirement: Code lookup accepts loose formats
The system SHALL resolve a course code written as "INFO-I 101", "INFO I101", "info i 101", "INFO 101" or "I101", and SHALL report one of: found, similar (with up to 8 candidates), not in catalog, or not a code.

#### Scenario: Exact code
- **WHEN** looking up "csci c200"
- **THEN** the result is found, with CSCI-C 200 and its title and credits

#### Scenario: Missing letter
- **WHEN** looking up "INFO 101", which matches INFO-I 101 and the honors INFO-H 101
- **THEN** the result is similar, listing both

#### Scenario: Code not in catalog
- **WHEN** looking up "BUS-M 999"
- **THEN** the result is not in catalog

### Requirement: Keyword search ranks real courses
The system SHALL search course codes and titles by keyword, ignore filler words ("intro", "course", "the"), optionally filter by department and highest level, and SHALL return at most 20 courses, ranked by match strength with lower levels first on ties.

#### Scenario: Search with department filter
- **WHEN** searching "statistics" in department STAT
- **THEN** every result is a STAT course whose code or title contains "statistics"

### Requirement: Course codes are detected in pasted text
The system SHALL find every course code pattern in counselor notes, look each one up, and report each distinct code once with its lookup result.

#### Scenario: Notes name two classes, one fake
- **WHEN** the notes contain "Take BUS-K 201" and "BUS-M 999"
- **THEN** detection reports BUS-K 201 as found and BUS-M 999 as not in catalog
