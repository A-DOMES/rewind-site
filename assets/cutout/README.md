# 사진 오려내기 (브라우저 안에서 처리)

사진은 서버로 보내지 않고 이 기기에서만 처리한다.

- `ort.wasm.min.js`, `ort-wasm-simd-threaded.wasm/.mjs` : ONNX Runtime Web 1.22.0 (MIT, Microsoft)
- `silueta.onnx` : U²-Net 경량판 (rembg 배포본, Apache-2.0). 입력 320×320, 출력 첫 번째 = 대상 마스크
- 실행 코드: `../thumb-cutout.js`

모델을 바꾸려면 `thumb-cutout.js` 의 `모델` 상수(파일 이름·입력 크기·정규화 값)를 같이 고친다.
