# 손글씨 숫자 인식 (3장 실습)

마우스로 그린 숫자를 인식하는 앱이다. 같은 프로그램을 데스크톱 앱과 웹 앱 두 버전으로
만들어 나란히 두었다.

실행 방법 안내 (윈도우 PowerShell 기준)

- **데스크톱** — `cd desktop_version; py app.py`
- **웹** — `cd web_version; py -m http.server 8000` 을 실행한 뒤 <http://localhost:8000> 접속
- **배포본** — <https://hinyang313-lgtm.github.io/2601957/>

학습된 가중치(`desktop_version/mnist_cnn.pt`)가 들어 있으므로 **학습 없이 바로 실행된다.**

맥에서는 `py` 를 `python3` 로, `;` 를 `&&` 로 바꿔 쓴다.

## 필요한 것

| 구분 | 설치 |
| --- | --- |
| 데스크톱 앱 실행 | `pip install torch pillow numpy` |
| 다시 학습까지 | `pip install torch torchvision pillow numpy` |
| 웹 앱 실행 | **없다.** 외부 라이브러리를 쓰지 않는다 |

`tkinter` 는 python.org 에서 받은 파이썬에 함께 들어 있다. 리눅스에서는 `python3-tk` 를
따로 깔아야 한다. `torch` 를 설치한다고 `pillow` 가 함께 설치되지는 않으므로 데스크톱
앱만 실행할 때도 `pillow` 를 따로 깔아야 한다.

## 다시 학습하기

`cd desktop_version; py train.py` 를 실행한다. 기본 12 에포크이고 **CPU 기준 7~10분
걸린다**(코어 4개 실측: 에포크당 약 35초). 에포크(epoch)는 학습 데이터 6만 장 전체를 한 번
훑는 단위이다. 뒤에 숫자를 붙이면 에포크 수를 바꿀 수 있다(`py train.py 5`).

MNIST 원본은 용량 때문에 저장소에 없고, `train.py` 를 처음 실행할 때 자동으로 내려받는다.

학습을 다시 했으면 웹 버전이 쓰는 가중치도 다시 내보내야 한다.

```
cd desktop_version
py 가중치내보내기.py        # web_version/가중치.bin, 가중치정보.json
py 검증데이터만들기.py      # web_version/검증데이터.json (깃에 넣지 않는다)
```

## 폴더

| 폴더 | 무엇 | 추론 위치 |
| --- | --- | --- |
| `desktop_version/` | 파이토치 + Tkinter 데스크톱 앱 | 파이썬(파이토치) |
| `web_version/` | 순수 자바스크립트 웹 앱 | 브라우저 안 |

웹 버전은 ONNX 같은 공용 형식을 쓰지 않는다. 파이토치 가중치를 `가중치.bin`으로 내보내고
순전파를 자바스크립트로 다시 구현했다. 외부 라이브러리가 하나도 없고 빌드 단계도 없다.

## 실측

| 항목 | 기준 | 실측 |
| --- | --- | --- |
| 파라미터 수 | — | 421,642개 |
| 파이토치 시험 정확도 | — | 99.45% |
| 자바스크립트 순전파 일치 | 최대 절대차 1e-4 이하 | 2.05e-7 |
| 자바스크립트 전체 정확도 | 200장 중 97% 이상 | 100.0% |
| 브라우저에서 직접 그려 인식 | — | 50/50 (0~9를 5가지 크기와 위치로) |

검증 방법은 `web_version/CLAUDE.md` 의 「검증 절차」 절에 있다.

## 더 볼 것

자세한 내용은 [CLAUDE.md](CLAUDE.md) 를 참고한다.
[desktop_version/CLAUDE.md](desktop_version/CLAUDE.md) 와
[web_version/CLAUDE.md](web_version/CLAUDE.md) 에 각 폴더의 규칙이 있다.
