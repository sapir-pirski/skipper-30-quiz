from __future__ import annotations

import hashlib
import json
import posixpath
import re
import unicodedata
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
PUBLIC = Path(__file__).resolve().parents[1] / "public"
DATA_OUT = Path(__file__).resolve().parents[1] / "app" / "questions.json"
IMAGE_OUT = PUBLIC / "question-images"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

TOPICS = {
    "QA Mehona - deduplicated.docx": ("engine", "מכונה", "מערכות מנוע, משאבות ותחזוקה"),
    "QA Nivut Mahshirim - deduplicated.docx": ("navigation", "ניווט ומכשירים", "מפות, קשר ומכשירי ניווט"),
    "QA Yamaut - deduplicated2.docx": ("seamanship", "ימאות", "חוקי דרך, מפרשנות, מזג אוויר ובטיחות"),
}


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).lower()
    value = "".join(char for char in value if unicodedata.category(char)[0] not in "PM")
    return re.sub(r"\s+", " ", value).strip()


def paragraph_text(paragraph: ET.Element) -> str:
    return "".join(node.text or "" for node in paragraph.iter(W + "t")).strip()


def extract_document(path: Path, image_cache: dict[str, str]) -> list[dict]:
    topic_id, topic_name, topic_description = TOPICS[path.name]
    with ZipFile(path) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        relationships = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
        rels = {node.get("Id"): node.get("Target") for node in relationships}
        blocks: list[dict] = []
        current: dict | None = None

        for paragraph in document.find(".//" + W + "body").findall(W + "p"):
            text = paragraph_text(paragraph)
            bold = bool(text) and any(
                run.find(W + "rPr/" + W + "b") is not None for run in paragraph.findall(W + "r")
            )
            correct = any(node.get(W + "fill") == "C1F0C7" for node in paragraph.iter(W + "shd"))
            image_targets = [
                rels[node.get(R + "embed")]
                for node in paragraph.iter(A + "blip")
                if node.get(R + "embed") in rels
            ]

            images: list[str] = []
            for target in image_targets:
                archive_name = posixpath.normpath("word/" + target)
                payload = archive.read(archive_name)
                digest = hashlib.sha256(payload).hexdigest()
                suffix = Path(archive_name).suffix.lower() or ".bin"
                filename = image_cache.get(digest)
                if not filename:
                    filename = f"{digest[:18]}{suffix}"
                    (IMAGE_OUT / filename).write_bytes(payload)
                    image_cache[digest] = filename
                images.append(f"/question-images/{filename}")

            if bold:
                if current:
                    blocks.append(current)
                current = {"question": text, "answers": [], "images": images}
            elif current:
                if text:
                    current["answers"].append({"text": text, "correct": correct})
                current["images"].extend(images)

        if current:
            blocks.append(current)

    questions = []
    for source_index, block in enumerate(blocks, 1):
        correct_count = sum(answer["correct"] for answer in block["answers"])
        if not block["answers"] or correct_count != 1:
            continue
        questions.append(
            {
                "id": f"{topic_id}-{source_index}",
                "topic": topic_id,
                "topicName": topic_name,
                "topicDescription": topic_description,
                "question": block["question"],
                "answers": block["answers"],
                "images": block["images"],
                "sourceIndex": source_index,
            }
        )
    return questions


def deduplicate(questions: list[dict]) -> tuple[list[dict], int]:
    seen: set[tuple] = set()
    unique: list[dict] = []
    removed = 0
    for question in questions:
        image_hashes = tuple(Path(image).stem for image in question["images"])
        answer_key = tuple(
            sorted((normalize(answer["text"]), answer["correct"]) for answer in question["answers"])
        )
        key = (normalize(question["question"]), answer_key, image_hashes)
        if key in seen:
            removed += 1
            continue
        seen.add(key)
        unique.append(question)
    return unique, removed


def main() -> None:
    IMAGE_OUT.mkdir(parents=True, exist_ok=True)
    image_cache: dict[str, str] = {}
    questions: list[dict] = []
    for filename in TOPICS:
        questions.extend(extract_document(DOCS / filename, image_cache))
    questions, removed = deduplicate(questions)
    counts = {topic_id: sum(q["topic"] == topic_id for q in questions) for topic_id, _, _ in TOPICS.values()}
    DATA_OUT.write_text(
        json.dumps({"questions": questions, "counts": counts}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(json.dumps({"questions": len(questions), "duplicatesRemoved": removed, "counts": counts, "images": len(image_cache)}))


if __name__ == "__main__":
    main()
