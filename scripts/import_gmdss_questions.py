"""Import GMDSS, preserving source positions and green answer keys.

Usage: python3 scripts/import_gmdss_questions.py /path/to/gmdss.docx [--check]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
TOPIC = "gmdss"
DESCRIPTION = "קשר ימי, תקשורת מצוקה ומערכות בטיחות"
GREEN = "92D050"
LETTER_REFERENCE = re.compile(
    r"(?:תשוב(?:ות|ה)|סעיפים?|אפשרויות)\s+[אבגד](?=[\s'׳’+־–-]|$)"
    r"|^[אבגד]['׳’]?\s*[+ו־–-]\s*[אבגד](?=[\s.'׳’]|$)"
    r"|(?:התשובות|התשובה|האפשרויות|האפשרות|המצבים)\s+(?:לעיל|הראשונות|הקודמות|האחרונות|הקודמים)"
    r"|(?:שני|שתי|אף אחד|אף אחת|כל)\s+מ?הנ[\"״']?ל"
)

# Reviewed duplicate Q&A pairs with equivalent spelling/wording or translated
# labels. Fingerprints include the full prompt, choices, and correctness, so a
# source correction invalidates the exception instead of deleting new content.
REVIEWED_EQUIVALENTS = {
    "76b264af02e572df94c5c5fbcb105c92e6386991e22327da89b22a89cd29483e": "40993fd82b0f414ff61eba0f9781d41e0c479c6a46eee480a08532368492fbd6",  # 84 → 33
    "4c12a28adf098ef36ec7219e796009eee9404cefc6aef54b240a29a615f7cd1c": "a1a460de6438f0d147bc50312dc9715feb01cae078e842a0e6244ed980a6f188",  # 86 → 35
    "10d1552d48efd399bcc152ac5ff6134b705ba6de9b92fadc2bfbbd8a17f73bfd": "cca9d836c131bc7224cd3160be956c2e50515ad5309e64152c4aa57d2c374be8",  # 140 → 120
    "d56fa40c411146298c357726a0ff0e5175ff16e454f428d564dab37749cab985": "2aa05cfc6b737418e75d50ad31f4d6ea1d0f50173abd758cad7c7d49a4711934",  # 145 → 125
    "2175efbdeb85e79293dd0e824b134fe865555de867f21a1d82edcd428c7c3719": "8e7d57b6d3ba2efe319a53ff715ce2e7955db227db4bcb7adf3cab2e9e407378",  # 149 → 129
    "ab59a98120d85ed199b40916e0c942e66b7eb92ab5b05843335235406dfac6c0": "94bf924c3bc1e23d8d51ab81b38103cd52851d963c92cfcb92739cf991d2338b",  # 151 → 131
    "7c6974d3379448597ed444b46dfe90d02888e4975927e7f212135d2f726f0619": "873db22c280c8e9c85afdb0adccb787310886164ed60df4699b9f462c8c5290b",  # 227 → 96
}


def normalize(text: str) -> str:
    # Keep decimal points, signs, frequencies, units, and letter references.
    text = unicodedata.normalize("NFKC", text).casefold()
    text = re.sub(r"[׳’]", "'", text)
    text = re.sub(r"[־–—]", "-", text)
    text = re.sub(r"\s*-\s*", "-", text)
    return re.sub(r"\s+", " ", text).strip(".?!: ")


def question_key(question: dict) -> tuple:
    answers = tuple((normalize(a["text"]), a["correct"]) for a in question["answers"])
    dependent = question.get("preserveAnswerOrder") or any(
        LETTER_REFERENCE.search(a["text"]) for a in question["answers"]
    )
    return (normalize(question["question"]), answers if dependent else tuple(sorted(answers)), tuple(question["images"]))


def extract(path: Path) -> list[dict]:
    with ZipFile(path) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
    body = document.find(W + "body")
    if body is None or body.findall(W + "tbl") or list(document.iter(A + "blip")):
        raise ValueError("Unexpected table or image layout; review the document before importing.")
    questions: list[dict] = []
    for paragraph in body.findall(W + "p"):
        text = "".join(
            node.text or "" if node.tag == W + "t" else "\n" if node.tag == W + "br" else "\t"
            for node in paragraph.iter()
            if node.tag in (W + "t", W + "br", W + "tab")
        ).strip()
        if not text:
            continue
        # Two source questions have unusual paragraph styles. Read bold text,
        # ignoring bold markers on empty runs and explicit b=false markers.
        bold = any(
            any((node.text or "").strip() for node in run.iter(W + "t"))
            and any(
                mark is not None and mark.get(W + "val", "1") not in ("0", "false", "off")
                for mark in (run.find(W + "rPr/" + W + "b"), run.find(W + "rPr/" + W + "bCs"))
            )
            for run in paragraph.findall(W + "r")
        )
        green = any(node.get(W + "fill", "").upper() == GREEN for node in paragraph.iter(W + "shd"))
        if bold:
            if green:
                raise ValueError(f"Ambiguous bold green paragraph: {text}")
            source_index = len(questions) + 1
            questions.append({
                "id": f"{TOPIC}-{source_index}", "topic": TOPIC, "topicName": "GMDSS",
                "topicDescription": DESCRIPTION, "question": text, "answers": [], "images": [],
                "sourceIndex": source_index, "preserveAnswerOrder": False,
            })
        elif questions:
            questions[-1]["answers"].append({"text": text, "correct": green})
        else:
            raise ValueError(f"Text before the first question: {text}")
    if not questions:
        raise ValueError("No GMDSS questions found.")
    for question in questions:
        answers = question["answers"]
        if len(answers) != 4 or sum(a["correct"] for a in answers) != 1:
            raise ValueError(f"Review {question['id']}: expected four choices and exactly one green answer.")
        question["preserveAnswerOrder"] = any(LETTER_REFERENCE.search(a["text"]) for a in answers)
    return questions


def deduplicate(questions: list[dict], existing: list[dict]) -> tuple[list[dict], list[dict]]:
    def fingerprint(question: dict) -> str:
        digest = hashlib.sha256(json.dumps(question_key(question), ensure_ascii=False).encode()).hexdigest()
        return REVIEWED_EQUIVALENTS.get(digest, digest)

    seen = {fingerprint(q): q["id"] for q in existing}
    unique, duplicates = [], []
    for question in questions:
        key = fingerprint(question)
        if key in seen:
            duplicates.append({"removed": question["id"], "kept": seen[key]})
        else:
            seen[key] = question["id"]
            unique.append(question)
    return unique, duplicates


def conflicting_keys(questions: list[dict]) -> list[list[str]]:
    seen: dict[tuple, dict] = {}
    conflicts = []
    for question in questions:
        key = (normalize(question["question"]), tuple(sorted(normalize(a["text"]) for a in question["answers"])))
        previous = seen.get(key)
        correct = {normalize(a["text"]) for a in question["answers"] if a["correct"]}
        if previous and correct != {normalize(a["text"]) for a in previous["answers"] if a["correct"]}:
            conflicts.append([previous["id"], question["id"]])
        else:
            seen[key] = question
    return conflicts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("document", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    source = extract(args.document)
    bank_path = ROOT / "app/questions.json"
    bank = json.loads(bank_path.read_text(encoding="utf-8"))
    existing = [q for q in bank["questions"] if q["topic"] != TOPIC]
    questions, duplicates = deduplicate(source, existing)
    if args.check:
        if [q for q in bank["questions"] if q["topic"] == TOPIC] != questions:
            raise ValueError("Stored GMDSS questions differ from the deduplicated DOCX.")
        if bank["counts"].get(TOPIC) != len(questions):
            raise ValueError("Stored GMDSS count differs from the source.")
    else:
        bank["questions"] = existing + questions
        bank["counts"][TOPIC] = len(questions)
        bank_path.write_text(json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({
        "sourceQuestions": len(source), "imported": len(questions), "duplicates": duplicates,
        "lockedAnswers": [q["sourceIndex"] for q in questions if q["preserveAnswerOrder"]], "checked": args.check,
        "conflictingAnswerKeys": conflicting_keys(questions),
    }))


if __name__ == "__main__":
    main()
