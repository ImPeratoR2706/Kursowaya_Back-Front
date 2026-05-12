export function validateNotes(notes: string, max = 2000): string | null {
  if (notes.length > max) return `Примечания не длиннее ${max} символов.`;
  return null;
}

/** ISO-подобная строка `YYYY-MM-DDTHH:mm:00` без смещения — парсим как локальное время. */
export function parseLocalDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

/** Для новой записи: время начала не в прошлом (с запасом 1 мин). */
export function validateAppointmentStartInFuture(
  date: string,
  time: string,
  opts: { isEdit: boolean },
): string | null {
  if (opts.isEdit) return null;
  const dt = parseLocalDateTime(date, time);
  if (!dt || Number.isNaN(dt.getTime())) return "Укажите корректную дату и время.";
  if (dt.getTime() < Date.now() - 60_000) return "Дата и время записи должны быть в будущем.";
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return "Введите email.";
  if (!EMAIL_RE.test(e)) return "Некорректный формат email.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Пароль не короче 8 символов.";
  if (password.length > 128) return "Пароль не длиннее 128 символов.";
  return null;
}

export function validatePersonName(name: string, label: string): string | null {
  const t = name.trim();
  if (t.length < 2) return `${label}: не менее 2 символов.`;
  if (t.length > 100) return `${label}: не длиннее 100 символов.`;
  return null;
}
