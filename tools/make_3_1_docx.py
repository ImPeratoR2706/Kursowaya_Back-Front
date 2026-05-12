import zipfile
import html
from pathlib import Path


NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _p(text: str, bold: bool = False) -> str:
    t = html.escape(text)
    rpr = "<w:rPr><w:b/></w:rPr>" if bold else ""
    if text.startswith(" ") or text.endswith(" ") or "  " in text:
        return f"<w:p><w:r>{rpr}<w:t xml:space=\"preserve\">{t}</w:t></w:r></w:p>"
    return f"<w:p><w:r>{rpr}<w:t>{t}</w:t></w:r></w:p>"


def _blank() -> str:
    return "<w:p/>"


def main() -> None:
    out = Path(r"C:\Users\ASUS\Desktop\Kursowaya\docs\3.1_Struktura_proekta_i_stek.docx")
    out.parent.mkdir(parents=True, exist_ok=True)

    lines: list[tuple[str, bool]] = []

    lines.append(("3.1 Структура проекта и стек", True))
    lines.append(("", False))

    lines.append(
        (
            "Проект реализован в виде разделённой (клиент‑серверной) архитектуры, состоящей из трёх независимых компонентов: "
            "клиентская часть (Frontend), серверная часть (Backend) и база данных (PostgreSQL).",
            False,
        )
    )
    lines.append(("", False))

    lines.append(("Используемый стек:", True))
    lines.append(("• Frontend: React + Vite + TypeScript, shadcn/ui, Recharts (диаграммы).", False))
    lines.append(("• Backend: Python, Django, Django REST Framework, JWT (SimpleJWT).", False))
    lines.append(("• DB: PostgreSQL (отдельный компонент, в Docker — отдельный контейнер).", False))
    lines.append(("", False))

    lines.append(("Схема взаимодействия компонентов (логическая):", True))
    lines.append(("", False))

    # ASCII-схема (вставляем как набор строк — это отображается как диаграмма в документе)
    scheme = [
        "+------------------+        HTTP/JSON        +-------------------------+         ORM         +------------------+",
        "| Browser (User)   |  ---------------------> | Frontend (React/Vite)   |  --------------->  | Backend (Django) |",
        "+------------------+                          +-------------------------+                    +------------------+",
        "                                                                                                      |",
        "                                                                                                      | SQL (через ORM)",
        "                                                                                                      v",
        "                                                                                             +------------------+",
        "                                                                                             | PostgreSQL (DB)   |",
        "                                                                                             +------------------+",
    ]
    for s in scheme:
        lines.append((s, False))

    lines.append(("", False))
    lines.append(("Структура репозитория (крупные модули):", True))
    lines.append(("• Frontend/ — клиентское приложение (страницы, компоненты, API‑клиент).", False))
    lines.append(("• Backend/ — серверное приложение (модели, сериализаторы, viewset‑ы, AI‑модуль).", False))
    lines.append(("• docker-compose.yml — совместный запуск контейнеров (DB + backend + frontend).", False))
    lines.append(("• .env / .env.example — переменные окружения (в т.ч. POSTGRES_*).", False))

    body = []
    for text, bold in lines:
        body.append(_blank() if text == "" else _p(text, bold=bold))

    document_xml = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        f"<w:document xmlns:w='{NS_W}'><w:body>"
        + "".join(body)
        + "<w:sectPr><w:pgSz w:w='11906' w:h='16838'/>"
        + "<w:pgMar w:top='1440' w:right='1440' w:bottom='1440' w:left='1440' "
        + "w:header='708' w:footer='708' w:gutter='0'/></w:sectPr>"
        + "</w:body></w:document>"
    )

    content_types = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        "<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'>"
        "<Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/>"
        "<Default Extension='xml' ContentType='application/xml'/>"
        "<Override PartName='/word/document.xml' "
        "ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'/>"
        "</Types>"
    )

    rels = (
        "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>"
        "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>"
        "<Relationship Id='rId1' "
        "Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument' "
        "Target='word/document.xml'/>"
        "</Relationships>"
    )

    # Важно: не удаляем существующий файл — на Windows он может быть открыт Word'ом.
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document_xml)

    print(out)


if __name__ == "__main__":
    main()

