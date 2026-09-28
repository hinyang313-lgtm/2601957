"""손글씨 숫자 분류 신경망 정의.

층 구성은 합성곱 2개, 최대풀링 2개, 전결합 2개이며 마지막에 소프트맥스를 붙여
0~9 각 숫자의 확률을 얻는다. 드롭아웃은 학습에서만 동작하고 예측에서는 아무
일도 하지 않으므로, 웹 버전(모델.js)에서는 생략한다.

학습 가능한 파라미터는 421,642개(텐서 8개)이다.
  합성곱1.weight     32 x 1 x 3 x 3   =      288
  합성곱1.bias       32               =       32
  합성곱2.weight     64 x 32 x 3 x 3  =   18,432
  합성곱2.bias       64               =       64
  전결합1.weight     128 x 3136       =  401,408
  전결합1.bias       128              =      128
  전결합2.weight     10 x 128         =    1,280
  전결합2.bias       10               =       10
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class 손글씨분류기(nn.Module):
    """28x28 흑백 손글씨 숫자 하나를 0~9로 분류하는 합성곱 신경망."""

    def __init__(self):
        super().__init__()
        self.합성곱1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.합성곱2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.드롭아웃1 = nn.Dropout(0.25)
        self.전결합1 = nn.Linear(64 * 7 * 7, 128)
        self.드롭아웃2 = nn.Dropout(0.5)
        self.전결합2 = nn.Linear(128, 10)

    def forward(self, 입력):
        """(배치, 1, 28, 28) 정규화된 입력을 받아 (배치, 10) 로짓을 낸다."""
        값 = F.relu(self.합성곱1(입력))       # (배치, 32, 28, 28)
        값 = F.max_pool2d(값, 2)              # (배치, 32, 14, 14)
        값 = F.relu(self.합성곱2(값))         # (배치, 64, 14, 14)
        값 = F.max_pool2d(값, 2)              # (배치, 64, 7, 7)
        값 = self.드롭아웃1(값)
        값 = torch.flatten(값, 1)             # (배치, 3136)
        값 = F.relu(self.전결합1(값))         # (배치, 128)
        값 = self.드롭아웃2(값)
        값 = self.전결합2(값)                 # (배치, 10)
        return 값


def 파라미터수(모델):
    """학습 가능한 파라미터 개수를 센다."""
    return sum(값.numel() for 값 in 모델.parameters() if 값.requires_grad)


if __name__ == "__main__":
    모델 = 손글씨분류기()
    print(모델)
    print("파라미터 수:", 파라미터수(모델))
