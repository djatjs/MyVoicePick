# 곡 데이터와 자동 분석

목적: 내 목소리로 다음에 부를 곡을 고르기 위한 참조곡 데이터 확보.
추천 순위·화면·요금제는 이번 단계에서 변경하지 않는다.

## 스키마 적용: 명시적 SQL

스키마는 명시적으로 적용하고 서버에서는 `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`를 사용한다.
자동 update에 맡기지 않는다. 아래 SQL은 새 컬럼이 아직 없는 기존 songs 테이블 기준이다.
이미 추가된 컬럼은 다시 추가하지 않는다. 운영 DB에는 이 작업에서 SQL을 실행하지 않았다.

```sql
ALTER TABLE songs
  ADD COLUMN genre VARCHAR(100) NULL,
  ADD COLUMN source_track_id VARCHAR(100) NULL,
  ADD COLUMN source_track_title VARCHAR(255) NULL,
  ADD COLUMN source_track_url VARCHAR(500) NULL,
  ADD COLUMN analysis_profile TEXT NULL;
```

기존 Python 수집기가 사용한 pitch 컬럼은 Java에도 매핑했다.
pitch가 없는 DB에는 `ALTER TABLE songs ADD COLUMN pitch DOUBLE NULL;`도 적용한다.

출처 중복을 먼저 확인한 뒤 유일 인덱스를 적용한다:

```sql
SELECT source_track_id, COUNT(*) FROM songs
WHERE source_track_id IS NOT NULL GROUP BY source_track_id HAVING COUNT(*) > 1;
ALTER TABLE songs ADD CONSTRAINT uq_songs_source_track UNIQUE (source_track_id);
```

중복이 있으면 인덱스 적용 전에 분석 이력의 matched_song_id 참조를 확인해 통합해야 한다.
이 작업에서는 기존 행을 삭제하거나 참조를 바꾸지 않는다.
이전 커밋의 editorial_notes는 모델과 필수 컬럼에서 제거했다. 이미 존재하는 컬럼은 데이터 보존을 위해
자동 삭제하지 않는다. 사용하지 않는 컬럼의 삭제는 별도 DB 작업으로 진행한다.

## 수집과 재분석

```powershell
ai-worker/venv/Scripts/python.exe ai-worker/data_collector.py --limit 20 --batch-size 4
ai-worker/venv/Scripts/python.exe ai-worker/data_collector.py --reanalyze --limit 20 --batch-size 4
```

장르별 수집 목록에는 댄스를 포함한다. 여러 분류에 속한 곡은 최초 발견 분류를 보관한다.
`--reanalyze`는 기존 완료 곡도 다시 분석하며 limit은 처리 대상 수에 적용된다.
반복 실행 시 같은 앞부분 곡을 재분석할 수 있다.

- source_track_id/title/url: 선택한 iTunes 트랙의 식별자·원문 제목·페이지.
- 같은 source_track_id면 제목 표기가 달라도 기존 행을 갱신한다. DB 유일 제약은 동시 중복 삽입을 막는다.
- 같은 제목/가수가 다른 출처 ID로 발견되면 기존 버전을 덮어쓰지 않고 실패 처리한다.
- 분석 실패 시 기존 결과를 유지한다. 성공하면 기존 pitch/MFCC와 새 profile을 함께 갱신한다.
- 수동 해설 저장·관리 기능은 없다.

## song-v2 측정 프로필

Demucs 보컬을 입력받고, 시간축을 보존한 pYIN 한 번의 결과로 평균과 분포를 계산한다.
F0 신뢰도 0.3 이상과 유성 플래그를 사용한다. 활동 구간은 분리 보컬의 RMS 최대 대비 -35dB 초과로 추정한다.
임계값은 실험값이며 반주 잔여음을 실제 가창으로 오인할 수 있다.

- pitch_midi_p10/p50/p90: 관측 F0의 MIDI 음높이 분위수.
- vocal_active_seconds / vocal_activity_ratio: RMS로 추정한 활동 길이 / 전체 길이 비율.
- voiced_ratio: 활동 프레임 중 유효 F0 프레임 비율. 기존 전체 길이 분모와 다르다.
- full_frame_voiced_ratio: 전체 프레임 기준 F0 비율. 비교를 위해 별도 보관한다.
- pitched_seconds / longest_voiced_seconds: 유효 F0 누적 / 최장 연속 시간.
- source=itunes, scope=preview, feature_version=song-v2, analyzed_at=UTC.
- source_offset_seconds=null: 미리듣기의 원곡 내 시작 위치를 알 수 없다.

이 값들은 곡 전체의 최고음·난이도나 편한 음역을 뜻하지 않는다.
기존 값과 v2 값의 비교는 feature_version을 구분한다.

## 다음 검증

동일한 고정 보컬 항목을 포함한 오디오 모델 분석은 `local_analysis.py`로 실행한다.
곡 10~20개에 배치 적용하고 사용자 녹음과 추천 비교하는 작업은 아직 수행하지 않았다.
평가자는 자동 분석의 검증에만 참여하고 카탈로그 해설을 직접 작성하지 않는다.
