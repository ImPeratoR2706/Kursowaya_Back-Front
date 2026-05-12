import { useState } from "react";
import { motion } from "framer-motion";

type ServiceCategory = "haircut" | "beard" | "complex" | "face";

const categories: { id: ServiceCategory; label: string }[] = [
  { id: "haircut", label: "Стрижка" },
  { id: "beard", label: "Борода / Бритьё" },
  { id: "complex", label: "Комплексы" },
  { id: "face", label: "Уход за лицом" },
];

type Service = {
  name: string;
  prices: (number | null)[];
  category: ServiceCategory;
};

const services: Service[] = [
  { name: "Стрижка", prices: [1690, 2290, 2900, 4000], category: "haircut" },
  { name: "Стрижка ножницами", prices: [2290, 2290, 2900, 4000], category: "haircut" },
  { name: "Детская стрижка", prices: [1490, 2290, 2900, 4000], category: "haircut" },
  { name: "Стрижка машинкой (1-2 насадки)", prices: [1090, 1390, 1800, 2400], category: "haircut" },
  { name: "Бритьё начисто шейвером", prices: [1390, 1690, 2000, 2400], category: "haircut" },
  
  { name: "Моделирование бороды", prices: [1590, 1890, 2900, 3500], category: "beard" },
  { name: "Стрижка бороды и усов", prices: [1090, 1390, 1800, 2400], category: "beard" },
  { name: "Бритьё головы (опасной бритвой)", prices: [1790, 2290, 2900, null], category: "beard" },
  { name: "Королевское бритьё (опасной бритвой)", prices: [1790, 2290, 2900, 4000], category: "beard" },
  { name: "Премиальное бритьё Graham Hill", prices: [1890, 2290, null, null], category: "beard" },
  { name: "Премиальное моделирование бороды Graham Hill", prices: [1990, 2290, null, null], category: "beard" },
  
  { name: "Стрижка + моделирование бороды", prices: [3280, 4180, 5800, 7500], category: "complex" },
  { name: "Стрижка + моделирование бороды + воск", prices: [3980, 4880, 6500, 8200], category: "complex" },
  { name: "Стрижка + борода + уход + воск", prices: [5580, 6480, 8100, null], category: "complex" },
  { name: "Стрижка машинкой + стрижка бороды", prices: [2380, 2780, 3600, 4800], category: "complex" },
  
  { name: "Комплекс по уходу за кожей лица VOLCARE", prices: [1800, 1800, 1800, 1800], category: "face" },
  { name: "Уход вокруг глаз RHEA", prices: [1700, 1700, 1700, 1700], category: "face" },
  { name: "Комплекс London Grooming + скраб", prices: [2900, 2900, 2900, 2900], category: "face" },
  { name: "Комплекс по уходу DEPOT", prices: [4000, 4000, 4000, 4000], category: "face" },
  { name: "Восстанавливающая терапия RHEA + патчи", prices: [8000, 8000, 8000, 8000], category: "face" },
  
];

const ServicesSection = () => {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>("haircut");
  const filtered = services.filter((s) => s.category === activeCategory);

  return (
    <section id="services" className="py-20 px-4">
      <div className="container max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-5xl md:text-7xl font-bold text-foreground uppercase italic mb-12"
        >
          Услуги
        </motion.h2>

        {/* Category tabs like britva */}
        <div className="flex flex-wrap gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`font-heading text-sm uppercase tracking-wider px-6 py-3 border transition-all duration-300 ${
                activeCategory === cat.id
                  ? "border-foreground text-foreground bg-foreground/5"
                  : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Price table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 pr-4 w-1/2" />
                <th className="text-center py-4 px-3 font-heading text-xs uppercase tracking-wider text-muted-foreground">
                  Цена
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((service, i) => (
                <motion.tr
                  key={service.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="py-5 pr-4 font-body text-sm text-foreground">
                    {service.name}
                  </td>
                  <td className="py-5 px-3 text-center font-body text-sm text-foreground">
                    {service.prices[0] ? `${service.prices[0].toLocaleString("ru-RU")} ₽` : "—"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
