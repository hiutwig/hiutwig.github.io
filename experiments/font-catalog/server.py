#!/usr/bin/env python3
"""Local, on-demand browser catalog for a folder or ZIP of TrueType fonts."""

from __future__ import annotations

import argparse
import re
import struct
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

from flask import Flask, Response, abort, jsonify, request, send_file


ROOT = Path(__file__).resolve().parent
DEFAULT_FOLDER = Path(
    "/Users/eloisafroes/Downloads/Ultimate Pack/12.000 Fontes/10.000 FONTES"
)
DEFAULT_ZIP = Path(
    "/Users/eloisafroes/Downloads/Ultimate Pack/12.000 Fontes/12k Fontes 2024.zip"
)
FONT_SUFFIXES = {".ttf"}
CHARACTER_TESTS = {
    "portuguese": "áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ",
    "extended": "ñÑåÅøØæÆœŒßðÐþÞ",
    "punctuation": "“”‘’—–…",
    "symbols": "€£¥©®™",
}
STYLE_WORDS = (
    "bold italic", "bolditalic", "semi bold", "semibold", "demi bold", "demibold",
    "extra bold", "extrabold", "ultra bold", "ultrabold", "black italic",
    "light italic", "thin italic", "condensed italic", "expanded italic",
    "bold", "italic", "oblique", "regular", "medium", "light", "thin", "black",
    "heavy", "book", "condensed", "narrow", "expanded", "outline", "shadow",
)


def clean_label(filename: str) -> str:
    name = Path(filename).stem.replace("_", " ").replace("-", " ")
    return re.sub(r"\s+", " ", name).strip()


def infer_style(label: str) -> str:
    lowered = label.lower()
    for style in STYLE_WORDS:
        if style in lowered:
            return style.title().replace("Bolditalic", "Bold Italic")
    return "Regular"


def infer_family(label: str, style: str) -> str:
    family = re.sub(re.escape(style), "", label, flags=re.IGNORECASE)
    for token in STYLE_WORDS:
        family = re.sub(rf"\b{re.escape(token)}\b", "", family, flags=re.IGNORECASE)
    family = re.sub(r"\s+", " ", family).strip(" -_")
    return family or label


def _decode_name(raw: bytes, platform: int) -> str:
    try:
        return raw.decode("utf-16-be" if platform in {0, 3} else "mac_roman").strip("\x00 ")
    except (UnicodeDecodeError, LookupError):
        return ""


def _cmap_support(data: bytes, wanted: set[int]) -> set[int]:
    found: set[int] = set()
    if len(data) < 4:
        return found
    count = struct.unpack_from(">H", data, 2)[0]
    offsets: list[int] = []
    for i in range(count):
        position = 4 + i * 8
        if position + 8 <= len(data):
            offsets.append(struct.unpack_from(">I", data, position + 4)[0])
    for offset in sorted(set(offsets)):
        if offset + 2 > len(data):
            continue
        fmt = struct.unpack_from(">H", data, offset)[0]
        if fmt == 12 and offset + 16 <= len(data):
            groups = struct.unpack_from(">I", data, offset + 12)[0]
            for i in range(groups):
                position = offset + 16 + i * 12
                if position + 12 > len(data):
                    break
                start, end = struct.unpack_from(">II", data, position)[:2]
                found.update(codepoint for codepoint in wanted - found if start <= codepoint <= end)
        elif fmt == 4 and offset + 16 <= len(data):
            length = struct.unpack_from(">H", data, offset + 2)[0]
            segment_count = struct.unpack_from(">H", data, offset + 6)[0] // 2
            end_base = offset + 14
            start_base = end_base + segment_count * 2 + 2
            delta_base = start_base + segment_count * 2
            range_base = delta_base + segment_count * 2
            table_end = min(len(data), offset + length)
            for codepoint in wanted - found:
                if codepoint > 0xFFFF:
                    continue
                for i in range(segment_count):
                    end = struct.unpack_from(">H", data, end_base + i * 2)[0]
                    start = struct.unpack_from(">H", data, start_base + i * 2)[0]
                    if start <= codepoint <= end:
                        delta = struct.unpack_from(">h", data, delta_base + i * 2)[0]
                        range_offset = struct.unpack_from(">H", data, range_base + i * 2)[0]
                        if range_offset == 0:
                            glyph = (codepoint + delta) & 0xFFFF
                        else:
                            glyph_position = range_base + i * 2 + range_offset + 2 * (codepoint - start)
                            glyph = struct.unpack_from(">H", data, glyph_position)[0] if glyph_position + 2 <= table_end else 0
                        if glyph:
                            found.add(codepoint)
                        break
                    if codepoint < start:
                        break
        if found == wanted:
            break
    return found


