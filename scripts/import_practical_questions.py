"""Import the practical-preparation DOCX without rebuilding the other topics.

Usage: python3 scripts/import_practical_questions.py "/path/to/qa maasi.docx"
Add --check to verify that the committed questions/images match the source.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import posixpath
import re
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
TOPIC = "practical"
GREEN = "92D050"
# Match answer references, including unpunctuated forms such as תשובות א+ב.
# Do not mistake letters in nautical abbreviations or picture labels for choices.
LETTER_REFERENCE = re.compile(
    r"(?:תשוב(?:ות|ה)|סעיפים?)\s*[אבגד](?:['׳’]|\s*[+ו-])"
    r"|^[אבגד]['׳’]\s*[+ו-]"
    r"|(?:התשובות|התשובה|האפשרויות|האפשרות)\s+(?:לעיל|הראשונות|הקודמות|האחרונות)"
)


def paragraph_text(paragraph: ET.Element) -> str:
    return "".join(
        node.text or "" if node.tag == W + "t" else "\n" if node.tag == W + "br" else "\t"
        for node in paragraph.iter()
        if node.tag in (W + "t", W + "br", W + "tab")
    ).strip()


def extract(path: Path) -> tuple[list[dict], dict[str, bytes]]:
    questions: list[dict] = []
    assets: dict[str, bytes] = {}
    current: dict | None = None
    with ZipFile(path) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        numbering = ET.fromstring(archive.read("word/numbering.xml"))
        relationships = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
        rels = {node.get("Id"): node.get("Target") for node in relationships}
        decimal_lists = {
            node.get(W + "abstractNumId")
            for node in numbering.findall(W + "abstractNum")
            if node.find(W + "lvl/" + W + "numFmt").get(W + "val") == "decimal"
        }
        question_lists = {
            node.get(W + "numId")
            for node in numbering.findall(W + "num")
            if node.find(W + "abstractNumId").get(W + "val") in decimal_lists
        }
        body = document.find(W + "body")
        if body is None or body.findall(W + "tbl"):
            raise ValueError("Expected the source's numbered paragraph layout; review this DOCX manually.")

        for paragraph in body.findall(W + "p"):
            text = paragraph_text(paragraph)
            number = paragraph.find(W + "pPr/" + W + "numPr/" + W + "numId")
            is_question = number is not None and number.get(W + "val") in question_lists
            correct = any(node.get(W + "fill") == GREEN for node in paragraph.iter(W + "shd"))

            if is_question and text:
                source_index = len(questions) + 1
                current = {
                    "id": f"{TOPIC}-{source_index}",
                    "topic": TOPIC,
                    "topicName": "הכנה למעשי",
                    "topicDescription": "הכרת היאכטה, תמרונים והכנה למבחן המעשי",
                    "question": text,
                    "answers": [],
                    "images": [],
                    "sourceIndex": source_index,
                    "preserveAnswerOrder": False,
                }
                questions.append(current)
            elif text:
                if current is None:
                    raise ValueError(f"Text outside a numbered question: {text}")
                current["answers"].append({"text": text, "correct": correct})

            for node in paragraph.iter(A + "blip"):
                if current is None:
                    raise ValueError("Image outside a question.")
                target = rels[node.get(R + "embed")]
                archive_name = posixpath.normpath("word/" + target)
                payload = archive.read(archive_name)
                filename = hashlib.sha256(payload).hexdigest()[:18] + Path(target).suffix.lower()
                image_path = f"/question-images/{filename}"
                assets[image_path] = payload
                current["images"].append(image_path)

    if not questions:
        raise ValueError("No numbered questions found.")
    for question in questions:
        answers = question["answers"]
        if len(answers) not in (3, 4) or sum(answer["correct"] for answer in answers) != 1:
            raise ValueError(f"Review {question['id']}: expected 3–4 choices and exactly one green answer.")
        question["preserveAnswerOrder"] = any(LETTER_REFERENCE.search(answer["text"]) for answer in answers)
    return questions, assets


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("document", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    questions, assets = extract(args.document)
    bank_path = ROOT / "app/questions.json"
    bank = json.loads(bank_path.read_text(encoding="utf-8"))
    if args.check:
        if [q for q in bank["questions"] if q["topic"] == TOPIC] != questions:
            raise ValueError("The practical question bank differs from the DOCX.")
        for url, payload in assets.items():
            if (ROOT / "public" / url.lstrip("/")).read_bytes() != payload:
                raise ValueError(f"Image differs from the DOCX: {url}")
    else:
        bank["questions"] = [q for q in bank["questions"] if q["topic"] != TOPIC] + questions
        bank["counts"][TOPIC] = len(questions)
        for url, payload in assets.items():
            destination = ROOT / "public" / url.lstrip("/")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(payload)
        bank_path.write_text(json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"questions": len(questions), "images": len(assets), "lockedAnswers": sum(q["preserveAnswerOrder"] for q in questions), "checked": args.check}))


if __name__ == "__main__":
    main()
