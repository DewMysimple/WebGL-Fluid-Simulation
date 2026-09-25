"""Regression coverage for table-safe Obsidian links in the generated MOC."""
import tempfile
import unittest
from pathlib import Path

import memory_lint


class MemoryIndexTests(unittest.TestCase):
    def test_table_alias_does_not_change_the_target(self):
        self.assertEqual(
            list(memory_lint.links_in(r"| [[日志/task.md\|Task]] |")),
            ["日志/task.md"],
        )

    def test_generated_index_escapes_wiki_alias(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "日志").mkdir()
            page = memory_lint.Page(
                Path("日志/task.md"),
                {"type": "log", "status": "archived", "kind": "feature", "updated": "2026-09-24", "topic": "test"},
                "# Task\n\n- 目标：Test index\n",
            )
            output = memory_lint.index_logs(root, [page]).read_text(encoding="utf-8")
            self.assertIn(r"[[日志/task.md\|Task]]", output)
            self.assertIn("日志/task.md", list(memory_lint.links_in(output)))


if __name__ == "__main__":
    unittest.main()