def read_font_metadata(path: Path) -> dict[str, Any]:
    """Read naming and selected character coverage from a TrueType file."""
    try:
        with path.open("rb") as handle:
            header = handle.read(12)
            if len(header) < 12 or header[:4] == b"ttcf":
                return {}
            table_count = struct.unpack_from(">H", header, 4)[0]
            tables: dict[str, tuple[int, int]] = {}
            for _ in range(table_count):
                record = handle.read(16)
                if len(record) < 16:
                    break
                tag, _, offset, length = struct.unpack(">4sIII", record)
                tables[tag.decode("latin1")] = (offset, length)

            names: dict[int, list[tuple[int, str]]] = {}
            if "name" in tables:
                offset, length = tables["name"]
                handle.seek(offset)
                table = handle.read(length)
                if len(table) >= 6:
                    count, strings_offset = struct.unpack_from(">HH", table, 2)
                    for i in range(count):
                        position = 6 + i * 12
                        if position + 12 > len(table):
                            break
                        platform, _, _, name_id, string_length, string_offset = struct.unpack_from(">HHHHHH", table, position)
                        start = strings_offset + string_offset
                        value = _decode_name(table[start:start + string_length], platform)
                        if value and name_id in {1, 2, 4, 16, 17}:
                            names.setdefault(name_id, []).append((platform, value))

            def best_name(*ids: int) -> str:
                for name_id in ids:
                    values = names.get(name_id, [])
                    if values:
                        values.sort(key=lambda item: (item[0] != 3, item[0] != 0, item[0] != 1))
                        return values[0][1]
                return ""

            coverage: dict[str, bool] = {}
            if "cmap" in tables:
                offset, length = tables["cmap"]
                handle.seek(offset)
                cmap = handle.read(length)
                wanted = {ord(char) for sample in CHARACTER_TESTS.values() for char in sample}
                supported = _cmap_support(cmap, wanted)
                coverage = {
                    key: all(ord(char) in supported for char in sample)
                    for key, sample in CHARACTER_TESTS.items()
                }
            return {
                "family": best_name(16, 1),
                "style": best_name(17, 2),
                "fullName": best_name(4),
                "coverage": coverage,
            }
    except (OSError, struct.error, ValueError):
        return {}


