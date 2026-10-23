# Qwen2-Audio 로컬 실행 실험 — 2026-10-23

## 결과: GPU 실행 가능, 이번 분석 출력은 사용 불가

4비트 GPU 로드와 1회 추론은 완료됐고 CPU offload나 OOM은 없었다.
그러나 모델이 confidence 없는 문자열 값과 잘못된 brightness 키(bright)를 반환했고,
이스케이프된 따옴표 때문에 JSON 파싱도 실패했다. probe.status=failed는 추론 실패가 아니라
failed_phase=schema_validation을 뜻한다. 임의로 항목명을 고치거나 confidence를 채우지 않았다.

| 측정 | 결과 |
|---|---|
| 모델/processor 로드 | 38.676초 |
| 1회 추론 | 61.913초 / 51토큰 |
| 최대 PyTorch 할당 VRAM | 7.021 GiB |
| 최대 PyTorch 예약 VRAM | 7.473 GiB |
| 로드 전 CUDA 가용 VRAM | 6.751 GiB |

VRAM 수치는 PyTorch allocator 기준이며 다른 앱·드라이버 메모리를 포함하지 않는다.
8GB GPU에서 여유가 적다. 한 번의 첫 실행 시간이며 반복 평균·최적화 결과가 아니다.

| 고정 항목 | 기존 Gemini 3회 | Qwen 원문에서 확인한 응답 |
|---|---|---|
| brightness | medium / medium / medium | 키 bright / unknown, 형식 불일치 |
| breathiness | low / medium / low | unknown 문자열, confidence 없음 |
| roughness | low / low / low | unknown 문자열, confidence 없음 |
| thickness | medium / medium / medium | unknown 문자열, confidence 없음 |
| intensity | medium / medium / medium | unknown 문자열, confidence 없음 |
| vibrato_use | occasional / occasional / frequent | unknown 문자열, confidence 없음 |
| delivery | emotional / emotional / emotional | unknown 문자열, confidence 없음 |

원문에 medium은 없지만 7개 값 모두 unknown이다. 따라서 medium 쏠림 개선이나
사람 같은 가창 해석을 입증하지 못했다. 스키마에 맞는 유효 항목별 비교는 생성하지 않았다.
1회 요청 범위를 지켜 프롬프트 조정 재추론·CPU 실행·유료 API 대체를 하지 않았다.

- [출력 원문](experiments/qwen-2026-10-23-output.txt)
- [실측 기록·전체 프롬프트](experiments/qwen-2026-10-23.json)

## 환경과 범위

- 기존 ai-worker/venv는 변경하지 않았다. 전용 환경: tmp/venv-qwen.
- RTX 5060: 8,151 MiB, compute capability sm_120. 드라이버 581.80.
- PyTorch 2.10.0+cu128에서 cuda.is_available()=True 및 실제 NF4 CUDA 연산을 확인했다.
- transformers 4.57.6, bitsandbytes 0.50.2, accelerate 1.15.0.
- 모델: Qwen/Qwen2-Audio-7B-Instruct 공식 체크포인트, NF4 이중 양자화/FP16 연산.
- CPU 추론·CPU offload·유료 API 호출은 사용하지 않는다.
- 같은 원본의 188.208~233.208초 분리 보컬 45초를 사용한다.
  Qwen 전처리기의 항목당 30초 제한 때문에 30초+15초를 한 요청의 연속 오디오로 입력한다.
- Gemini 기존 결과는 같은 시간의 원본 믹스이며 Qwen은 분리 보컬이다.
  입력 믹스와 프롬프트가 달라 모델 우열을 판단하는 공정한 비교는 아니다.

## 실행

```powershell
python -m venv tmp/venv-qwen
tmp/venv-qwen/Scripts/python.exe -m pip install torch==2.10.0 --index-url https://download.pytorch.org/whl/cu128
tmp/venv-qwen/Scripts/python.exe -m pip install transformers==4.57.6 accelerate==1.15.0 bitsandbytes==0.50.2 librosa soundfile requests python-dotenv
# 아래 vocals.wav는 동일 전체 녹음에서 분리한 파일이어야 한다.
tmp/venv-qwen/Scripts/python.exe ai-worker/qwen_probe.py 'path/to/vocals.wav' --gemini-report 'path/to/report.json' --weights-dir tmp/qwen-weights
```

기존 API 키를 읽거나 음성을 외부로 전송하지 않는다. 공식 모델 파일만 다운로드한다.
프로브 결과는 tmp/qwen-experiment/probe.json에 출력 원문·시간·VRAM·항목 비교와 함께 저장된다.
--weights-dir로 이미 검증한 로컬 체크포인트 폴더를 지정하면 오프라인으로 로드한다.
전체 파일 전송이 정체되어 이번 다운로드는 HTTP 범위 전송 후 크기와 공식 SHA-256을 검증한다.

## 함께 반영한 작은 수정

- 수집 경로 pYIN hop=512 적용. 같은 분리 보컬 45초에서 512는 9.28~9.29초,
  256은 17.53초. p10/p90은 동일, 중앙값은 60.3 vs 60.5 MIDI(0.2반음 차이).
  한 녹음의 실험이므로 다른 곡에서 같은 오차를 보장하지 않는다. 프로필에 hop을 기록한다.
- local_analysis는 전체 보컬 RMS 활동 마스크를 한 번 계산해 선택·측정에 재사용한다.
  vocal_activity/vocal_pitch_profile 및 지정된 보호 함수의 기존 인자·반환 형식을 유지했다.
- summary와 관측의 능력·실력·안정성 등 표현을 미검증 주장으로 표시한다.
- selection_method는 파싱된 args.start 지정 여부로 정한다. --start=188.208도 manual로 확인했다.
- recommend_local.py, test_recommend_local.py, .gitignore는 수정하지 않았다.
