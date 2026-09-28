"""손글씨 인식 데스크톱 앱 (Tkinter).

280x280 그림판에 마우스로 숫자를 그리고 [인식]을 누르면 상위 3개 후보를 보여준다.
그림판은 "검은 바탕에 흰 숫자"이다. MNIST 원본과 같은 형식이라 전처리가 단순해진다.

실행:
    cd desktop_version
    python3 app.py

파일 연결 관계
    app.py --(전처리)--> preprocess.py
    app.py --(신경망 정의)--> model.py --(학습된 가중치)--> mnist_cnn.pt
"""

import os
import sys

import numpy as np
import torch
from PIL import Image, ImageDraw

from model import 손글씨분류기
from preprocess import 모델입력만들기

try:  # 화면이 없는 환경(서버, 검증 스크립트)에서도 그리기 함수만 쓸 수 있게 한다.
    import tkinter as tk
except ImportError:  # pragma: no cover
    tk = None

캔버스크기 = 280
펜굵기 = 20
배경색 = "#000000"
펜색 = "#ffffff"

이폴더 = os.path.dirname(os.path.abspath(__file__))
가중치경로 = os.path.join(이폴더, "mnist_cnn.pt")


def 획그리기(그리기, 점들, 굵기=펜굵기):
    """PIL ImageDraw에 획 하나를 그린다.

    Tkinter 캔버스의 capstyle=ROUND, joinstyle=ROUND와 브라우저 캔버스의
    lineCap='round', lineJoin='round'를 PIL에서 흉내내려고, 선을 그은 뒤 꼭짓점마다
    지름이 굵기인 원을 덧그린다. 검증데이터만들기.py가 이 함수를 가져다 쓴다.
    """
    반지름 = 굵기 / 2.0
    if len(점들) >= 2:
        그리기.line([tuple(점) for 점 in 점들], fill=255, width=굵기, joint="curve")
    for 가로, 세로 in 점들:
        그리기.ellipse(
            [가로 - 반지름, 세로 - 반지름, 가로 + 반지름, 세로 + 반지름], fill=255
        )


def 모델불러오기():
    """학습된 가중치를 얹은 모델을 예측 상태(eval)로 돌려준다."""
    if not os.path.exists(가중치경로):
        raise FileNotFoundError(
            f"{가중치경로} 가 없습니다. 먼저 이 폴더에서 python3 train.py 를 실행하세요."
        )
    모델 = 손글씨분류기()
    모델.load_state_dict(torch.load(가중치경로, map_location="cpu"))
    모델.eval()
    return 모델


def 예측하기(모델, 그림):
    """그림 하나를 넣어 0~9 확률 10개를 얻는다. 빈 그림이면 None."""
    입력 = 모델입력만들기(그림)
    if 입력 is None:
        return None
    with torch.no_grad():
        로짓 = 모델(torch.from_numpy(입력))
        확률 = torch.softmax(로짓, dim=1)[0]
    return 확률.numpy().astype(np.float64)


class 손글씨인식앱:
    """그림판과 인식 결과를 보여주는 창."""

    def __init__(self, 루트, 모델):
        self.루트 = 루트
        self.모델 = 모델
        self.이전점 = None

        루트.title("손글씨 인식")
        루트.resizable(False, False)

        self.캔버스 = tk.Canvas(
            루트,
            width=캔버스크기,
            height=캔버스크기,
            bg=배경색,
            highlightthickness=1,
            highlightbackground="#888888",
        )
        self.캔버스.pack(padx=16, pady=(16, 8))
        self.캔버스.bind("<Button-1>", self.누름)
        self.캔버스.bind("<B1-Motion>", self.끌기)
        self.캔버스.bind("<ButtonRelease-1>", self.뗌)

        단추칸 = tk.Frame(루트)
        단추칸.pack(pady=(0, 8))
        tk.Button(단추칸, text="인식", width=10, command=self.인식).pack(side="left", padx=6)
        tk.Button(단추칸, text="지우기", width=10, command=self.지우기).pack(side="left", padx=6)

        self.결과 = tk.Label(루트, text="숫자를 그리고 [인식]을 누르세요", font=("", 14))
        self.결과.pack(pady=(0, 4))
        self.후보 = tk.Label(루트, text="", font=("", 12), justify="left")
        self.후보.pack(pady=(0, 16))

        # 캔버스와 같은 내용을 PIL 그림으로도 들고 있는다. 전처리는 이 그림을 쓴다.
        self.그림 = Image.new("L", (캔버스크기, 캔버스크기), 0)
        self.그리기 = ImageDraw.Draw(self.그림)

    def 누름(self, 사건):
        self.이전점 = (사건.x, 사건.y)
        획그리기(self.그리기, [self.이전점])
        반지름 = 펜굵기 / 2
        self.캔버스.create_oval(
            사건.x - 반지름,
            사건.y - 반지름,
            사건.x + 반지름,
            사건.y + 반지름,
            fill=펜색,
            outline=펜색,
        )

    def 끌기(self, 사건):
        지금점 = (사건.x, 사건.y)
        if self.이전점 is not None:
            self.캔버스.create_line(
                self.이전점[0],
                self.이전점[1],
                지금점[0],
                지금점[1],
                fill=펜색,
                width=펜굵기,
                capstyle=tk.ROUND,
                joinstyle=tk.ROUND,
                smooth=True,
            )
            획그리기(self.그리기, [self.이전점, 지금점])
        self.이전점 = 지금점

    def 뗌(self, _사건):
        self.이전점 = None

    def 지우기(self):
        self.캔버스.delete("all")
        self.그림 = Image.new("L", (캔버스크기, 캔버스크기), 0)
        self.그리기 = ImageDraw.Draw(self.그림)
        self.결과.config(text="숫자를 그리고 [인식]을 누르세요")
        self.후보.config(text="")

    def 인식(self):
        확률 = 예측하기(self.모델, self.그림)
        if 확률 is None:
            self.결과.config(text="먼저 숫자를 그려 주세요")
            self.후보.config(text="")
            return
        순서 = np.argsort(-확률)[:3]
        으뜸 = int(순서[0])
        self.결과.config(text=f"인식 결과: {으뜸}  ({확률[으뜸] * 100:.1f}%)")
        줄들 = [f"{순위}위  {int(숫자)}   {확률[숫자] * 100:5.1f}%" for 순위, 숫자 in enumerate(순서, start=1)]
        self.후보.config(text="\n".join(줄들))


def main():
    if tk is None:
        print("이 환경에는 tkinter가 없습니다. 데스크톱 앱을 실행할 수 없습니다.")
        return 1
    모델 = 모델불러오기()
    루트 = tk.Tk()
    손글씨인식앱(루트, 모델)
    루트.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
