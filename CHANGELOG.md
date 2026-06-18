# Changelog

## 2026-06-18

### Added
- Added an app-wide settings page and settings menu entry. (`b9bdd85`)
- Added app-wide dark mode preference storage and application through the shared provider. (`b9bdd85`)
- Added settings controls for nickname change, logout, account withdrawal, version display, and release information. (`b9bdd85`)
- Added 50-item cursor pagination and infinite-scroll loading for Pray Room prayer-post lists.
- Added dedicated member prayer-post history loading so member counts and histories stay accurate with paginated room lists.

### Changed
- Improved dark mode styling across main menu cards, Pray Room lists, Bible Room lists, Pray News, login, nickname setup, and settings screens. (`b9bdd85`)
- Updated Bible Room dark mode behavior so a room without its own saved preference uses the current app-wide dark mode value as its initial default. (`b9bdd85`)
- Improved Pray Room detail dark mode styles and updated related button text. (`8c0fc63`)
- Updated Bible Room calendar layering and reflection display so calendar overlays and verse reflection indicators behave correctly. (`d308e23`)
- Reloaded Bible Room progress data after relevant detail loading changes. (`f233d98`)
- Changed Pray Room prayer-post actions from long-press editing to click selection with a floating copy/edit action bar.
- Limited edit actions to the current user's own prayer posts while keeping copy available for selected posts.
- Updated prayer-post copy output to `[작성자] [YYYY-MM-DD] 내용`.

## 2026-06-17

### Added
- Added Bible Room create-flow guidance that plans start from the room creation date. (`f15dd98`)
- Added a calendar legend explaining completion and reflection markers. (`a524cba`)
- Added Bible Room display settings for Bible text size and Bible Room dark mode. (`865ed0e`)

### Changed
- Updated Bible Room progress calculation to score reading completion and reflection writing, with explanation UI. (`b3905a2`)
- Changed the Bible tab calendar from an inline area to a popup-style date selector. (`4cea5e8`)
- Grouped Bible sharing feed items by their plan date and added calendar markers for completed readings and reflections. (`9dafa06`)
- Improved calendar UI behavior, modal scroll locking, and production-related Next.js configuration. (`cee615b`)
- Prevented Bible reading completion toggles from resetting the current reading position. (`e589cf2`)
- Replaced verse long-press actions with compact floating verse actions. (`758796e`)
- Updated Bible seed logic to sync translation content for existing verses. (`6e54c0c`)

### Infrastructure
- Configured production and development environment files, Docker Compose settings, ignored environment/database files, and updated the app gitlink in the root repository. (`03d3651`)

## 2026-06-16

### Added
- Added Bible translation selection settings for available translations. (`151f21e`)
- Added per-room persistence for the last read Bible chapter. (`381df81`)
- Added first and last chapter navigation controls. (`83c787d`)

### Changed
- Updated Bible data to include expanded translation content. (`151f21e`)
- Refined Bible plan date selection and rest-day handling, including disabled non-plan dates and rest-day messaging. (`d29fc61`)
- Changed Bible Room default selected date behavior to use today. (`59ffd6a`)

## 2026-06-12

### Added
- Added Bible Room data model, Prisma migration, Bible seed data, and Bible APIs for rooms, plans, reading, reflections, progress, and verse lookup. (`984b329`)
- Added Bible Room pages and client components for room lists, room detail, reading tabs, sharing, plans, reflections, and progress. (`984b329`)
- Added Bible plan generation utilities and Bible API helpers. (`984b329`)
- Added Bible Room search and join flow. (`438c96f`)
- Added Bible Room settings, member management, room leave flow, member reflection history, and member kick support. (`1d52d30`)
- Added swipe-based Bible chapter navigation. (`66675d1`)

### Changed
- Improved Bible Room reading navigation, plan display, sticky reading header, and chapter navigation interactions. (`fca8be4`, `88f22ed`, `cea24ae`)
- Updated Bible Room duration option label/behavior. (`0a4d575`)
- Updated Pray Room search/join flow to identify rooms already joined by the current user. (`49b77c6`)

### Infrastructure
- Initialized the root deployment repository with the app gitlink, Docker Compose setup, and a PostgreSQL data directory snapshot. (`562c04c`)

## 2026-05-08

### Added
- Added app favicon and SNS login provider icons. (`5e67d50`)

## 2026-05-07

### Added
- Added auth completion routing after login. (`73c5b8d`)
- Added logout button support. (`73c5b8d`)
- Added account withdrawal UI and backend flow. (`734e651`)
- Added recent-login-provider display for login buttons. (`6c910c0`)

### Changed
- Improved authenticated navigation flow and room-detail navigation behavior. (`73c5b8d`)
- Refined Pray Room interactions and account removal behavior. (`734e651`)
- Prevented account withdrawal for users who own rooms. (`06a0001`)
- Polished main menu and Pray Room UI details. (`6397254`)

## 2026-05-06

### Added
- Initial WePray Next.js app implementation. (`d15a819`)
- Added Prisma schema, initial database migration, and core models for users, prayer rooms, members, posts, and Pray News. (`d15a819`)
- Added NextAuth OAuth login with Google, Kakao, and Naver. (`d15a819`)
- Added nickname setup and validation. (`d15a819`)
- Added Pray Room creation, search, join, leave, member management, post CRUD, and room management APIs. (`d15a819`)
- Added Pray Room list/detail UI, main menu, login page, usage page, admin pages, modal/toast UI, and base Tailwind styling. (`d15a819`)
- Added Docker, environment examples, middleware, package setup, and project configuration files. (`d15a819`)
