# Spec Delta

## Purpose

Adds IU Bloomington clubs, campus events and workshops, and internships as data files the roadmap can recommend from, each entry traceable to where it was collected.

## ADDED Requirements

### Requirement: Opportunity files hold only collected, sourced entries
The system SHALL load up to three optional files (clubs, events and workshops, internships). Each entry SHALL carry a name, a short description, a link to its source page, the source name, and the date it was collected. Entries without a source link SHALL be rejected when the file loads.

#### Scenario: Entry missing its source
- **WHEN** a clubs file contains an entry with no source link
- **THEN** that entry is skipped and the load reports how many entries were skipped

#### Scenario: File missing
- **WHEN** no internships file exists
- **THEN** the app runs, and internships go to Ask your advisor

### Requirement: Clubs come from beINvolved
The clubs file SHALL be collected from IU's public beINvolved organization listings and SHALL record each club's name, summary, category and beINvolved page.

#### Scenario: Search clubs by interest
- **WHEN** the AI searches clubs for "design"
- **THEN** it gets matching clubs with their beINvolved links

### Requirement: Events and workshops come from public IU calendars
The events file SHALL be collected from IU's public event listings and SHALL record each event's title, date, location and link. Events dated before today SHALL be left out of recommendations.

#### Scenario: Past event
- **WHEN** an event's date is before today
- **THEN** the AI's event search doesn't return it

### Requirement: Internships come only from listings a signed-in person exports
The internships file SHALL hold only listings that a team member with IU Handshake access copied or exported while signed in. The system SHALL NOT log in to Handshake or store anyone's credentials.

#### Scenario: Internship has an application deadline
- **WHEN** an internship entry has a deadline
- **THEN** a roadmap item for it shows that deadline

### Requirement: AI can search each loaded opportunity file
The system SHALL give the AI a search for each loaded opportunity file, and SHALL omit the search for a file that isn't loaded.

#### Scenario: Only clubs loaded
- **WHEN** clubs are loaded and events and internships are not
- **THEN** the AI has a club search and no event or internship search
