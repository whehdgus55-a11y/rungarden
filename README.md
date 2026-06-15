# RunGarden

러닝 기록으로 식물을 성장시키는 원예 서비스입니다. 이메일 로그인 후 `/datamanagement`에서 러닝 거리와 시간을 저장하면 선택한 식물의 성장률이 계산됩니다.

## 기능

- 랜딩페이지에서 서비스 소개
- Supabase 이메일 매직 링크 로그인
- 로그인 사용자 전용 데이터 관리 페이지
- 러닝 거리, 시간, 메모 저장
- 식물별 러닝 기록 분리
- 성장률 100% 달성 시 수확하기
- 수확 후 같은 식물의 다음 재배를 0%부터 다시 시작
- 바질, 방울토마토, 상추, 딸기 선택
- 본인 러닝 기록만 조회, 저장, 삭제
- Supabase RLS로 사용자별 데이터 보호

## 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`service_role` key는 클라이언트/환경변수에 넣지 않습니다.

## Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 전체 실행
3. Authentication > Providers > Email 활성화
4. Authentication > URL Configuration에 주소 등록

로컬:

```text
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

Vercel 배포 후:

```text
Site URL: https://너의-vercel주소.vercel.app
Redirect URL: https://너의-vercel주소.vercel.app/auth/callback
```

추가 OAuth 설정은 필요 없습니다.

## Vercel 환경변수

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
```

## 과제 제출 문구

제목:

```text
RunGarden: 러닝 데이터를 활용한 가상 원예 성장 서비스
```

설명:

```text
사용자의 러닝 거리와 시간을 식물 성장 에너지로 변환하여 운동 습관과 원예 활동을 함께 지속할 수 있도록 돕는 웹 서비스입니다. 이메일 로그인 후 러닝 기록을 저장하고, 누적 거리 기반으로 나만의 식물을 성장시키며 100% 달성 시 수확할 수 있습니다.
```
