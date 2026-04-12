# Student Management System

Portable Electron app for local computer center management.

## Setup

```bash
npm install
npm start
```

## Project Structure

```
student-management-system/
├── package.json
├── data/
│   └── database.db          ← auto-created on first run
└── src/
    ├── backend/
    │   ├── database/
    │   │   └── db.js         ← DB connection ONLY
    │   ├── models/
    │   │   └── student-model.js  ← all SQL for students
    │   └── services/
    │       └── student-service.js  ← business logic
    ├── main/
    │   ├── main.js           ← Electron entry, IPC handlers
    │   └── preload.js        ← secure renderer ↔ main bridge
    └── renderer/
        ├── pages/
        │   └── index.html    ← main shell
        ├── css/
        │   ├── main.css      ← global design system
        │   └── student.css   ← student page styles
        └── js/
            ├── renderer.js   ← routing, toasts, nav
            └── student.js    ← student page UI logic
```

## Architecture Rules (DO NOT BREAK)

- ❌ Renderer NEVER talks to DB directly
- ❌ SQL NEVER goes in main.js
- ✅ SQL lives only in `backend/models/`
- ✅ Business logic lives only in `backend/services/`
- ✅ IPC channels defined in preload.js + main.js

## Build Order (Phases)

- [x] Phase 1: Students (add/edit/delete/search)
- [x] Phase 2: Courses
- [x] Phase 3: Slots / Batches
- [x] Phase 4: Dashboard
- [x] Phase 5: Fees
- [x] Phase 6: Test & Grades
- [ ] Phase 7: Forms and Document
- [ ] Phase 8: ID Card generation
- [ ] Phase 9: Google Forms integration

## UI/UX Improvements
- [O] Shrinking board in fees when month is changed 
- [X] Course cards are getting stretched in Course module


## Things to resolve
- [x] Pagination in student
- [X] In student "fee status feature" have to be removed
- [X] In slot management remove "export" button from top
- [X] Add holdiays in the calendar in dashboard
- [X] Due dates are not working properly in fees section
- [ ] How to push notifications/reminders? Have to connect it with a system

## Big things to work around
- [X] Slot-Student Enrollment Mapping issue from student modal
- [X] Updating fees in fee section feature not working
- [x] Inactive student feature made functional
- [] Test & Grade: Publishing Tests and pulling grades
- [ ] Forms and document
