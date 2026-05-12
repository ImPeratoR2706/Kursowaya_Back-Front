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
    # Use a new filename to avoid Windows file locks when the previous
    # document is still open in Word.
    out = Path(r"C:\Users\ASUS\Desktop\Kursowaya\docs\3.4_Realizaciya_modulya_II_v3.docx")
    out.parent.mkdir(parents=True, exist_ok=True)

    lines: list[tuple[str, bool]] = []

    # Заголовок раздела
    lines.append(("3.4 Реализация модуля искусственного интеллекта", True))
    lines.append(("", False))

    lines.append(
        (
            "В рамках курсового проекта реализован модуль искусственного интеллекта, "
            "решающий прикладную задачу предметной области: прогнозирование вероятности неявки клиента на запись "
            "(no-show). Результат используется в бизнес-процессе сопровождения записи администратором/мастером.",
            False,
        )
    )
    lines.append(("", False))

    # 3.4.1
    lines.append(("3.4.1 Тип задачи, место использования и интерфейс вызова", True))
    lines.append(
        (
            "Тип задачи: бинарная классификация (no_show = 1 / not_no_show = 0) с выдачей вероятности.",
            False,
        )
    )
    lines.append(
        (
            "Место в бизнес-процессе: перед подтверждением/сопровождением записи для оценки риска и выбора действий "
            "(например, напоминание, дополнительное подтверждение, предоплата).",
            False,
        )
    )
    lines.append(
        (
            "API вызова прогноза: POST /api/appointments/{id}/predict-no-show/ (результат сохраняется в Aidata и "
            "возвращается клиенту в JSON).",
            False,
        )
    )
    lines.append(("", False))

    # 3.4.2
    lines.append(("3.4.2 Входные признаки и выходные данные", True))
    lines.append(
        (
            "Входные признаки формируются на сервере на основе данных записи (Appointment), статуса оплаты и истории "
            "клиента/мастера за окно 90 дней. Примеры признаков: день недели и час записи, число отмен и неявок за 90 дней, "
            "lead time (сколько дней до визита), статус оплаты, загрузка мастера в день визита, идентификатор мастера.",
            False,
        )
    )
    lines.append(
        (
            "Выходные данные: вероятность неявки в процентах, уровень риска (низкий/средний/высокий) и рекомендация "
            "администратору. Дополнительно сохраняются: версия модели, время инференса и снимок признаков.",
            False,
        )
    )
    lines.append(("", False))

    # 3.4.3
    lines.append(("3.4.3 Оценка качества: метрики и принцип расчёта", True))
    lines.append(
        (
            "Для оценки качества используется набор размеченных данных (Aidata), где для каждой записи известна истинная "
            "метка target_value:",
            False,
        )
    )
    lines.append(("  target_value = 1 — клиент не явился (no_show)", False))
    lines.append(("  target_value = 0 — клиент явился / запись состоялась", False))
    lines.append(("", False))

    lines.append(
        (
            "Пусть p — вероятность неявки (0..1), вычисленная моделью. Для перевода вероятности в класс используется порог "
            "threshold (0..1). Обозначим yₜᵣᵤₑ — истинный класс, yₚᵣₑd — предсказанный класс:",
            False,
        )
    )
    lines.append(("  yₜᵣᵤₑ = target_value", False))
    lines.append(("  yₚᵣₑd = 1, если p ≥ threshold; иначе yₚᵣₑd = 0", False))
    lines.append(("", False))

    lines.append(("Далее строится матрица ошибок (confusion matrix):", False))
    lines.append(("  TP: y_true=1 и y_pred=1", False))
    lines.append(("  FP: y_true=0 и y_pred=1", False))
    lines.append(("  TN: y_true=0 и y_pred=0", False))
    lines.append(("  FN: y_true=1 и y_pred=0", False))
    lines.append(("", False))

    lines.append(("На основе TP/FP/TN/FN рассчитываются метрики (математическая форма):", False))
    lines.append(("  n = TP + FP + TN + FN", False))
    lines.append(("  Accuracy  = (TP + TN) / n", False))
    lines.append(("  Precision = TP / (TP + FP)", False))
    lines.append(("  Recall    = TP / (TP + FN)", False))
    lines.append(("  F1        = (2 · Precision · Recall) / (Precision + Recall)", False))
    lines.append(("", False))

    lines.append(
        (
            "Если знаменатель равен 0, метрика считается неопределённой и не вычисляется (фиксируется как null).",
            False,
        )
    )
    lines.append(("", False))

    # 3.4.4
    lines.append(("3.4.4 Сохранение/загрузка модели и визуализация результата", True))
    lines.append(
        (
            "Модель используется повторно при запуске системы: при наличии файла модели и зависимостей выполняется инференс; "
            "метаданные модели доступны через GET /api/ai/model-info/.",
            False,
        )
    )
    lines.append(
        (
            "В пользовательском интерфейсе предусмотрены экраны визуализации результата ИИ и метрик качества: "
            "отображение вероятности, уровней риска (низкий/средний/высокий) и диаграмм распределения.",
            False,
        )
    )

    # Render to WordprocessingML
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

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document_xml)

    print(out)


if __name__ == "__main__":
    main()

