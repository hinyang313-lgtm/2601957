// 순수 자바스크립트 순전파.
//
// desktop_version/model.py의 층 구성을 그대로 다시 구현한 것이다. 외부 라이브러리를
// 쓰지 않는다. 드롭아웃은 예측할 때 아무 일도 하지 않으므로 생략했다.
//
//   입력 (1, 28, 28)
//   → 합성곱1 3x3 패딩1, 32채널 → ReLU → 최대풀링 2x2   (32, 14, 14)
//   → 합성곱2 3x3 패딩1, 64채널 → ReLU → 최대풀링 2x2   (64, 7, 7)
//   → 펼치기 3136 → 전결합1 128 → ReLU
//   → 전결합2 10 → 소프트맥스
//
// 가중치는 desktop_version/가중치내보내기.py가 만든 가중치.bin(float32 리틀 엔디언)과
// 가중치정보.json에서 읽는다. 텐서 순서는 두 파일이 정한 순서를 그대로 따른다.

const 텐서순서 = [
  "합성곱1.weight",
  "합성곱1.bias",
  "합성곱2.weight",
  "합성곱2.bias",
  "전결합1.weight",
  "전결합1.bias",
  "전결합2.weight",
  "전결합2.bias",
];

export class 손글씨모델 {
  constructor(가중치들, 정규화상수) {
    this.가중치 = 가중치들;
    this.정규화 = 정규화상수;
  }

  // 정규화까지 끝난 784개 값을 받아 확률 10개를 낸다.
  예측(입력784) {
    if (입력784.length !== 28 * 28) {
      throw new Error(`입력 크기가 784가 아닙니다: ${입력784.length}`);
    }
    const ㄱ = 합성곱(입력784, 28, 28, 1, this.가중치["합성곱1.weight"], this.가중치["합성곱1.bias"], 32, 3, 1);
    렐루(ㄱ);
    const ㄴ = 최대풀링(ㄱ, 28, 28, 32, 2);
    const ㄷ = 합성곱(ㄴ, 14, 14, 32, this.가중치["합성곱2.weight"], this.가중치["합성곱2.bias"], 64, 3, 1);
    렐루(ㄷ);
    const ㄹ = 최대풀링(ㄷ, 14, 14, 64, 2);
    const ㅁ = 전결합(ㄹ, this.가중치["전결합1.weight"], this.가중치["전결합1.bias"], 3136, 128);
    렐루(ㅁ);
    const ㅂ = 전결합(ㅁ, this.가중치["전결합2.weight"], this.가중치["전결합2.bias"], 128, 10);
    return 소프트맥스(ㅂ);
  }
}

// 합성곱. 가중치는 [출력채널][입력채널][세로][가로] 순서로 이어져 있다.
function 합성곱(입력, 높이, 폭, 입력채널수, 가중치, 편향, 출력채널수, 커널, 패딩) {
  const 출력 = new Float32Array(출력채널수 * 높이 * 폭);
  const 채널크기 = 높이 * 폭;
  for (let 출채널 = 0; 출채널 < 출력채널수; 출채널 += 1) {
    const 기본값 = 편향[출채널];
    for (let 세로 = 0; 세로 < 높이; 세로 += 1) {
      for (let 가로 = 0; 가로 < 폭; 가로 += 1) {
        let 합 = 기본값;
        for (let 입채널 = 0; 입채널 < 입력채널수; 입채널 += 1) {
          const 가중치시작 = ((출채널 * 입력채널수 + 입채널) * 커널) * 커널;
          const 입력시작 = 입채널 * 채널크기;
          for (let 커널세로 = 0; 커널세로 < 커널; 커널세로 += 1) {
            const 볼세로 = 세로 + 커널세로 - 패딩;
            if (볼세로 < 0 || 볼세로 >= 높이) continue;
            for (let 커널가로 = 0; 커널가로 < 커널; 커널가로 += 1) {
              const 볼가로 = 가로 + 커널가로 - 패딩;
              if (볼가로 < 0 || 볼가로 >= 폭) continue;
              합 +=
                입력[입력시작 + 볼세로 * 폭 + 볼가로] *
                가중치[가중치시작 + 커널세로 * 커널 + 커널가로];
            }
          }
        }
        출력[출채널 * 채널크기 + 세로 * 폭 + 가로] = 합;
      }
    }
  }
  return 출력;
}

function 렐루(값들) {
  for (let 자리 = 0; 자리 < 값들.length; 자리 += 1) {
    if (값들[자리] < 0) 값들[자리] = 0;
  }
}

