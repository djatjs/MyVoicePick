# 로컬 오디오 선곡 분석 v2

DB/AWS에 연결하지 않는 실험 도구다. 기존 Python 워커 의존성을 사용한다.

```powershell
$env:PYTHONUTF8='1'
$env:GEMINI_API_KEY='발급받은 키'
ai-worker/venv/Scripts/python.exe ai-worker/local_analysis.py 'C:\audio\recording.mp3'
```

키는 ai-worker/.env에서도 읽는다. 로그/리포트에 키는 저장하지 않는다.
개인 녹음의 외부 전송 동의를 받은 뒤 사용해야 한다.

## 처리

1. 전체 입력을 Demucs htdemucs(shifts=0)로 분리하고 원본 SHA-256 기반 폴더에 캐시한다.
2. 분리 보컬의 활동 프레임(RMS 최대 대비 -35dB 초과)이 가장 많은 45초 창을 선택한다.
   동률이면 먼저 나온 창을 사용한다. 이 선택이 가장 대표적인 창이라는 뜻은 아니다.
3. 선택한 분리 보컬을 pYIN 한 번으로 측정한다. 신뢰도 0.3 이상 프레임을 사용한다.
4. 같은 시간대의 원본을 16kHz 모노 WAV로 Gemini에 보내 맥락을 유지한다.
   전체 음원·파일명·사용자 신원은 전송하지 않는다. 선택 구간에 있는 반주/다른 목소리는 전송에 포함된다.
5. 같은 모델·프롬프트·원본 구간으로 기본 3회 실행한다.

`--start 17 --seconds 45`는 자동 선택을 수동으로 덮어쓴다.
`--offline`은 외부 전송 없이 분리·선택·측정·HTML 생성만 실행한다.
`--repeats 1`은 단일 실행이다. `--model`로 다른 오디오 모델을 비교할 수 있다.
`--vocals '.../vocals.wav'`로 기존 전체 길이의 Demucs 출력을 재사용할 수 있다.
원본과 같은 파일에서 생성된 스템이어야 하며 길이를 검증한다. 잘린 보컬은 사용할 수 없다.

## 결과

`tmp/audio-analysis/<실행시각>/report.html`과 report.json을 생성한다.
HTML은 분석한 원본 구간 오디오를 내장하므로 공유할 때 개인정보에 주의한다.
캐시와 리포트는 Git에서 무시되는 tmp 아래에 보관한다.

- 고정 항목: brightness/breathiness/roughness/thickness=low/medium/high/unknown,
  intensity=soft/medium/strong/unknown, vibrato_use=none/occasional/frequent/unknown,
  delivery=plain/emotional/rhythmic/powerful/mixed/unknown.
- 각 항목에 confidence를 받는다. 이는 모델의 주관적 확신이지 검증된 확률이 아니다.
- observations에 실제 초 단위 근거 구간을 유지한다. 시간 범위 검증은 내용의 사실성을 보장하지 않는다.
- 사용자/곡 구분 없이 동일한 스키마와 프롬프트를 사용한다.
- 모델·프롬프트/스키마 해시·분석 버전·토큰 사용량·API 시간·각 회차 결과를 기록한다.
- 항목별 모든 회차 쌍의 값 일치율을 계산한다. 3회면 세 쌍이다.
  unknown을 포함한 일치율과 unknown이 아닌 쌍의 일치율, unknown 개수를 따로 기록한다.
- 일부 API 호출 실패는 실패 회차로 기록한다. 비교 가능한 성공 결과가 2개 미만이면 일치율은 null이다.
  요청한 모든 회차가 성공한 것이 아니면 종료 코드 1이다.
- 모델의 음역 수치 주장을 p10~p90과 대조해 어긋나면 conflict로 표시한다(2반음 실험 허용값).
  '저음이 좋다'처럼 정량 대조 불가능한 주장은 unverifiable로 표시하고 측정값을 함께 보여준다.
  편함·매력을 숫자로 입증하거나 성별별 절대 음역 경계를 임의로 만들지 않는다.

voiced_ratio는 보컬 활동 프레임 기준이다. 전체 길이 기준 값도 full_frame_voiced_ratio로 보관한다.
활동 자체가 적은 녹음과 활동 대비 F0 검출이 적은 녹음을 구분할 수 있다.
RMS 활동 검출은 실제 노래 구간의 정답 검출기가 아니다. 전주·반주 잔여음·잔향의 영향을 받는다.

원본에서 직접 측정하던 v1의 비율과 v2의 비율은 분모/전처리가 달라 직접 비교하면 안 된다.
임베딩·추천 순위·키 제안·운영 연결은 아직 포함하지 않는다.

## 테스트

```powershell
ai-worker/venv/Scripts/python.exe -m unittest discover -s ai-worker -p 'test_*.py'
```

합성 음원, 무음/활동 구간 분모, 자동 창 선택, 항목 검증, 반복 일치율, 음역 충돌,
HTML 이스케이프, 출처 중복 방지, pYIN 1회 실행을 검증한다.
