"""Run with python3 -m unittest discover -s tests -p 'test_*.py'."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location("gmdss", Path(__file__).resolve().parents[1] / "scripts/import_gmdss_questions.py")
gmdss = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gmdss)


class ImportTests(unittest.TestCase):
    def make_document(self, path, green_answers=(1,)):
        document = ET.Element(gmdss.W + "document")
        body = ET.SubElement(document, gmdss.W + "body")
        for number in range(2):
            p = ET.SubElement(body, gmdss.W + "p")
            # Both unusual source styles must still be recognized as questions.
            if number == 0:
                props = ET.SubElement(p, gmdss.W + "pPr")
                ET.SubElement(props, gmdss.W + "pStyle", {gmdss.W + "val": "wpproquizlistitem"})
            run = ET.SubElement(p, gmdss.W + "r")
            ET.SubElement(ET.SubElement(run, gmdss.W + "rPr"), gmdss.W + "b")
            ET.SubElement(run, gmdss.W + "t").text = f"שאלה {number + 1}"
            for index, text in enumerate(("בחירה אחת", "בחירה שנייה", "תשובות א ו- ב נכונות", "אודיע לתחנת חוף")):
                p = ET.SubElement(body, gmdss.W + "p")
                if index in green_answers:
                    ET.SubElement(ET.SubElement(p, gmdss.W + "pPr"), gmdss.W + "shd", {gmdss.W + "fill": "92D050"})
                empty = ET.SubElement(p, gmdss.W + "r")
                ET.SubElement(ET.SubElement(empty, gmdss.W + "rPr"), gmdss.W + "b")
                run = ET.SubElement(p, gmdss.W + "r")
                ET.SubElement(ET.SubElement(run, gmdss.W + "rPr"), gmdss.W + "b", {gmdss.W + "val": "0"})
                ET.SubElement(run, gmdss.W + "t").text = text
        with ZipFile(path, "w") as archive:
            archive.writestr("word/document.xml", ET.tostring(document))

    def test_styles_empty_bold_runs_green_keys_and_source_positions(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "questions.docx"
            self.make_document(path)
            questions = gmdss.extract(path)
        self.assertEqual([q["sourceIndex"] for q in questions], [1, 2])
        for question in questions:
            self.assertEqual([a["correct"] for a in question["answers"]], [False, True, False, False])
            self.assertTrue(question["preserveAnswerOrder"])

    def test_ambiguous_or_missing_green_markings_stop_import(self):
        for markings in ((), (0, 1)):
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "bad.docx"
                self.make_document(path, markings)
                with self.assertRaisesRegex(ValueError, "exactly one green"):
                    gmdss.extract(path)

    def test_positional_references_and_ordinary_hebrew_words(self):
        for text in ("תשובות א ו- ב נכונות", "תשובה א+ב נכונות", "א ו ב שניהם אפשריים", "כל המצבים הקודמים", "שני הנ״ל", "אף אחד מהנ״ל"):
            self.assertIsNotNone(gmdss.LETTER_REFERENCE.search(text), text)
        for text in ("אודיע לתחנת חוף", "כל התשובות נכונות", "אין תשובה נכונה"):
            self.assertIsNone(gmdss.LETTER_REFERENCE.search(text), text)

    def test_duplicates_keep_first_but_conflicting_keys_are_retained(self):
        def question(identifier, prompt, correct):
            return {"id": identifier, "question": prompt, "answers": [{"text": "CH16", "correct": correct}, {"text": "CH70", "correct": not correct}], "images": []}
        first = question("gmdss-1", "שאלה?", True)
        duplicate = question("gmdss-2", "שאלה ?", True)
        conflict = question("gmdss-3", "שאלה", False)
        different_frequency = question("gmdss-4", "121.5 MHz", True)
        unique, removed = gmdss.deduplicate([first, duplicate, conflict, different_frequency], [])
        self.assertEqual([q["id"] for q in unique], ["gmdss-1", "gmdss-3", "gmdss-4"])
        self.assertEqual(removed, [{"removed": "gmdss-2", "kept": "gmdss-1"}])
        self.assertEqual(gmdss.conflicting_keys(unique), [["gmdss-1", "gmdss-3"]])
        self.assertNotEqual(gmdss.normalize("121.5 MHz"), gmdss.normalize("1215 MHz"))


if __name__ == "__main__":
    unittest.main()
