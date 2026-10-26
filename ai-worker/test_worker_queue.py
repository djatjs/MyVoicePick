import os
os.environ.setdefault('AWS_DEFAULT_REGION', 'ap-northeast-2')

import unittest
from datetime import datetime
from unittest.mock import patch

from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker

import main
from database import Base
from models import AnalysisTask


@compiles(BigInteger, 'sqlite')
def sqlite_bigint(type_, compiler, **kw):
    return 'INTEGER'


RESULT = {'matched_song_id': 7, 'similarity_score': 80, 'pitch_hz': 220, 'recommend_reason': 'r',
          'voice_tags': [], 'vocal_persona': '', 'vocal_stats': {}, 'pro_features': {}}


class QueueMessageTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine('sqlite://')
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine)
        patcher = patch.object(main, 'SessionLocal', self.Session)
        patcher.start()
        self.addCleanup(patcher.stop)

    def add(self, uuid, status):
        db = self.Session()
        db.add(AnalysisTask(task_uuid=uuid, user_id=1, s3_file_url='k', status=status, created_at=datetime.now()))
        db.commit()
        db.close()

    def get(self, uuid):
        db = self.Session()
        task = db.query(AnalysisTask).filter_by(task_uuid=uuid).one()
        db.close()
        return task

    def test_pending_task_records_start_and_completes(self):
        self.add('p', 'PENDING')
        with patch.object(main.AnalysisService, 'process_audio', return_value=RESULT) as analyze:
            main.process_queue_message({'taskId': 'p', 's3Key': 'k'})
        analyze.assert_called_once()
        task = self.get('p')
        self.assertEqual(task.status, 'COMPLETED')
        self.assertIsNotNone(task.started_at)

    def test_task_failed_while_waiting_is_not_analysed(self):
        self.add('f', 'FAILED')
        with patch.object(main.AnalysisService, 'process_audio') as analyze:
            main.process_queue_message({'taskId': 'f', 's3Key': 'k'})
        analyze.assert_not_called()
        self.assertEqual(self.get('f').status, 'FAILED')


if __name__ == '__main__':
    unittest.main()
