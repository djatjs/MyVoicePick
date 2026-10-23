import unittest
import json
from qwen_probe import parse_traits, compare_traits
from local_analysis import TRAIT_VALUES


class QwenProbeTest(unittest.TestCase):
    def test_fenced_complete_traits_are_validated(self):
        traits = {key: {'value': 'unknown', 'confidence': 'low'} for key in TRAIT_VALUES}
        self.assertEqual(parse_traits('```json\n' + json.dumps({'traits': traits}) + '\n```'), traits)

    def test_invalid_and_incomplete_json_is_not_a_success(self):
        with self.assertRaises(ValueError):
            parse_traits('{"brightness":{"value":"medium","confidence":"high"}}')

    def test_comparison_does_not_guess_unknown_traits(self):
        rows = compare_traits({}, {'brightness': {'value': 'medium', 'confidence': 'high'}})
        self.assertIsNone(rows['brightness']['qwen'])
        self.assertIsNone(rows['brightness']['match'])


if __name__ == '__main__':
    unittest.main()
