import { useState } from "react";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const reviews = [
  {
    name: "Алексей К.",
    rating: 5,
    text: "Лучший барбершоп, в котором я был. Стрижка просто огонь, атмосфера на высоте. Мастер Артём — топ!",
    service: "Стрижка + борода",
    date: "2 дня назад",
  },
  {
    name: "Дмитрий С.",
    rating: 5,
    text: "Хожу уже полгода только сюда. Качество неизменно высокое, всегда уходишь довольный. Королевское бритьё — это отдельный кайф.",
    service: "Королевское бритьё",
    date: "Неделю назад",
  },
  {
    name: "Иван М.",
    rating: 5,
    text: "Записался через сайт, пришёл точно по времени — никакого ожидания. Всё чётко, профессионально, по-мужски.",
    service: "Стрижка",
    date: "2 недели назад",
  },
  {
    name: "Михаил Р.",
    rating: 4,
    text: "Отличное место. Стрижка машинкой быстро и аккуратно. Единственное — хотелось бы побольше слотов по вечерам.",
    service: "Стрижка машинкой",
    date: "3 недели назад",
  },
  {
    name: "Андрей В.",
    rating: 5,
    text: "Привёл сына — оба довольны. Акция «Папа + сын» — это гениально. Ребёнок теперь сам просится в барбершоп!",
    service: "Папа + сын",
    date: "Месяц назад",
  },
];

const ReviewsSection = () => {
  const [current, setCurrent] = useState(0);
  const visibleCount = typeof window !== "undefined" && window.innerWidth >= 768 ? 3 : 1;

  const next = () => setCurrent((prev) => (prev + 1) % reviews.length);
  const prev = () => setCurrent((prev) => (prev - 1 + reviews.length) % reviews.length);

  const getVisibleReviews = () => {
    const result = [];
    for (let i = 0; i < Math.min(visibleCount, reviews.length); i++) {
      result.push(reviews[(current + i) % reviews.length]);
    }
    return result;
  };

  return (
    <section className="py-20 px-4 border-t border-border/20">
      <div className="container max-w-7xl">
        <div className="flex items-end justify-between mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-5xl md:text-7xl font-bold text-foreground uppercase italic"
          >
            Отзывы
          </motion.h2>
          <div className="flex gap-2">
            <button
              onClick={prev}
              className="border border-border w-12 h-12 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="border border-border w-12 h-12 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {getVisibleReviews().map((review, i) => (
            <motion.div
              key={`${review.name}-${current}-${i}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="border border-border/30 p-7 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      className={j < review.rating ? "fill-primary text-primary" : "text-border"}
                    />
                  ))}
                </div>
                <p className="text-foreground/90 text-sm font-body leading-relaxed mb-4">
                  "{review.text}"
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground font-heading text-sm uppercase">{review.name}</p>
                    <p className="text-muted-foreground text-xs font-body">{review.service}</p>
                  </div>
                  <p className="text-muted-foreground/50 text-xs font-body">{review.date}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
