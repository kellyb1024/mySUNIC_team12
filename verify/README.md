# 동작 지문 — 화면이 안 바뀌었다는 것을 기계로 확인하기

코드를 줄이거나 구조를 바꿀 때, **결과가 똑같은지**를 눈으로 확인하기는 어렵습니다.
화면 여덟 개에 팝업 일곱 개고, 캐파 계산은 92일치입니다.

이 폴더는 그것을 한 번에 대조합니다.

## 쓰는 법

```bash
# ① 바꾸기 전 파일에 지문 스크립트를 심어 브라우저로 연다
python3 -c "
import pathlib
src=pathlib.Path('../prototype0804_code.html').read_text()
probe=pathlib.Path('fingerprint.js').read_text()
pathlib.Path('/tmp/before.html').write_text(src.replace('</body>',probe+'</body>'))
"
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --headless --disable-gpu --window-size=1440,900 --virtual-time-budget=9000 \
  --dump-dom file:///tmp/before.html 2>/dev/null | grep -oE 'FP::[^<"]*' > /tmp/before.txt

# ② 바꾼 뒤 파일에도 똑같이 하고 두 결과를 비교한다
#    문자열이 한 글자라도 다르면 무언가 달라진 것이다
diff /tmp/before.txt /tmp/after.txt && echo "동일"
```

결과는 base64 로 `document.title` 에 실려 나옵니다. JSON 을 그대로 담으면
따옴표가 `&quot;` 로 이스케이프돼 `--dump-dom` 에서 꺼낼 수 없기 때문입니다.

풀어 보려면:

```bash
python3 -c "
import base64,json,sys
d=json.loads(base64.b64decode(open('/tmp/before.txt').read().strip()[4:]))
print(json.dumps(d,ensure_ascii=False,indent=1))
"
```

## 무엇을 보나

| | |
|---|---|
| `data` | 204건의 모든 필드 |
| `capa` | 92일치 배너·쿠폰 잔여와 사용량 |
| `rec` | 추천을 조건 6가지로 돌린 결과 (점수 소수점 6자리까지) |
| `check` | `dayCheck` 를 92일 전부에 대해 |
| `screens` | 역할·탭 조합 8가지의 DOM 과 눈에 보이는 글자 |
| `popups` | 상태별 팝업 7가지 |
| `style` | 주요 요소의 실제 계산된 스타일 |
| `cssRules` · `domNodes` | 통째로 날아간 규칙이 없는지 |

## 픽셀까지 보려면

`setup.tmpl` 의 `__STATE__` 를 화면 상태로 바꿔 심고 `--screenshot` 을 찍어
해시를 비교합니다.

```bash
# 예: 담당자 캠페인 관리
sed "s/__STATE__/role='adm';tab='manage';render();/" setup.tmpl > /tmp/inj.html
```

## 믿을 만한지 확인한 방법

**항상 통과하는 검사기는 쓸모없습니다.** 일부러 망가뜨린 사본으로 확인했습니다.

| 심은 것 | 어디서 잡혔나 |
|---|---|
| 버튼 여백 `21px` → `20px` | `style` |
| 캐파 부족 문구 1만 차이 | `check` |
| 추천 가중치 `.40` → `.41` | `rec` |

셋 다 잡혔고, 원본을 자기 자신과 비교했을 때는 전부 일치했습니다.

## 주의

`fingerprint.js` 는 프로토타입의 전역 함수(`requests` · `bannerRem` · `recTop` ·
`dayCheck` · `render` 등)를 직접 부릅니다. **함수 이름이 바뀌면 지문 스크립트도
같이 고쳐야 합니다.** 지문 수집이 실패하면 `ERR::` 로 시작하는 값이 나옵니다.
