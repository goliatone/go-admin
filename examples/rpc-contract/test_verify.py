"""Regression tests for the offline proof's published-provider boundary."""
import unittest

from verify import COMMAND, GENERATOR, require_published_module


class PublishedModuleTests(unittest.TestCase):
    def test_selected_releases_do_not_require_harness_version_updates(self):
        for path, version in [(COMMAND, 'v0.27.1'), (GENERATOR, 'v0.19.1'),
                              (COMMAND, 'v1.0.0')]:
            with self.subTest(path=path, version=version):
                require_published_module({'Path': path, 'Version': version}, path)

    def test_workspace_and_replacement_sources_cannot_claim_publication(self):
        published = {'Path': COMMAND, 'Version': 'v0.27.1'}
        for override in [
            {'Main': True},
            {'Version': ''},
            {'Replace': {'Path': '../go-command'}},
            {'Replace': {'Path': COMMAND, 'Version': 'v0.27.1'}},
            {'Replace': {}},
            {'Path': GENERATOR},
        ]:
            with self.subTest(override=override):
                with self.assertRaisesRegex(RuntimeError, 'requires published'):
                    require_published_module(dict(published, **override), COMMAND)


if __name__ == '__main__':
    unittest.main()
