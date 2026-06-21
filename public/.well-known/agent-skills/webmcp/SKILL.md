# WebMCP Portfolio Tools

This site exposes portfolio data to AI agents via the WebMCP browser API (`navigator.modelContext`).

## Tools

### get_about
Returns professional summary and contact information for Chris Manlove.

### list_projects
Returns all portfolio projects with names, tech stacks, GitHub URLs, dates, and bullet-point descriptions.

### get_skills
Returns technical skills grouped by category: Languages, Systems Programming, Computer Science, Domain Knowledge, and Tools.

### list_experience
Returns professional work experience and internships in reverse chronological order.

## Usage

AI agents with WebMCP support can invoke these tools via `navigator.modelContext` when visiting any page on this site. No authentication is required.
