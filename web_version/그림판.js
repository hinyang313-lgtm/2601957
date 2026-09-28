// 브라우저 그림판. 마우스와 손가락(터치), 펜을 모두 받는다.
//
// desktop_version/app.py의 Tkinter 그림판과 같은 규격이다.
//   - 캔버스 280x280, 검은 바탕에 흰 획
//   - 펜 굵기 20, 끝과 이음새는 둥글게
// 규격이 같아야 두 버전이 같은 그림을 보고 같은 답을 낸다.
//
// 화면에 보이는 크기는 CSS가 정하지만, 캔버스 내부 해상도는 언제나 280x280으로
// 둔다. 화면이 커지거나 고해상도라고 해서 해상도를 늘리면 펜 굵기와 숫자 크기의
// 비율이 달라져 데스크톱 버전과 결과가 어긋난다.

export const 기본_캔버스크기 = 280;
export const 기본_펜굵기 = 20;

export class 그림판 {
  constructor(캔버스, 설정 = {}) {
    this.캔버스 = 캔버스;
    this.크기 = 설정.크기 ?? 기본_캔버스크기;
    this.펜굵기 = 설정.펜굵기 ?? 기본_펜굵기;
    this.그린뒤 = 설정.그린뒤 ?? null;

    캔버스.width = this.크기;
    캔버스.height = this.크기;
    this.그리기 = 캔버스.getContext("2d", { willReadFrequently: true });
    this.그리기.lineCap = "round";
    this.그리기.lineJoin = "round";
    this.그리기.lineWidth = this.펜굵기;
    this.그리기.strokeStyle = "#ffffff";
    this.그리기.fillStyle = "#ffffff";

    this.그리는중 = false;
    this.이전점 = null;
    this.뭔가그렸다 = false;

    캔버스.style.touchAction = "none"; // 손가락으로 그릴 때 화면이 따라 움직이지 않게
    캔버스.addEventListener("pointerdown", (사건) => this.누름(사건));
    캔버스.addEventListener("pointermove", (사건) => this.움직임(사건));
    캔버스.addEventListener("pointerup", (사건) => this.뗌(사건));
    캔버스.addEventListener("pointercancel", (사건) => this.뗌(사건));
    캔버스.addEventListener("pointerleave", (사건) => this.뗌(사건));

    this.지우기();
  }

  // 화면 좌표를 캔버스 내부 좌표(0~280)로 바꾼다.
  좌표(사건) {
    const 틀 = this.캔버스.getBoundingClientRect();
    return {
      가로: ((사건.clientX - 틀.left) / 틀.width) * this.크기,
      세로: ((사건.clientY - 틀.top) / 틀.height) * this.크기,
    };
  }

  누름(사건) {
    사건.preventDefault();
    if (this.캔버스.setPointerCapture) {
      try {
        this.캔버스.setPointerCapture(사건.pointerId);
      } catch {
        // 붙잡기를 못 해도 그리기는 된다
      }
    }
    this.그리는중 = true;
    const 점 = this.좌표(사건);
    this.이전점 = 점;
    this.뭔가그렸다 = true;
    // 점 하나만 찍어도 보이도록 원을 그린다 (Tkinter 쪽과 같은 동작).
    this.그리기.beginPath();
    this.그리기.arc(점.가로, 점.세로, this.펜굵기 / 2, 0, Math.PI * 2);
    this.그리기.fill();
  }

  움직임(사건) {
    if (!this.그리는중) return;
    사건.preventDefault();
    const 점 = this.좌표(사건);
    this.그리기.beginPath();
    this.그리기.moveTo(this.이전점.가로, this.이전점.세로);
    this.그리기.lineTo(점.가로, 점.세로);
    this.그리기.stroke();
    this.이전점 = 점;
  }

  뗌(사건) {
    if (!this.그리는중) return;
    사건.preventDefault();
    this.그리는중 = false;
    this.이전점 = null;
    if (this.그린뒤) this.그린뒤();
  }

  지우기() {
    this.그리기.save();
    this.그리기.fillStyle = "#000000";
    this.그리기.fillRect(0, 0, this.크기, this.크기);
    this.그리기.restore();
    this.뭔가그렸다 = false;
  }

  비었는가() {
    return !this.뭔가그렸다;
  }

  // 전처리.js가 받는 {폭, 높이, 값} 꼴로 밝기를 읽어 온다.
  // 바탕을 불투명한 검정으로 칠했으므로 빨강 채널이 곧 밝기다.
  밝기배열() {
    const 그림자료 = this.그리기.getImageData(0, 0, this.크기, this.크기);
    const 값 = new Float32Array(this.크기 * this.크기);
    for (let 자리 = 0; 자리 < 값.length; 자리 += 1) {
      값[자리] = 그림자료.data[자리 * 4];
    }
    return { 폭: this.크기, 높이: this.크기, 값 };
  }
}
