# 실제 녹음으로 실행하는 선곡 분석 실험

기존 서비스와 DB를 수정하지 않고 `ai-worker/local_analysis.py`로 실행한다.
Python 워커의 기존 의존성만 사용하며 AWS/S3/Redis/DB에 접속하지 않는다.

## 실행

```powershell
$env:PYTHONUTF8='1'
$env:GEMINI_API_KEY='발급받은 키'
ai-worker/venv/Scripts/python.exe ai-worker/local_analysis.py 'C:\audio\recording.mp3'
```

또는 `ai-worker/.env`의 GEMINI_API_KEY / GOOGLE_API_KEY를 읽는다.
키는 리포트나 로그에 저장하지 않는다. 실제 사용자 녹음을 사용할 때는 외부 전송 동의를 받아야 한다.
기본 모델은 실제 API 모델 목록에서 확인한 `gemini-2.5-flash`이다.
다른 사용 가능한 오디오 입력 모델은 `--model`로 지정할 수 있다.

앞부분 최대 45초를 16kHz 모노 WAV로 변환해 Gemini에 직접 전송한다.
파일명, 사용자 신원, DB 이력은 전송하지 않는다. API 이용료와 제공자의 데이터 처리 조건이 적용된다.
파일 안의 제3자 목소리나 반주도 선택한 구간에 포함되면 같이 전송된다.

```powershell
# 외부 전송 없이 신호 측정과 HTML 생성
ai-worker/venv/Scripts/python.exe ai-worker/local_analysis.py 'C:\audio\recording.mp3' --offline
# 특정 구간만 선택 (최대 60초)
ai-worker/venv/Scripts/python.exe ai-worker/local_analysis.py 'C:\audio\recording.mp3' --start 15 --seconds 30
```

## 결과

`tmp/audio-analysis/<실행시각>/report.html` 및 `report.json`을 생성한다.
HTML에는 분석한 음성이 내장되어 다시 들을 수 있다. 이 파일 자체가 개인 음성을 포함하므로 공유에 주의한다.
출력 폴더는 Git에서 무시되는 tmp 아래에 있다. 각 실행은 별도 폴더를 사용한다.

- 로컬 측정: pYIN 1회, 유효 음높이 분포, 유효 F0 비율, 지속 구간, RMS, 클리핑 비율.
- 모델 분석: 실제 소리에서 관측한 음색·프레이징·표현·녹음 조건과 근거 구간.
- 모델과 프롬프트 버전, 사용 토큰 및 API 처리 시간을 기록한다.
- 시간 범위와 응답 구조를 검증한다. 이는 내용의 사실성을 보장하지 않으며 사람이 들어 확인해야 한다.
- API 실패 시 측정값과 실패 이유를 저장하고 종료 코드 1을 반환한다. 성공처럼 꾸미지 않는다.

이 도구는 원본/반주 포함 녹음도 그대로 분석한다. 분리 전후 효과를 검증하기 전까지 자동 Demucs 처리는 하지 않는다.
반주가 있는 파일에서 측정 F0는 사용자 보컬만의 값이라고 보장할 수 없다.
유효 F0가 없는 파일은 음높이 값을 null로 남긴다. 무음·3초 미만은 거절한다.
모델 confidence는 검증된 확률이 아니다. 미리 정한 F0 확률 임계값 역시 운영 검증 전의 실험값이다.

현재는 목소리 분석의 실제 출력부터 확인하는 단계다. 가창 음색 임베딩·카탈로그 추천·키 제안은 연결하지 않았다.
실제 출력의 정확도를 확인한 뒤 같은 분석 함수를 수집기/사용자 워커에 연결한다.

## 검증

```powershell
ai-worker/venv/Scripts/python.exe -m unittest discover -s ai-worker -p test_local_analysis.py
```

합성 음원의 음높이, 무음 거절, API 요청/응답 처리, 잘못된 근거 시간 거절, HTML 이스케이프를 검증한다.
