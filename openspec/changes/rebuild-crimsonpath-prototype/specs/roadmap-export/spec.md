# Spec Delta

## Purpose

Lets a student take their finished roadmap with them as a single page that reads well on a phone: download it as a PDF, or save it straight to their Google Drive.

## ADDED Requirements

### Requirement: One-page roadmap layout
The system SHALL render the roadmap as one page: the student's profile in one line, every semester with its classes (code, title, credits, origin) and opportunities, deadlines, and Ask your advisor items. It SHALL leave out the chat and the editing controls, and it SHALL be readable on a phone screen without zooming.

#### Scenario: Long plan
- **WHEN** a roadmap has 4 semesters with 3 classes each and 5 advisor items
- **THEN** the page still fits on one page, using smaller type and leaving out per-class reasons first

### Requirement: Download as PDF
The system SHALL offer "Download PDF", which saves the one-page roadmap as a PDF named with the student's major and the date.

#### Scenario: Download
- **WHEN** the student selects Download PDF
- **THEN** a PDF of the one-page layout is saved, for example `crimsonpath-informatics-2026-11-25.pdf`

### Requirement: Save to Google Drive
The system SHALL offer "Save to Google Drive" when a Google client ID is configured. It SHALL ask the student to sign in to Google, request access only to files the app creates, save the one-page roadmap to their Drive as a Google Doc, and show a link to it. When no client ID is configured, the button SHALL be hidden.

#### Scenario: Saved
- **WHEN** the student signs in and allows access
- **THEN** the roadmap is saved as a Google Doc and the system shows "Saved to your Google Drive" with an Open in Drive link

#### Scenario: Sign-in cancelled
- **WHEN** the student closes the Google sign-in window
- **THEN** nothing is uploaded and the system shows "Google sign-in was cancelled. Your roadmap wasn't saved to Drive."

#### Scenario: Not configured
- **WHEN** no Google client ID is set
- **THEN** only Download PDF is shown
