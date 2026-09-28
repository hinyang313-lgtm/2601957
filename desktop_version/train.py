"""MNIST로 손글씨 분류기를 학습하고 mnist_cnn.pt로 저장한다.

실행은 이 폴더(desktop_version) 안에서 해야 한다. 자료 경로가 상대 경로 "data"라서
다른 폴더에서 실행하면 자료를 새로 받으려 한다.

    cd desktop_version
    python3 train.py

학습 자료에는 약한 어파인 변형(회전, 이동, 확대축소)을 준다. MNIST 시험 자료만
외우지 않고, 사람이 마우스로 그린 삐뚤빼뚤한 숫자도 맞히게 하려는 것이다.
"""

import sys

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from model import 손글씨분류기, 파라미터수
from preprocess import 정규화_평균, 정규화_표준편차

자료폴더 = "data"
저장이름 = "mnist_cnn.pt"
묶음크기 = 128
기본_에포크 = 12


def 자료불러오기():
    """학습용과 시험용 MNIST를 준비한다."""
    학습변형 = transforms.Compose(
        [
            transforms.RandomAffine(
                degrees=10, translate=(0.1, 0.1), scale=(0.9, 1.1), fill=0
            ),
            transforms.ToTensor(),
            transforms.Normalize((정규화_평균,), (정규화_표준편차,)),
        ]
    )
    시험변형 = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize((정규화_평균,), (정규화_표준편차,)),
        ]
    )
    학습자료 = datasets.MNIST(자료폴더, train=True, download=True, transform=학습변형)
    시험자료 = datasets.MNIST(자료폴더, train=False, download=True, transform=시험변형)
    return (
        DataLoader(학습자료, batch_size=묶음크기, shuffle=True),
        DataLoader(시험자료, batch_size=1000, shuffle=False),
    )


def 한에포크학습(모델, 학습적재기, 최적화기, 장치, 에포크):
    모델.train()
    누적손실 = 0.0
    for 번호, (그림, 라벨) in enumerate(학습적재기, start=1):
        그림, 라벨 = 그림.to(장치), 라벨.to(장치)
        최적화기.zero_grad()
        로짓 = 모델(그림)
        손실 = F.cross_entropy(로짓, 라벨)
        손실.backward()
        최적화기.step()
        누적손실 += 손실.item()
        if 번호 % 100 == 0:
            print(f"  에포크 {에포크} 묶음 {번호}/{len(학습적재기)} 손실 {손실.item():.4f}")
    return 누적손실 / len(학습적재기)


def 시험(모델, 시험적재기, 장치):
    모델.eval()
    맞은개수 = 0
    전체개수 = 0
    with torch.no_grad():
        for 그림, 라벨 in 시험적재기:
            그림, 라벨 = 그림.to(장치), 라벨.to(장치)
            예측 = 모델(그림).argmax(dim=1)
            맞은개수 += int((예측 == 라벨).sum())
            전체개수 += 라벨.numel()
    return 맞은개수 / 전체개수


def main():
    에포크수 = int(sys.argv[1]) if len(sys.argv) > 1 else 기본_에포크
    torch.manual_seed(1)
    장치 = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("장치:", 장치)

    학습적재기, 시험적재기 = 자료불러오기()
    모델 = 손글씨분류기().to(장치)
    print("파라미터 수:", 파라미터수(모델))

    최적화기 = torch.optim.Adam(모델.parameters(), lr=1e-3)
    일정 = torch.optim.lr_scheduler.StepLR(최적화기, step_size=4, gamma=0.5)

    최고정확도 = 0.0
    for 에포크 in range(1, 에포크수 + 1):
        평균손실 = 한에포크학습(모델, 학습적재기, 최적화기, 장치, 에포크)
        정확도 = 시험(모델, 시험적재기, 장치)
        일정.step()
        print(f"에포크 {에포크}: 평균 손실 {평균손실:.4f}, 시험 정확도 {정확도 * 100:.2f}%")
        if 정확도 > 최고정확도:
            최고정확도 = 정확도
            torch.save(모델.state_dict(), 저장이름)
            print(f"  → {저장이름} 저장 (지금까지 가장 좋음)")

    print(f"학습 끝. 가장 좋은 시험 정확도 {최고정확도 * 100:.2f}%")


if __name__ == "__main__":
    main()
