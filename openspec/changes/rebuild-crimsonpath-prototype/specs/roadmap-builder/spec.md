# Spec Delta

## Purpose

Turns counselor notes or the student's own interests, plus their profile and taken classes, into a semester-by-semester roadmap where every class is checked against the catalog, and shows that roadmap.

## ADDED Requirements

### Requirement: Two ways to start a roadmap
The system SHALL let the student build a roadmap from counselor notes or from a description of their interests, and SHALL offer a sample for each.

#### Scenario: Interests mode suggestions
- **WHEN** the student switches to My interests
- **THEN** the system offers one-tap starters from their quiz interests and major, excluding "Not sure yet"

#### Scenario: Empty input
- **WHEN** the student presses Build my roadmap with an empty text box
- **THEN** no request is sent and the text box is focused

### Requirement: Roadmap content comes from the AI using catalog tools
The system SHALL ask the AI for a roadmap with: a one-sentence summary of how it was tailored, the counselor's main suggestions (or the interest themes heard), semesters of classes each with a deadline, a one-line reason and, for suggested classes, a one-line fit to the student, and a list of things to ask the advisor. The AI SHALL find classes only through the catalog lookup and search.

#### Scenario: Progress while building
- **WHEN** a build is running
- **THEN** the system says it is reading the input and checking classes against the catalog, and the Build button is disabled

### Requirement: Every returned class is checked against the catalog
Before showing a roadmap, the system SHALL replace each class's code, title and credits with the catalog's, and SHALL move any class not found in the catalog to Ask your advisor with "Couldn't find this course in the catalog, so it was removed."

#### Scenario: Invented course
- **WHEN** the AI returns a class whose code is not in the catalog
- **THEN** the class is not in the roadmap and appears under Ask your advisor

### Requirement: Taken classes never appear in the roadmap
The system SHALL remove any class the student has already taken and SHALL tell them why under Ask your advisor.

#### Scenario: Counselor named a taken class
- **WHEN** the roadmap contains INFO-I 101 and the student listed INFO-I 101 as taken
- **THEN** it is removed and Ask your advisor says they've already taken it and to ask the counselor whether they meant a different class

### Requirement: Counselor codes missing from the catalog are flagged
The system SHALL add every code detected in the notes with status not in catalog to Ask your advisor, even when the AI left it out.

#### Scenario: Fake code ignored by the AI
- **WHEN** the notes mention BUS-M 999 and the AI's answer doesn't mention it
- **THEN** Ask your advisor includes BUS-M 999 with "Your counselor mentioned this, but it isn't in the catalog. Double-check the code with them."

### Requirement: Non-class items come only from opportunity files
The system SHALL keep a club, event, workshop or internship in the roadmap only when it matches an entry in a loaded opportunity file (see campus-opportunities), showing its name, source and link. Any other non-class item SHALL move to Ask your advisor.

#### Scenario: Club found in the clubs file
- **WHEN** the AI places a club that exists in the clubs file
- **THEN** it appears in its semester with the beINvolved link

#### Scenario: Internship with no file loaded
- **WHEN** the AI returns an internship and no internships file is loaded
- **THEN** it appears under Ask your advisor and not in any semester

### Requirement: Origin labels are reliable
The system SHALL label a class "Counselor's pick" when the counselor named it (by detected code or by the AI's origin) in notes mode, and "Suggested for you" otherwise. In interests mode every class is "Suggested for you".

#### Scenario: Detected code labeled by the system
- **WHEN** the notes name STAT-S 301 and the AI marks it suggested
- **THEN** it is labeled Counselor's pick

### Requirement: Roadmap view shows the plan at a glance
The system SHALL show the tailored summary, totals (classes and semesters, counselor's picks or interests explored, suggested classes, days until the next dated deadline), each semester in order with its credits from this plan against the student's preferred load, and each class's code, title and credits. Selecting a class SHALL reveal its deadline, reason, fit and a reminder to confirm the term in iGPS when terms offered are unknown.

#### Scenario: Expand a class
- **WHEN** the student selects a class
- **THEN** its deadline, reason and source are shown, and selecting it again hides them

#### Scenario: No classes matched
- **WHEN** the checked roadmap has no semesters
- **THEN** the system says no matching classes were found and to ask the advisor which courses fit these goals

### Requirement: Progress toward graduation
The roadmap SHALL show the student's progress toward 120 credits: credits from classes already taken, credits this plan adds, and the semesters left until their graduation term.

#### Scenario: Progress shown
- **WHEN** a student who took INFO-I 101 (4 credits) builds a plan with 11 credits
- **THEN** the roadmap shows 4 credits taken and 11 planned toward 120

### Requirement: Build failures are explained
The system SHALL show a specific message when a build fails, and SHALL re-enable the Build button.

#### Scenario: Rate limited
- **WHEN** the AI service reports too many requests
- **THEN** the system shows "Too many requests right now. Wait a minute and try again."

#### Scenario: Server missing its API key
- **WHEN** the backend has no API key configured
- **THEN** the system shows "The roadmap builder isn't set up: the server has no Claude API key. Add ANTHROPIC_API_KEY to .env and restart the server."

#### Scenario: Unusable answer
- **WHEN** the AI's answer doesn't match the roadmap shape
- **THEN** the system shows "CrimsonPath couldn't read the AI's answer. Try building again."
