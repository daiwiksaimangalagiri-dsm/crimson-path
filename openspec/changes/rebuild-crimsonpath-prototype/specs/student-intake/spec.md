# Spec Delta

## Purpose

Collects who the student is (year, major, interests, goals, load, learning style, comfort with math and coding, outside commitments) and which classes they have already taken, so every roadmap is tailored to them.

## ADDED Requirements

### Requirement: Intake quiz asks nine questions in order
The system SHALL show the intake quiz one question at a time, in this order: year, major and optional minor, career interests (up to 3), goal after graduation, credit hours per semester, learning style (up to 2), comfort with math and coding, weekly hours for outside commitments, and an optional free-text note.

#### Scenario: Progress through the quiz
- **WHEN** a new student opens the app
- **THEN** the system shows question 1 of 9 with a progress indicator, and a Back control from question 2 onward

#### Scenario: Single-choice answer advances
- **WHEN** the student picks an option on a single-choice question
- **THEN** the system records it and moves to the next question

### Requirement: Quiz validates each answer before moving on
The system SHALL block moving forward until a required question is answered, and SHALL say what is missing.

#### Scenario: Required answer missing
- **WHEN** the student presses Next on a multi-choice question with nothing picked
- **THEN** the system stays on the question and shows "Pick at least one."

#### Scenario: Major left blank
- **WHEN** the student presses Next with the Major field empty
- **THEN** the system shows "Enter your major."

### Requirement: Multi-choice questions enforce their limit
The system SHALL refuse a pick beyond a question's limit and tell the student the limit.

#### Scenario: Fourth interest picked
- **WHEN** the student has 3 career interests picked and picks a fourth
- **THEN** the fourth is not added and the system shows "Pick up to 3."

### Requirement: Student records classes already taken
After the quiz, the system SHALL let the student add classes they have taken or are taking, by searching the catalog by code or title or by pasting a list of codes, and SHALL let them skip the step.

#### Scenario: Search and add
- **WHEN** the student types "intro to informatics" and picks INFO-I 101 from the suggestions
- **THEN** INFO-I 101 appears in the taken list with its title, and the running count and credit total update

#### Scenario: Paste a list with an unknown code
- **WHEN** the student pastes "INFO-I 101, ABCD-X 999"
- **THEN** INFO-I 101 is added as a catalog class and ABCD-X 999 is kept as a note marked "not in the catalog"

#### Scenario: Pasted text has no codes
- **WHEN** the pasted text contains no course codes
- **THEN** the system shows "No course codes found. Use the format DEPT-L 123, like INFO-I 101."

#### Scenario: Skip the step
- **WHEN** the student chooses "I haven't taken any yet"
- **THEN** the taken list is emptied and the system opens the roadmap screen

### Requirement: Profile persists in the browser
The system SHALL save the profile and taken classes in the student's browser and SHALL resume where the student left off on the next visit. The student SHALL be able to retake the quiz and edit taken classes from the roadmap screen.

#### Scenario: Returning student
- **WHEN** a student who finished both steps reopens the app
- **THEN** the system opens the roadmap screen with their profile shown

#### Scenario: Saved profile is unreadable
- **WHEN** the saved profile is missing required fields or fails to parse
- **THEN** the system starts the quiz from question 1
