import { motion } from "framer-motion";
import { Gift, Clock, Percent, Scissors } from "lucide-react";

const promos = [
  {
    icon: Percent,
    title: "Скидка 20% на первое посещение",
    description: "Для новых клиентов — скидка 20% на любую услугу при первом визите в любой филиал сети.",
    badge: "NEW",
  },
  {
    icon: Clock,
    title: "Счастливые часы",
    description: "Пн-Чт с 12:00 до 16:00 — стрижка от 1 390 ₽. Используй код HAPPY-2026.",
    badge: "HAPPY",
  },
  {
    icon: Scissors,
    title: "Папа + Сын",
    description: "Семейный поход в барбершоп со скидкой. Стрижка для папы и ребёнка до 10 лет в одном сеансе.",
    badge: "FAMILY",
  },
  {
    icon: Gift,
    title: "Подарочные сертификаты",
    description: "Подарите стиль! Сертификаты на любую сумму — идеальный подарок для мужчины.",
    badge: "GIFT",
  },
];

const PromosSection = () => {
  return (
    <section id="promos" className="py-20 px-4 border-t border-border/20">
      <div className="container max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-5xl md:text-7xl font-bold text-foreground uppercase italic mb-12"
        >
          Акции
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promos.map((promo, i) => (
            <motion.div
              key={promo.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group border border-border/40 p-8 hover:border-primary/40 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-xs font-heading uppercase tracking-wider text-primary border border-primary/30 px-3 py-1">
                {promo.badge}
              </div>
              <promo.icon className="w-8 h-8 text-primary mb-5" strokeWidth={1.5} />
              <h3 className="font-heading text-xl uppercase text-foreground mb-3">{promo.title}</h3>
              <p className="text-muted-foreground text-sm font-body leading-relaxed">{promo.description}</p>
              <div className="absolute bottom-0 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-700" />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default PromosSection;
