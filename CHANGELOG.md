# Changelog

## 2026-06-29

### Added
- Added a Bible chapter picker for the selected reading date with a sticky header, hidden scrollbar, current-chapter positioning, and backdrop dismissal. (`9520ef4`, `8b07713`)
- Added admin room password reset to `0000`, relative last-updated labels, and a cleaner member list. (`85a8c48`)
- Added date-level copying for all Pray Room posts on a selected Korean calendar date, independent of list pagination. (`2e5b8ce`)

### Changed
- Added consistent floating close controls to Bible verse actions, Bible sharing actions, and Prayer Room post actions. (`158ea67`)
- Updated Bible Plan progress member cards with owner and ME indicators, member start dates, and support for completing plans from before the member joined. (`597660c`)

## 2026-06-25

### Added
- Added the M'Cheyne Bible reading plan option and plan-order information. (`cc58740`)
- Added room-title verification and confirmation flows when deleting Prayer Rooms and Bible Rooms. (`cc58740`)
- Added collapsible Bible sharing content for longer reflections. (`2354de1`)
- Added reflection deletion to the full-screen reflection edit flow. (`221e2fb`)
- Added PWA installation completion state and follow-up prompt handling. (`7edd370`, `25be1a0`)

### Changed
- Refined Bible Room date formatting, reading controls, and related visual styling. (`956534b`)

## 2026-06-24

### Added
- Added integrated admin management for Prayer Rooms and Bible Rooms with filtering, search, member inspection, pagination, and verified room deletion. (`b47571b`)
- Added nickname-confirmed account withdrawal and improved withdrawal safeguards. (`16d7b2d`)
- Added admin Pray News CRUD, public paginated Pray News loading, and Settings navigation. (`c215f04`)
- Added clickable URL rendering in Pray News content. (`19caa0d`)
- Added expandable Pray News cards and improved image/content presentation. (`26cdfbf`)
- Added sanitized rich HTML Pray News content and room-password verification before sharing. (`e969c30`)

### Changed
- Improved Kakao in-app browser handoff, post-login destination restoration, client cache clearing on logout/withdrawal, and Kakao JavaScript key handling. (`b069828`, `c6f1a15`)

## 2026-06-23

### Added
- Added Prayer Room, Bible Room, and site sharing with KakaoTalk and native share flows. (`4e98882`)
- Added shared-room join pages and preserved room destinations through login and nickname setup. (`4e98882`)

### Changed
- Updated the application version to 1.0.0. (`a53c559`)

## 2026-06-22

### Added
- Added admin feedback management, user management improvements, database persistence, and email notification support. (`ff9f846`)
- Added Bible translation administration with visibility, copyright requirements, and per-user copyright permission controls. (`5e50ded`)
- Added login-provider identification to the Settings account display. (`c835e6f`)
- Added richer service information and guidance content to Settings. (`79b692a`)

### Changed
- Made the Bible Room action guide use stable sample data and refined spotlight target behavior. (`3c8ad6b`, `294e226`)
- Added an iOS edge-swipe guard to prevent browser back navigation while reading Bible text. (`f4a1997`)
- Improved PWA install-state persistence and iOS installation guidance. (`4b3d0c4`)
- Applied Bible translation copyright availability styling and disabled-state feedback. (`a7823cd`)
- Included time information in admin user date displays. (`a800548`)

## 2026-06-21

### Added
- Added the prayer reaction type to Bible Room reflections with counts, per-user state, and animated feedback. (`35b9d0d`)
- Added answered-prayer state, API support, and ANSWERED presentation for Prayer Room posts. (`cee849f`)
- Added first-entry search/create guidance shared by Prayer Room and Bible Room lists. (`717e802`)
- Added PWA manifest, icons, service worker registration, install prompts, and Settings installation controls. (`eb15cea`)

