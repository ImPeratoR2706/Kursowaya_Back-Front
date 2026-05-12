export interface Booking {
  id: string;
  clientName: string;
  masterName: string;
  service: string;
  date: string;
  time: string;
  branch: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  price: number;
  notes?: string;
}

const initialBookings: Booking[] = [
  { id: "b1", clientName: "Иван Петров", masterName: "Алексей", service: "Стрижка", date: "2026-04-02", time: "10:00", branch: "Тверская", status: "confirmed", price: 2190 },
  { id: "b2", clientName: "Дмитрий Козлов", masterName: "Максим", service: "Борода + стрижка", date: "2026-04-02", time: "11:30", branch: "Арбат", status: "pending", price: 3490 },
  { id: "b3", clientName: "Сергей Волков", masterName: "Алексей", service: "Королевское бритьё", date: "2026-04-01", time: "15:00", branch: "Тверская", status: "completed", price: 2490 },
  { id: "b4", clientName: "Андрей Смирнов", masterName: "Денис", service: "Стрижка + камуфляж", date: "2026-04-03", time: "14:00", branch: "Патрики", status: "confirmed", price: 4290 },
  { id: "b5", clientName: "Олег Новиков", masterName: "Максим", service: "Детская стрижка", date: "2026-04-01", time: "12:00", branch: "Арбат", status: "cancelled", price: 1290 },
];

export function getBookings(): Booking[] {
  const saved = localStorage.getItem("sb_bookings");
  if (saved) return JSON.parse(saved);
  localStorage.setItem("sb_bookings", JSON.stringify(initialBookings));
  return initialBookings;
}

export function saveBookings(bookings: Booking[]) {
  localStorage.setItem("sb_bookings", JSON.stringify(bookings));
}

export function addBooking(booking: Omit<Booking, "id">) {
  const bookings = getBookings();
  const newBooking = { ...booking, id: `b${Date.now()}` };
  bookings.push(newBooking);
  saveBookings(bookings);
  return newBooking;
}

export function updateBooking(id: string, data: Partial<Booking>) {
  const bookings = getBookings();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx !== -1) {
    bookings[idx] = { ...bookings[idx], ...data };
    saveBookings(bookings);
  }
  return bookings[idx];
}

export function deleteBooking(id: string) {
  const bookings = getBookings().filter((b) => b.id !== id);
  saveBookings(bookings);
}

export const services = ["Стрижка", "Борода", "Стрижка + борода", "Королевское бритьё", "Камуфляж седины", "Детская стрижка", "Уход за лицом"];
export const branches = ["Тверская", "Арбат", "Патрики", "Сокол", "Белорусская"];
export const masters = ["Алексей", "Максим", "Денис", "Артём"];
