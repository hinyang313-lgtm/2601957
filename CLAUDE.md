# 손글씨 인식 (Study01_MNIST)

MNIST로 학습한 합성곱 신경망으로 손으로 쓴 숫자 하나를 알아맞히는 프로그램이다.
같은 모델을 두 가지 방법으로 쓴다.

| 폴더 | 무엇 | 추론 위치 | 어떻게 연다 |
| --- | --- | --- | --- |
| `desktop_version/` | 파이토치 + Tkinter 데스크톱 앱 | 파이썬(파이토치) | `python3 app.py` |
| `web_version/` | 순수 자바스크립트 웹 앱 | 브라우저 안 | 깃허브 페이지 또는 로컬 서버 |

두 버전은 기능 범위가 같다. 280x280 칸에 숫자를 그리면 상위 3개 후보를 보여준다.
웹 버전에는 터치 입력이 더 있다.

## 두 버전의 관계

```
desktop_version/train.py  →  mnist_cnn.pt
                                 │
                                 ├─ desktop_version/app.py 가 그대로 쓴다
                                 │
                                 └─ desktop_version/가중치내보내기.py
                                        → web_version/가중치.bin
                                        → web_version/가중치정보.json
                                              │
                                              └─ web_version/모델.js 가 읽는다
```

ONNX 같은 공용 형식을 쓰지 않는다. 웹 버전은 외부 라이브러리 없이 순수 자바스크립트로
순전파를 다시 구현했으므로 숫자만 있으면 된다.

**파이썬이 원본이다.** 층 구성, 전처리 단계, 정규화 상수는 파이썬 쪽에서 정하고
자바스크립트가 따라간다. 파이썬을 고치면 `가중치내보내기.py`를 다시 실행하고,
`web_version/검증.html`로 두 버전이 같은 답을 내는지 확인한다.

## 두 폴더가 함께 지키는 규칙

1. **식별자는 한글로 짓는다.** 라이브러리가 정한 이름(`forward`, `state_dict`,
   `getImageData` 등)과 파일 확장자는 그대로 둔다.
2. **그림은 검은 바탕에 흰 숫자다.** MNIST 원본과 같은 형식이라 전처리가 단순해진다.
3. **그림판 규격은 280x280, 펜 굵기 20이다.** 두 버전이 같아야 같은 답이 나온다.
4. **전처리는 3단계다.** 여백 자르기 → 비율 유지하며 20x20으로 축소 →
   밝기 무게중심을 28x28 중앙으로 이동. MNIST 자체가 이 방법으로 만들어진 자료라서
   사람이 그린 그림도 같은 방법으로 다듬어야 모델이 맞힌다.
5. **정규화 상수는 0.1307과 0.3081이다.** 자바스크립트는 이 값을 코드에 적지 않고
   `가중치정보.json`에서 읽는다. 값의 출처를 파이썬 하나로 유지하기 위함이다.

## 처음부터 다시 만드는 순서

```bash
cd desktop_version
python3 train.py                # mnist_cnn.pt 를 만든다 (MNIST를 내려받는다)
python3 가중치내보내기.py        # web_version/가중치.bin, 가중치정보.json
python3 검증데이터만들기.py      # web_version/검증데이터.json (깃에 넣지 않는다)

cd ../web_version
python3 -m http.server 8000     # http://localhost:8000/ 과 /검증.html
```

## 깃허브 페이지

`.github/workflows/pages.yml`이 `web_version/` 폴더만 배포한다. 저장소 맨 위에
`index.html`이 없으므로 Pages의 Source를 `GitHub Actions`로 두어야 한다
(워크플로의 `actions/configure-pages`가 자동으로 맞춘다).

`web_version/검증데이터.json`은 약 25MB라 깃에 넣지 않는다. 그래서 배포된
`검증.html`은 정답 자료를 찾지 못한다. 검증은 로컬에서 한다.

## 문서

- `CLAUDE_전역.md` — 계정 전체에 적용되는 지시의 사본
- `desktop_version/CLAUDE.md` — 파이썬 쪽 규칙
- `web_version/CLAUDE.md` — 자바스크립트 쪽 규칙
- `docs/superpowers/specs/` — 설계 문서
- `docs/superpowers/plans/` — 구현 계획