### Changed
- Improved guide animations, pulse treatments, action colors, and guide button visibility. (`444ea4d`)
- Standardized room-owner terminology as "방장" and refined owner-only room actions. (`e876b9c`)
- Standardized browser input autocomplete and autofill suppression across sensitive forms. (`ca0c764`)

## 2026-06-20

### Added
- Added an app-wide usage guide entry in Settings with Bible Room and Pray Room guide selection. (`222c20d`)
- Added the shared AppGuideOverlay component for settings-launched Bible Room and Pray Room guides. (`222c20d`)
- Added the in-room Bible action guide with step navigation, target pulsing, scroll control, and persisted guide completion. (`686ca91`, `87fbb3f`)
- Added Bible text line-height controls to Bible Room settings. (`72b0a00`)
- Added Settings cache clearing for saved WePray browser preferences and reading state. (`0d37a98`)

### Changed
- Improved Bible Room guide behavior with guided tab movement, contextual action examples, and overlay handling. (`686ca91`)
- Improved Toast visibility and styling, including higher overlay priority and app-wide color polish. (`cc3ddfa`, `0d37a98`)
- Updated Pray Room post card and modal Korean text and accessibility details. (`61d4ac6`)
- Updated Pray Room page header description text. (`67adba3`)
- Prevented Prayer Room settings modal background scrolling while open. (`b54b975`)

## 2026-06-18

### Added
- Added current-user ME indicators to Bible Room and Prayer Room member lists. (`86eb8b7`)
- Added long-press copy support for Bible Room sharing cards with passage text and reflection content. (`0db0044`)
- Added Pray Room prayer reactions with per-post prayer counts and a celebration effect. (`a722394`)
- Added Bible Room reflection reactions for likes and hearts with per-user reaction state and animated feedback. (`8110754`)
- Added an app-wide settings page and settings menu entry. (`b9bdd85`)
- Added app-wide dark mode preference storage and application through the shared provider. (`b9bdd85`)
- Added settings controls for nickname change, logout, account withdrawal, version display, and release information. (`b9bdd85`)
- Added 50-item cursor pagination and infinite-scroll loading for Pray Room prayer-post lists.(`750e1d0`)
- Added dedicated member prayer-post history loading so member counts and histories stay accurate with paginated room lists. (`750e1d0`)

### Changed
- Matched Pray Room author nickname styling for the current user with Bible Room sharing cards. (`57f07f2`)
- Updated nickname settings so successful saves close the modal and show a toast while validation errors stay inline. (`57f07f2`)
- Updated Bible Room sharing card actions so reactions are available directly on cards, while copy/edit/delete actions live in the long-press action sheet. (`8110754`)
- Unified the Pray Room and Bible Room floating search/create buttons with cleaner icon styling and updated create-button color. (`195f369`)
- Fixed Pray Room validation toasts so prayer-post input errors dismiss automatically and clear while editing. (`0db0044`)
- Improved dark mode styling across main menu cards, Pray Room lists, Bible Room lists, Pray News, login, nickname setup, and settings screens. (`b9bdd85`)
- Updated Bible Room dark mode behavior so a room without its own saved preference uses the current app-wide dark mode value as its initial default. (`b9bdd85`)
- Improved Pray Room detail dark mode styles and updated related button text. (`8c0fc63`)
- Updated Bible Room calendar layering and reflection display so calendar overlays and verse reflection indicators behave correctly. (`d308e23`)
- Reloaded Bible Room progress data after relevant detail loading changes. (`f233d98`)
- Changed Pray Room prayer-post actions from long-press editing to click selection with a floating copy/edit action bar. (`9966ced`)
- Limited edit actions to the current user's own prayer posts while keeping copy available for selected posts. (`9966ced`)
- Updated prayer-post copy output to `[작성자] [YYYY-MM-DD] 내용`. (`420669f`)
- Replaced locale-dependent Pray Room date/time rendering with deterministic Korean formatting to prevent hydration mismatches. (`3cc9376`)

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
