# IFDO 로그 분석 리포트

웹사이트 방문 로그 데이터를 분석하고 시각화하는 애플리케이션입니다.

## 주요 기능

- IFDO API에서 데이터 불러오기
- 방문자 데이터 시각화 (차트)
- GPT를 활용한 데이터 분석
- 사용자 정의 프롬프트로 분석 요청

## Render.com 배포 방법

1. [Render.com](https://render.com/)에 가입하고 로그인합니다.

2. 대시보드에서 "New Web Service" 버튼을 클릭합니다.

3. GitHub 저장소 연결:
   - "Connect a repository" 선택
   - GitHub 계정 연결
   - ifdo 저장소 선택

4. 서비스 구성:
   - **Name**: 원하는 서비스 이름 (예: ifdo-analytics)
   - **Root Directory**: ifdo-analytics (프로젝트 루트 디렉토리)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run render-postbuild`
   - **Start Command**: `npm run render-start`
   - **Instance Type**: Free (무료 플랜)

5. 환경 변수 설정:
   - "Advanced" 섹션 확장
   - "Add Environment Variable" 클릭
   - OPENAI_API_KEY 추가 (OpenAI API 키 입력)
   - PORT 추가 (값: 10000 또는 Render에서 자동 설정)

6. "Create Web Service" 버튼을 클릭하여 배포를 시작합니다.

7. 배포가 완료되면 제공된 URL로 애플리케이션에 접속할 수 있습니다.

## 개발 환경 설정

1. 저장소 복제:
```
git clone https://github.com/사용자명/ifdo.git
cd ifdo/ifdo-analytics
```

2. 의존성 설치:
```
npm install
```

3. 환경 변수 설정:
- `.env.server` 파일 생성 후 다음 내용 입력:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
```

4. 개발 서버 실행:
```
npm run server  # 백엔드 서버 실행
npm start       # 프론트엔드 개발 서버 실행
```

## 기술 스택

- React
- TypeScript
- Material UI
- Express.js
- OpenAI API
- Recharts (차트 라이브러리) 