# WePray

WePray는 기독교 커뮤니티를 위한 기도방 및 성경 통독 방 웹 애플리케이션입니다. 사용자는 SNS 계정으로 로그인한 뒤 닉네임을 설정하고, Pray Room에서 기도제목을 나누거나 Bible Room에서 함께 성경 통독 플랜을 진행할 수 있습니다.

## 주요 기능

### 인증 및 계정
- Google, Kakao, Naver OAuth 로그인
- 최초 로그인 후 닉네임 설정
- 최근 로그인 수단 표시
- 앱 전체 다크모드 설정
- 닉네임 변경, 로그아웃, 회원 탈퇴
- 관리자 사용자 관리 화면

### Pray Room
- 기도방 생성, 검색, 입장
- 방 비밀번호 입장
- 기도제목 작성, 수정, 삭제
- 멤버 목록, 작성 history 확인
- 방장용 방 관리 및 멤버 내보내기
- 방 나가기 및 soft delete 기반 삭제 처리

### Bible Room
- 성경 통독 방 생성, 검색, 입장
- 통독 범위 선택: 전체, 구약, 신약
- 통독 기간 선택: 1개월, 2개월, 3개월, 6개월, 12개월
- 주일 제외 옵션 및 쉬어가는 날 표시
- 방 생성일 기준 자동 플랜 생성
- 성경 본문 장 단위 읽기 및 이전/다음/처음/끝 이동
- 마지막으로 읽던 장 기억
- 번역본 선택: 개역한글, 개역개정
- 성경 본문 글씨 크기 설정
- Bible Room별 다크모드 설정
- 구절 선택 후 묵상 작성 및 복사
- 나눔 피드, 플랜 달력, 읽기 완료/나눔 작성 상태 표시
- 읽기 완료 50%, 나눔 작성 50% 기준의 달성률 계산

### Pray News
- WePray 공지/소식 목록 확인

## 기술 스택

- Framework: Next.js 16 App Router
- Language: TypeScript
- UI: React, Tailwind CSS, lucide-react
- Auth: NextAuth.js
- ORM: Prisma
- Database: PostgreSQL
- Runtime: Node.js 22
- Deployment: Docker, Docker Compose

## 프로젝트 구조

```txt
app/
  prisma/
    migrations/          # Prisma migration
    schema.prisma        # DB schema
    seed.ts              # Bible seed script
    bible.json           # 성경 원문 데이터, 로컬 배치 필요
  src/
    app/                 # Next.js App Router pages and API routes
      api/               # API routes
      bible-room/        # Bible Room pages
      pray-room/         # Pray Room pages
      settings/          # 앱 설정 화면
    components/          # Client UI components
    lib/                 # auth, prisma, permissions, validation, bible plan helpers
    types/               # NextAuth type extensions
  Dockerfile
  package.json
```

루트 저장소에는 Docker Compose 운영 구성이 있습니다.

```txt
/opt/we-pray/
  docker-compose.yml
  .env.example           # 운영/Docker용 환경 변수 예시
  app/                   # Next.js 애플리케이션 저장소
```

## 환경 변수

개발 환경에서는 `app/.env`를 사용합니다.
운영 Docker 환경에서는 루트의 `.env`를 사용합니다


`ADMIN_OAUTH_IDS`는 `provider:providerUserId` 형식으로 입력합니다. 여러 명은 쉼표로 구분합니다.

```env
ADMIN_OAUTH_IDS="google:123456789,kakao:987654321"
```

## 개발 실행

### 1. 의존성 설치

```bash
cd /opt/we-pray/app
npm install
```

### 2. 개발 DB 실행

루트 Docker Compose의 PostgreSQL을 사용할 수 있습니다.

```bash
cd /opt/we-pray
docker compose up -d db
```

기본 개발 DB 접속 주소 예시는 다음과 같습니다.

```txt
postgresql://id:pass@localhost:55432/wp?schema=public
```

### 3. Prisma 마이그레이션

```bash
cd /opt/we-pray/app
npm run prisma:dev
```

운영 또는 배포 환경에서는 다음 명령을 사용합니다.

```bash
npm run prisma:migrate
```

### 4. 성경 데이터 시딩

`bible.json` 파일은 아래 경로에 위치합니다.

```txt
/opt/we-pray/app/prisma/bible.json
```

지원하는 구조 예시:

```json
[
  {
    "book_number": 1,
    "book_code": "GEN",
    "book_name": "창세기",
    "chapter": 1,
    "verse": 1,
    "translations": {
      "ko_krv": "태초에 하나님이 천지를 창조하시니라",
      "ko_nkrv": "태초에 하나님이 천지를 창조하시니라"
    }
  }
]
```

시드 실행:

```bash
npm run prisma:seed
```

다른 위치의 성경 파일을 사용할 경우 `BIBLE_JSON_PATH`를 지정할 수 있습니다.

```bash
BIBLE_JSON_PATH=/path/to/bible.json npm run prisma:seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

기본 주소:

```txt
http://localhost:3000
```

백그라운드 개발 서버가 필요하면 `tmux`를 사용할 수 있습니다.

```bash
tmux new -s wepray
cd /opt/we-pray/app
npm run dev
```

분리: `Ctrl+B` 후 `D`

다시 접속:

```bash
tmux attach -t wepray
```

종료:

```bash
tmux kill-session -t wepray
```

## 운영 실행

루트 디렉터리에서 Docker Compose로 실행합니다.

```bash
cd /opt/we-pray
docker compose up -d --build app
```

기본 운영 포트는 `.env`의 `APP_PORT`를 따릅니다. 예시 기준:

```txt
http://localhost:57636
```

앱 컨테이너는 시작 시 `prisma migrate deploy`를 실행한 뒤 Next.js 서버를 시작합니다.

## 자주 쓰는 명령어

```bash
# 개발 서버
npm run dev

# 타입/빌드 확인
npx tsc --noEmit
npm run build

# Prisma Client 생성
npm run prisma:generate

# 개발 마이그레이션
npm run prisma:dev

# 운영 마이그레이션 적용
npm run prisma:migrate

# 성경 데이터 시딩
npm run prisma:seed

# Docker 운영 실행
cd /opt/we-pray && docker compose up -d --build app
```

## OAuth Redirect URL

OAuth 제공자 콘솔에는 환경에 맞는 callback URL을 등록해야 합니다.

개발:

```txt
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/kakao
http://localhost:3000/api/auth/callback/naver
```

운영:

```txt
https://your-domain.com/api/auth/callback/google
https://your-domain.com/api/auth/callback/kakao
https://your-domain.com/api/auth/callback/naver
```

`NEXTAUTH_URL`도 개발/운영 주소와 반드시 일치해야 합니다.

## 데이터 정책 메모

- 사용자는 `deletedAt`을 이용해 soft delete 처리합니다.
- Pray Room과 Bible Room도 삭제 시 soft delete를 사용합니다.
- 방장인 방이 남아 있으면 회원 탈퇴가 제한됩니다.
- Bible Room 중도 참여자는 참여일 이후부터 오늘까지의 플랜을 기준으로 달성률을 계산합니다.
- Bible Room 달성률은 읽기 완료 50%, 나눔 작성 50%로 계산합니다.

## 변경 내역

상세 변경 내역은 [CHANGELOG.md](./CHANGELOG.md)를 참고하세요.

## 라이선스 및 저작권

Copyright © 2026 Yunwoo Kim. All rights reserved.
