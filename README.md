# KiteDesk

KiteDesk is a full-stack project management and issue tracking application designed for small and growing software teams.

It provides workspaces, project management, task tracking, team roles, comments, attachments, notifications, activity history, and review workflows in one centralized platform.

## Live Demo

Link
https://kitedesk-t9pq.onrender.com



> The application is currently deployed on Render.

---

## Features

### Authentication
- User registration
- User login
- Secure HttpOnly cookie authentication
- Logout
- Protected routes

### Workspaces
- Create workspaces
- Workspace member management
- Owner, Manager, and Member roles
- Invite members through email
- Accept or decline workspace invitations

### Projects
- Create and manage projects
- Project status tracking
- Project deadlines
- Add and remove project members
- Project overview and progress tracking
- Project activity history

### Tasks
- Create tasks
- Assign tasks to project members
- Task priorities
- Task types
- Due dates
- Task comments
- File attachments
- Task activity history

### Task Workflow

Tasks follow this workflow:


To Do
  ↓
In Progress
  ↓
Review
  ↓
Approved → Done
  ↓
Changes Requested
  ↓
In Progress


Tech Stack used
react + typescript
vite
tailwind

node + express.js 
prisma
postgresql

jwt

github actions
render



## IMPROVEMENTS TO BE WORKED ON

### Production & Reliability
- [ ] Password recovery
- [ ] Improved invitation authentication flow
- [ ] Persistent cloud attachment storage
- [ ] Unit and end-to-end testing

### Productivity
- [ ] Global search
- [ ] Advanced task filtering
- [ ] Labels and tags
- [ ] Subtasks and checklists
- [ ] Project archiving

### Collaboration
- [ ] @mentions
- [ ] Task dependencies
- [ ] Email notifications
- [ ] Recurring tasks
- [ ] Project templates

### Future
- [ ] Real-time collaboration
- [ ] Project analytics
- [ ] Workload reporting
- [ ] PWA support
- [ ] Two-factor authentication