function 최대풀링(입력, 높이, 폭, 채널수, 크기) {
  const 새높이 = Math.floor(높이 / 크기);
  const 새폭 = Math.floor(폭 / 크기);
  const 출력 = new Float32Array(채널수 * 새높이 * 새폭);
  for (let 채널 = 0; 채널 < 채널수; 채널 += 1) {
    const 입력시작 = 채널 * 높이 * 폭;
    const 출력시작 = 채널 * 새높이 * 새폭;
    for (let 세로 = 0; 세로 < 새높이; 세로 += 1) {
      for (let 가로 = 0; 가로 < 새폭; 가로 += 1) {
        let 최대 = -Infinity;
        for (let 안세로 = 0; 안세로 < 크기; 안세로 += 1) {
          for (let 안가로 = 0; 안가로 < 크기; 안가로 += 1) {
            const 값 = 입력[입력시작 + (세로 * 크기 + 안세로) * 폭 + (가로 * 크기 + 안가로)];
            if (값 > 최대) 최대 = 값;
          }
        }
        출력[출력시작 + 세로 * 새폭 + 가로] = 최대;
      }
    }
  }
  return 출력;
}

// 전결합. 가중치는 [출력][입력] 순서이다.
function 전결합(입력, 가중치, 편향, 입력수, 출력수) {
  const 출력 = new Float32Array(출력수);
  for (let 출자리 = 0; 출자리 < 출력수; 출자리 += 1) {
    let 합 = 편향[출자리];
    const 줄시작 = 출자리 * 입력수;
    for (let 입자리 = 0; 입자리 < 입력수; 입자리 += 1) {
      합 += 입력[입자리] * 가중치[줄시작 + 입자리];
    }
    출력[출자리] = 합;
  }
  return 출력;
}

// 소프트맥스. Math.max(...점수)로 펼치지 않는다. 원소가 많아지면 인수 개수 한계에
// 걸려 터지기 때문이다.
export function 소프트맥스(점수) {
  let 최대 = -Infinity;
  for (let 자리 = 0; 자리 < 점수.length; 자리 += 1) {
    if (점수[자리] > 최대) 최대 = 점수[자리];
  }
  let 합 = 0;
  const 결과 = new Float64Array(점수.length);
  for (let 자리 = 0; 자리 < 점수.length; 자리 += 1) {
    결과[자리] = Math.exp(점수[자리] - 최대);
    합 += 결과[자리];
  }
  for (let 자리 = 0; 자리 < 점수.length; 자리 += 1) {
    결과[자리] /= 합;
  }
  return 결과;
}

// 가중치정보.json과 가중치.bin을 읽어 모델을 만든다.
export async function 모델불러오기(폴더 = ".") {
  const 정보응답 = await fetch(`${폴더}/가중치정보.json`);
  if (!정보응답.ok) {
    throw new Error(`가중치정보.json을 읽지 못했습니다 (HTTP ${정보응답.status})`);
  }
  const 정보 = await 정보응답.json();

  const 이진응답 = await fetch(`${폴더}/가중치.bin`);
  if (!이진응답.ok) {
    throw new Error(`가중치.bin을 읽지 못했습니다 (HTTP ${이진응답.status})`);
  }
  const 버퍼 = await 이진응답.arrayBuffer();

  // new Float32Array(버퍼)는 길이가 4의 배수가 아니면 네이티브 RangeError를 던진다.
  // 무슨 일인지 알아볼 수 있는 메시지로 바꿔 준다.
  if (버퍼.byteLength % 4 !== 0) {
    throw new Error(
      `가중치.bin 크기가 4의 배수가 아닙니다 (${버퍼.byteLength} 바이트). 파일이 깨졌을 수 있습니다.`
    );
  }
  const 전체 = new Float32Array(버퍼);

  if (전체.length !== 정보.총파라미터수) {
    throw new Error(
      `가중치 개수가 맞지 않습니다: 파일 ${전체.length}개, 정보 ${정보.총파라미터수}개`
    );
  }

  const 가중치들 = {};
  for (const 텐서 of 정보.텐서) {
    if (텐서.시작 + 텐서.개수 > 전체.length) {
      throw new Error(`${텐서.이름}이 파일 범위를 넘습니다`);
    }
    가중치들[텐서.이름] = 전체.subarray(텐서.시작, 텐서.시작 + 텐서.개수);
  }
  for (const 이름 of 텐서순서) {
    if (!(이름 in 가중치들)) throw new Error(`텐서 ${이름}이 없습니다`);
  }

  return new 손글씨모델(가중치들, {
    평균: 정보.정규화.평균,
    표준편차: 정보.정규화.표준편차,
  });
}
