# Spec Delta

## Purpose

Lets a student ask questions about the roadmap they built or ask for changes to it, with the AI's changes checked by the same catalog rules before they are shown.

## ADDED Requirements

### Requirement: Chat is available once a roadmap exists
The system SHALL show an "Ask about your plan" chat under a built roadmap, with a text box, a Send control and quick prompts: "Make it lighter", "Swap in an easier class", "Add a class for my interests", "Why these classes?".

#### Scenario: Quick prompt
- **WHEN** the student selects "Why these classes?"
- **THEN** it is sent as their message

#### Scenario: Enter sends, Shift+Enter adds a line
- **WHEN** the student presses Enter in the chat box
- **THEN** the message is sent, and Shift+Enter inserts a new line instead

### Requirement: Questions get answers without changing the plan
The system SHALL answer a question in 1–3 plain sentences and SHALL leave the roadmap unchanged.

#### Scenario: Question only
- **WHEN** the student asks "Why STAT-S 301?"
- **THEN** a reply appears and the roadmap is unchanged

### Requirement: Change requests update the checked plan
When the student asks for a change, the system SHALL replace the roadmap with the AI's updated plan after running every roadmap-builder check on it, and SHALL say what changed.

#### Scenario: Lighter load
- **WHEN** the student sends "Make it lighter"
- **THEN** the reply says what moved or was removed and the roadmap shows the update

#### Scenario: Dropping a counselor's pick
- **WHEN** the student asks to drop a counselor's pick
- **THEN** the reply tells them to check with their counselor first

### Requirement: Chat keeps recent context
The system SHALL send the profile, the original notes or interests, detected codes, the current plan, and the last 8 chat messages with each chat request.

#### Scenario: Follow-up refers to earlier message
- **WHEN** the student sends "do that for fall too" after a change request
- **THEN** the request includes the earlier exchange

### Requirement: One chat request at a time
The system SHALL ignore new sends while a reply is pending, and SHALL show a waiting message in the thread.

#### Scenario: Double send
- **WHEN** the student presses Send twice quickly
- **THEN** only one request is made

### Requirement: Chat failures are explained and recoverable
The system SHALL replace the waiting message with a specific error, SHALL drop the failed message from the chat history, and SHALL re-enable Send.

#### Scenario: Rate limited
- **WHEN** the AI service reports too many requests
- **THEN** the thread shows "Too many requests right now. Wait a minute and try again."
