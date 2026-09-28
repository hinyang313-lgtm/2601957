"""mnist_cnn.pt를 웹 버전이 읽을 수 있는 두 파일로 내보낸다.

ONNX 같은 공용 형식을 쓰지 않는다. 웹 버전은 외부 라이브러리 없이 순수
자바스크립트로 순전파를 다시 구현하므로, 숫자만 있으면 된다.

만들어지는 파일 (web_version/에 저장)
    가중치.bin      : 텐서 8개의 값을 정해진 순서로 float32(리틀 엔디언)로 이어 붙인 것
    가중치정보.json : 텐서별 이름/형상/시작 위치/개수, 그리고 정규화 상수 2개

실행:
    cd desktop_version
    python3 가중치내보내기.py
"""

import json
import os

import numpy as np
import torch

from model import 손글씨분류기, 파라미터수
from preprocess import 정규화_평균, 정규화_표준편차

이폴더 = os.path.dirname(os.path.abspath(__file__))
가중치경로 = os.path.join(이폴더, "mnist_cnn.pt")
웹폴더 = os.path.join(os.path.dirname(이폴더), "web_version")
이진파일경로 = os.path.join(웹폴더, "가중치.bin")
정보파일경로 = os.path.join(웹폴더, "가중치정보.json")

# 자바스크립트가 이 순서 그대로 읽는다. 순서를 바꾸면 모델.js도 함께 바꿔야 한다.
텐서순서 = [
    "합성곱1.weight",
    "합성곱1.bias",
    "합성곱2.weight",
    "합성곱2.bias",
    "전결합1.weight",
    "전결합1.bias",
    "전결합2.weight",
    "전결합2.bias",
]


def main():
    if not os.path.exists(가중치경로):
        raise FileNotFoundError(
            f"{가중치경로} 가 없습니다. 먼저 python3 train.py 를 실행하세요."
        )
    os.makedirs(웹폴더, exist_ok=True)

    모델 = 손글씨분류기()
    상태 = torch.load(가중치경로, map_location="cpu")
    모델.load_state_dict(상태)  # 이름과 형상이 맞는지 확인하는 의미도 있다
    모델.eval()

    빠진것 = [이름 for 이름 in 텐서순서 if 이름 not in 상태]
    남은것 = [이름 for 이름 in 상태 if 이름 not in 텐서순서]
    if 빠진것 or 남은것:
        raise ValueError(f"텐서 목록이 맞지 않습니다. 빠짐={빠진것} 남음={남은것}")

    조각들 = []
    정보 = []
    시작 = 0
    for 이름 in 텐서순서:
        값 = 상태[이름].detach().cpu().numpy().astype("<f4", copy=False)
        평평한값 = np.ascontiguousarray(값).reshape(-1)
        조각들.append(평평한값)
        정보.append(
            {
                "이름": 이름,
                "형상": list(값.shape),
                "시작": 시작,
                "개수": int(평평한값.size),
            }
        )
        시작 += int(평평한값.size)

    전체 = np.concatenate(조각들).astype("<f4", copy=False)
    with open(이진파일경로, "wb") as 파일:
        파일.write(전체.tobytes())

    정보파일 = {
        "설명": "web_version/모델.js가 가중치.bin을 읽을 때 쓰는 정보",
        "만든이": "desktop_version/가중치내보내기.py",
        "자료형": "float32-little-endian",
        "총파라미터수": 시작,
        "정규화": {"평균": 정규화_평균, "표준편차": 정규화_표준편차},
        "텐서": 정보,
    }
    with open(정보파일경로, "w", encoding="utf-8") as 파일:
        json.dump(정보파일, 파일, ensure_ascii=False, indent=2)
        파일.write("\n")

    바이트수 = os.path.getsize(이진파일경로)
    print(f"{이진파일경로}  {바이트수:,} 바이트")
    print(f"{정보파일경로}  텐서 {len(정보)}개")
    print(f"파라미터 수: {시작:,} (모델 정의: {파라미터수(모델):,})")
    assert 바이트수 == 시작 * 4, "바이트 수가 파라미터 수의 4배가 아닙니다"
    assert 시작 == 파라미터수(모델), "내보낸 파라미터 수가 모델과 다릅니다"
    print("확인 완료")


if __name__ == "__main__":
    main()