def font_record(index: int, relative_path: str, size: int, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    label = clean_label(relative_path)
    metadata = metadata or {}
    style = metadata.get("style") or infer_style(label)
    family = metadata.get("family") or infer_family(label, style)
    record = {
        "id": index,
        "name": metadata.get("fullName") or label,
        "family": family,
        "style": style,
        "letter": next((c.upper() for c in family if c.isalpha()), "#"),
        "size": size,
        "path": relative_path,
    }
    record["coverage"] = metadata.get("coverage", {})
    return record


def build_index(source: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if source.is_dir():
        discovered = {
            str(path.relative_to(source)): path
            for path in source.rglob("*")
            if path.is_file() and path.suffix.lower() in FONT_SUFFIXES
        }
        paths: list[Path] = []
        # Keep the original ZIP order when the matching archive is present. Browser
        # favorites from earlier versions were saved by these numeric positions.
        if DEFAULT_ZIP.is_file() and source.resolve() == DEFAULT_FOLDER.resolve():
            with zipfile.ZipFile(DEFAULT_ZIP) as archive:
                for info in archive.infolist():
                    if Path(info.filename).suffix.lower() not in FONT_SUFFIXES:
                        continue
                    parts = Path(info.filename).parts
                    relative = str(Path(*parts[1:])) if len(parts) > 1 else info.filename
                    if relative in discovered:
                        paths.append(discovered.pop(relative))
        paths.extend(sorted(discovered.values(), key=lambda path: str(path.relative_to(source)).casefold()))
        fonts = [font_record(i, str(path.relative_to(source)), path.stat().st_size, read_font_metadata(path)) for i, path in enumerate(paths)]
        source_type = "folder"
        source_bytes = sum(font["size"] for font in fonts)
    elif source.is_file() and source.suffix.lower() == ".zip":
        with zipfile.ZipFile(source) as archive:
            infos = sorted(
                (info for info in archive.infolist() if Path(info.filename).suffix.lower() in FONT_SUFFIXES),
                key=lambda info: info.filename.casefold(),
            )
        fonts = [font_record(i, info.filename, info.file_size) for i, info in enumerate(infos)]
        source_type = "zip"
        source_bytes = source.stat().st_size
    else:
        raise FileNotFoundError(f"Font source not found: {source}")

    family_groups: dict[str, list[dict[str, Any]]] = {}
    for font in fonts:
        family_groups.setdefault(font["family"].casefold(), []).append(font)
    for group in family_groups.values():
        styles_lower = " ".join(font["style"].lower() for font in group)
        for font in group:
            font["familySize"] = len(group)
            font["hasBold"] = "bold" in styles_lower or "black" in styles_lower or "heavy" in styles_lower
            font["hasItalic"] = "italic" in styles_lower or "oblique" in styles_lower
            font["hasBoldItalic"] = any(
                ("bold" in member["style"].lower() or "black" in member["style"].lower())
                and ("italic" in member["style"].lower() or "oblique" in member["style"].lower())
                for member in group
            )

    names = Counter(font["name"].casefold() for font in fonts)
    styles = Counter(font["style"] for font in fonts)
    stats = {
        "total": len(fonts),
        "sourceBytes": source_bytes,
        "fontBytes": sum(font["size"] for font in fonts),
        "duplicateNames": sum(count - 1 for count in names.values() if count > 1),
        "styles": styles.most_common(),
        "sourceName": source.name,
        "sourceType": source_type,
    }
    return fonts, stats


def create_app(source: Path) -> Flask:
    fonts, stats = build_index(source)
    app = Flask(__name__, static_folder=str(ROOT), static_url_path="")

    @app.get("/")
    def index() -> Any:
        return send_file(ROOT / "index.html")

    @app.get("/api/fonts")
    def font_index() -> Response:
        return jsonify({"fonts": fonts, "stats": stats})

    @app.get("/api/font/<int:font_id>")
    def font_file(font_id: int) -> Response:
        if font_id < 0 or font_id >= len(fonts):
            abort(404)
        item = fonts[font_id]
        download = request.args.get("download") == "1"
        safe_name = re.sub(r"[^\w .-]", "_", Path(item["path"]).name)

        if source.is_dir():
            font_path = (source / item["path"]).resolve()
            if source.resolve() not in font_path.parents or not font_path.is_file():
                abort(404)
            response = send_file(
                font_path,
                mimetype="font/ttf",
                as_attachment=download,
                download_name=safe_name,
                conditional=True,
            )
        else:
            with zipfile.ZipFile(source) as archive:
                try:
                    data = archive.read(item["path"])
                except (KeyError, zipfile.BadZipFile):
                    abort(404)
            headers = {"Content-Disposition": f'attachment; filename="{safe_name}"'} if download else {}
            response = Response(data, mimetype="font/ttf", headers=headers)

        response.headers["Cache-Control"] = "public, max-age=86400"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.get("/api/health")
    def health() -> Response:
        return jsonify({"ok": True, "fonts": len(fonts), "source": stats["sourceType"]})

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source",
        nargs="?",
        type=Path,
        default=DEFAULT_FOLDER if DEFAULT_FOLDER.is_dir() else DEFAULT_ZIP,
        help="path to the expanded font folder or ZIP",
    )
    parser.add_argument("--port", type=int, default=5050)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    app = create_app(args.source.expanduser().resolve())
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
