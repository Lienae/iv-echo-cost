# 제5인격 메아리 계산기

제5인격 스킨 구매에 필요한 메아리 수량과 결제 금액을 계산하는 공개 웹 계산기입니다. 사용자가 보유 메아리와 원하는 스킨을 선택하면, 선택한 결제 기준의 실제 패키지 단가표로 최소 결제 조합을 계산합니다.

현재 배포 주소: https://lienae.github.io/iv-echo-cost/

## 주요 기능

- 캐릭터별 스킨 목록 검색 및 선택
- 캐릭터/스킨 이름 통합 검색
- 스킨 등급/개별 가격 기반 메아리 필요량 계산
- 한국 인게임 결제표와 일본 공식 직결제표 중 선택
- 패키지 단위 최소 결제 조합 계산
- 일본 엔화 기준 선택 시 실시간 환율 기반 원화 참고액 표시
- 메아리로 구매할 수 없는 스킨 구분 표시

## 로컬 실행

정적 파일만 사용하는 앱이라 별도 빌드가 필요 없습니다. 로컬 서버에서 열면 JSON `fetch`가 정상 동작합니다.

```powershell
node scripts/serve-static.js --port 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.

## 데이터 구조

- `data/rarities.json`: 등급별 기본 메아리 가격
- `data/skins.json`: 앱에서 사용하는 병합된 스킨 데이터
- `data/skins-raw/*.json`: 원본 스킨 배치 데이터
- `data/echo-packs.json`: 결제 기준별 메아리 패키지 단가표
- `data/echo-price-estimate.json`: 과거 근사치 계산 기록용 데이터

스킨 데이터는 `data/skins-raw/*.json`을 원본으로 두고, 아래 스크립트로 `data/skins.json`을 다시 생성합니다.

```powershell
node scripts/merge-skins.js
```

## 검증

계산 로직 테스트:

```powershell
node tests/calc.test.js
```

데이터 정합성 검사:

```powershell
node scripts/validate-data.js
```

전체 체크:

```powershell
node scripts/check.js
```

문법 확인:

```powershell
node --check app.js
node --check src/calc.js
node --check scripts/merge-skins.js
node --check scripts/validate-data.js
node --check scripts/serve-static.js
```

## 배포 전 체크리스트

1. 스킨 원본을 바꿨다면 `node scripts/merge-skins.js`를 실행합니다.
2. `node scripts/check.js`를 실행합니다.
3. 앱 파일이나 데이터가 바뀌면 `index.html`의 `?v=` 값과 `app.js`의 `ASSET_VERSION`을 같이 올립니다.
4. 배포 후 실제 페이지에서 한국 기준, 일본 기준, 환율 표시를 각각 확인합니다.

## 가격과 환율 주의사항

계산기는 선택한 결제 기준의 패키지 단가표로 최소 결제 금액을 계산합니다. 일본 공식 직결제 기준의 원화 금액은 실시간 환율을 적용한 참고값이며, 실제 카드 청구액은 카드사 환율과 해외결제 수수료에 따라 달라질 수 있습니다.

새로운 가격표, 결제 티어, 스킨 데이터가 확인되면 관련 JSON을 갱신하고 검증 스크립트를 실행한 뒤 배포해야 합니다.
