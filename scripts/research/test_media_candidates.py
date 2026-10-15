import unittest
from media_candidates import extract_candidates, public_url


class CandidateContract(unittest.TestCase):
    def test_social_image_is_not_a_full_body(self):
        result = extract_candidates('<meta property="og:image" content="/images/head.png">',
                                    'https://www.ufc.com/athlete/example')
        self.assertEqual(result[0]['role'], 'headshot_candidate')
        self.assertTrue(result[0]['reviewRequired'])

    def test_nested_paths_keep_the_exact_hero_filename(self):
        result = extract_candidates('<img class="hero-profile__image" src="/images/styles/athlete_bio_full_body/s3/2025-01/5/POIRIER_DUSTIN_L_06-01.png?itok=abc">',
                                    'https://www.ufc.com/athlete/dustin-poirier')
        self.assertEqual(result[0]['url'].split('?')[-1], 'itok=abc')
        self.assertEqual(result[1]['url'], 'https://www.ufc.com/images/2025-01/5/POIRIER_DUSTIN_L_06-01.png')
        self.assertTrue(result[1]['reviewRequired'])

    def test_unapproved_targets_do_not_become_download_candidates(self):
        for value in ['http://ufc.com/images/a.png', 'https://example.org/a.png',
                      'https://ufc.com@127.0.0.1/a.png', 'data:image/png;base64,AA', 'https://ufc.com:bad/a.png']:
            self.assertIsNone(public_url(value, 'https://www.ufc.com/athlete/example'))

    def test_opponent_headshot_does_not_bind_to_the_page_fighter(self):
        body = '<a href="/athlete/opponent"><img src="/images/styles/event_results_athlete_headshot/s3/head.png"></a>'
        self.assertEqual(extract_candidates(body, 'https://www.ufc.com/athlete/example'), [])

    def test_owned_event_headshot_remains_a_review_candidate(self):
        body = '<a href="/athlete/example"><img src="/images/styles/event_results_athlete_headshot/s3/head.png?itok=a"></a>'
        result = extract_candidates(body, 'https://www.ufc.com/athlete/example')
        self.assertEqual(result[0]['role'], 'headshot_candidate')

    def test_missing_hero_does_not_invent_a_full_body(self):
        self.assertEqual(extract_candidates('<div>No portrait</div>',
                                           'https://www.ufc.com/athlete/example'), [])

    def test_lazy_srcset_keeps_candidate_objects(self):
        result = extract_candidates(
            '<img class="hero-profile__image" data-srcset="/images/styles/body/s3/example.png?itok=a 460w, /images/styles/body/s3/example-large.png?itok=b 920w">',
            'https://www.ufc.com/athlete/example')
        self.assertEqual(len(result), 2)
        self.assertTrue(all(isinstance(candidate, dict) for candidate in result))
        self.assertEqual(result[0]['method'], 'hero_image')
        self.assertEqual(result[1]['url'], 'https://www.ufc.com/images/example.png')


if __name__ == '__main__':
    unittest.main()
