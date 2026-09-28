// 화면과 추론을 잇는 부분.
//
// 그림판.js로 그림을 받고, 전처리.js로 28x28로 다듬고, 모델.js로 확률을 구해
// 상위 3개 후보를 보여준다. desktop_version/app.py와 기능 범위가 같다.

import { 그림판 } from "./그림판.js";
import { 전처리, 정규화 } from "./전처리.js";
import { 모델불러오기 } from "./모델.js";

const 보일후보수 = 3;

const 요소 = {
  캔버스: document.getElementById("그림판"),
  인식단추: document.getElementById("인식단추"),
  지우기단추: document.getElementById("지우기단추"),
  상태: document.getElementById("상태"),
  으뜸: document.getElementById("으뜸"),
  후보: document.getElementById("후보"),
  모듈안내: document.getElementById("모듈안내"),
};

// 이 파일이 실행되었다는 뜻이므로 file:// 안내는 치운다.
if (요소.모듈안내) 요소.모듈안내.remove();

let 모델 = null;
let 적재중에그렸다 = false;

function 상태알림(글, 나쁨 = false) {
  요소.상태.textContent = 글;
  요소.상태.classList.toggle("나쁨", 나쁨);
}

// 후보 한 줄을 만든다. 채울 값이 없으면 빈 막대만 보여준다.
function 후보줄(이름, 비율) {
  const 줄 = document.createElement("li");

  const 이름칸 = document.createElement("strong");
  이름칸.textContent = 이름;

  const 막대 = document.createElement("div");
  막대.className = "막대";
  const 채움 = document.createElement("span");
  채움.style.width = 비율 === null ? "0%" : `${Math.max(1, 비율)}%`;
  막대.append(채움);

  const 비율칸 = document.createElement("span");
  비율칸.className = "비율";
  비율칸.textContent = 비율 === null ? "" : `${비율.toFixed(1)}%`;

  줄.append(이름칸, 막대, 비율칸);
  return 줄;
}

function 결과지우기() {
  요소.으뜸.textContent = "?";
  요소.후보.innerHTML = "";
  for (let 번호 = 0; 번호 < 보일후보수; 번호 += 1) {
    요소.후보.append(후보줄("-", null));
  }
}

function 결과보이기(확률) {
  const 순서 = Array.from(확률.keys()).sort((가, 나) => 확률[나] - 확률[가]);
  const 으뜸숫자 = 순서[0];
  요소.으뜸.innerHTML = `${으뜸숫자}<span class="비율">${(
    확률[으뜸숫자] * 100
  ).toFixed(1)}%</span>`;

  요소.후보.innerHTML = "";
  for (const 숫자 of 순서.slice(0, 보일후보수)) {
    요소.후보.append(후보줄(String(숫자), 확률[숫자] * 100));
  }
}

function 인식하기() {
  if (모델 === null) {
    // 적재가 끝나면 방금 그린 그림을 바로 인식해 준다.
    적재중에그렸다 = true;
    상태알림("모델을 불러오는 중입니다. 끝나면 바로 인식합니다");
    return;
  }
  const 스물여덟 = 전처리(그림판판.밝기배열());
  if (스물여덟 === null) {
    결과지우기();
    상태알림("먼저 숫자를 그려 주세요");
    return;
  }
  const 확률 = 모델.예측(정규화(스물여덟, 모델.정규화.평균, 모델.정규화.표준편차));
  결과보이기(확률);
  상태알림("그림을 그리면 자동으로 인식합니다.");
}

function 지우기() {
  그림판판.지우기();
  결과지우기();
  상태알림(
    모델 === null ? "모델을 불러오는 중입니다" : "그림을 그리면 자동으로 인식합니다."
  );
}

const 그림판판 = new 그림판(요소.캔버스, { 그린뒤: 인식하기 });

결과지우기();
요소.인식단추.addEventListener("click", 인식하기);
요소.지우기단추.addEventListener("click", 지우기);
요소.인식단추.disabled = true;

모델불러오기(".")
  .then((불러온모델) => {
    모델 = 불러온모델;
    요소.인식단추.disabled = false;
    if (적재중에그렸다 && !그림판판.비었는가()) {
      적재중에그렸다 = false;
      인식하기();
    } else {
      상태알림("그림을 그리면 자동으로 인식합니다.");
    }
  })
  .catch((잘못) => {
    console.error(잘못);
    상태알림(`모델을 불러오지 못했습니다. ${잘못.message}`, true);
  });
