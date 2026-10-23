# 곡 데이터 1단계

목적: 내 목소리로 다음에 부를 곡을 고르기 위한 참조곡 데이터 확보.
추천 순위, 사용자 분석 결과, 요금제는 이번 단계에서 변경하지 않는다.

## 스키마 적용

Java Song과 Python Song 모델을 함께 확장했다. 기존 컬럼과 행은 유지한다.
개발 환경은 기존 Hibernate `ddl-auto: update`로 서버 시작 시 컬럼을 추가한다.
운영 환경은 DB 백업 후 아래 SQL을 별도로 적용한다. 이미 컬럼이 추가된 DB에는 중복 실행하지 않는다.

```sql
ALTER TABLE songs
  ADD COLUMN genre VARCHAR(100) NULL,
  ADD COLUMN source_track_id VARCHAR(100) NULL,
  ADD COLUMN source_track_title VARCHAR(255) NULL,
  ADD COLUMN source_track_url VARCHAR(500) NULL,
  ADD COLUMN analysis_profile TEXT NULL,
  ADD COLUMN editorial_notes TEXT NULL;
```

기존 Python 수집기가 사용하던 `pitch` 컬럼은 Java에도 매핑했다.
기존 DB에 pitch가 없다면 `ALTER TABLE songs ADD COLUMN pitch DOUBLE NULL;`도 필요하다.

## 수집과 재분석

기존 환경 변수와 의존성을 사용한다. 프로젝트 루트에서 실행:

```powershell
ai-worker/venv/Scripts/python.exe ai-worker/data_collector.py --limit 20 --batch-size 4
ai-worker/venv/Scripts/python.exe ai-worker/data_collector.py --reanalyze --limit 20 --batch-size 4
```

`--reanalyze`는 이번에 수집한 대상 목록의 기존 완료 곡도 다시 처리한다.
limit은 실제 처리 대상 수에 적용된다. 재실행하면 앞의 같은 곡도 다시 처리될 수 있다.
실패한 재분석은 기존 DB 결과를 유지한다. 곡별 성공 시 평균 pitch/MFCC와 새 분석 정보를 함께 갱신한다.
수동 해설인 editorial_notes는 수집기가 덮어쓰지 않는다.

- genre: 멜론 수집 분류. 여러 분류에 나타난 곡은 처음 발견한 분류를 저장하며, 인디 등 시장 분류도 포함한다.
- source_track_id/title/url: 실제 선택한 iTunes 트랙의 식별자·원문 제목·페이지. 버전 확인에 사용한다.
- analysis_profile: JSON. source=itunes, scope=preview, feature_version=song-v1, UTC 분석 시각을 기록한다.
- source_offset_seconds: 원곡 내 미리듣기 시작 위치는 알 수 없어 null이다.
- duration_seconds: 분석한 미리듣기 보컬 파일의 길이.
- pitch_midi_p10/p50/p90: 유효 F0의 MIDI 음높이 분위수. 전체곡 최저·최고음이나 사용자 편한 음역을 뜻하지 않는다.
- voiced_ratio: 전체 분석 프레임 중 유효 F0 프레임의 비율.
- pitched_seconds / longest_voiced_seconds: 유효 F0 프레임의 누적/최장 연속 시간. 호흡 능력이나 지속 고음 점수가 아니다.

F0 통계는 무음을 연결하지 않은 보컬 신호에서 계산한다. 프레임 길이 단위 추정이며
반주 잔여음·피치 추출 오류의 영향을 받는다. 유효 F0가 10초 미만이면 저장하지 않는다.
기존 사용자 분석과 MFCC 추출 방식은 유지하며 추가 통계는 수집 시에만 계산한다.

## 해설 작성과 20곡 검토

editorial_notes는 검토 전 null로 둔다. 검토한 경우 다음 구조로 작성한다:

```json
{"reviewed":true,"moods":["밝은"],"highlights":"확인한 곡의 매력", "challenges":"확인한 도전 요소", "arrangement_ideas":["근거가 있는 접근법"],"review_scope":"preview","reviewed_by":"검토자","reviewed_at":"ISO 날짜"}
```

분석하지 않은 전체곡의 구간·난이도는 작성하지 않는다. 가수 전체 특징은 이번 테이블의 곡 해설과 별도로 후속 단계에서 다룬다.
이 문서의 예시 값은 실제 곡 평가 데이터가 아니다.

초기 10~20곡은 장르가 섞이도록 수집한 뒤 다음을 사람이 확인한다:

1. 원곡과 선택한 iTunes 트랙의 가수·버전 일치 여부.
2. 실제 보컬 존재와 미리듣기 분석 범위.
3. 음높이 분위수와 실제 들리는 음역의 큰 불일치 여부.
4. 편곡·도전 요소 해설의 근거와 검토 범위.

실제 음원을 듣고 검토하기 전에는 분석 완료를 추천 품질 검증 완료로 취급하지 않는다.
