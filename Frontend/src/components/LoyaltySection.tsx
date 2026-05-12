import { useState } from "react";
import { motion } from "framer-motion";
import { Scissors, Award, Star, TrendingUp } from "lucide-react";

type Tier = {
  name: string;
  icon: typeof Scissors;
  description: string;
  features: string[];
};

const tiers: Tier[] = [
  {
    name: "Барбер",
    icon: Scissors,
    description: "Сертифицированный мастер сети с базовой квалификацией",
    features: ["Все виды стрижек", "Моделирование бороды", "Базовый уход"],
  },
  {
    name: "Топ-Барбер",
    icon: TrendingUp,
    description: "Специалист с многолетним опытом, прошедший единую сертификацию сети",
    features: ["Всё от Барбера", "Премиальные техники", "Расширенный уход", "Индивидуальный подход"],
  },
  {
    name: "Бренд-Барбер",
    icon: Award,
    description: "Топовый барбер сети с высшей проф-позицией, работает на премиальной косметике",
    features: ["Всё от Топ-Барбера", "Премиальная косметика", "Graham Hill / DEPOT", "VIP-обслуживание"],
  },
  {
    name: "Эксперт",
    icon: Star,
    description: "Сертифицированный мастер с международной прокачкой, 3+ лет в профессии",
    features: ["Максимальный уровень", "Трихология & колористика", "Экспресс-уход для лица", "Премиальное мытьё головы"],
  },
];

const LoyaltySection = () => {
  const [activeTier, setActiveTier] = useState(0);

  return (
    <section className="py-20 px-4 border-t border-border/20">
      <div className="container max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-5xl md:text-7xl font-bold text-foreground uppercase italic mb-4"
        >
          Уровни мастеров
        </motion.h2>
        <p className="text-muted-foreground font-body text-sm mb-12 max-w-xl">
          Чёткая система грейдов — каждый уровень подтверждён реальным мастерством и сертификацией
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {tiers.map((tier, i) => (
            <button
              key={tier.name}
              onClick={() => setActiveTier(i)}
              className={`border p-5 text-left transition-all duration-300 ${
                activeTier === i
                  ? "border-primary bg-primary/5"
                  : "border-border/30 hover:border-border"
              }`}
            >
              <tier.icon
                size={24}
                className={`mb-3 ${activeTier === i ? "text-primary" : "text-muted-foreground"}`}
              />
              <p className={`font-heading text-sm uppercase ${activeTier === i ? "text-primary" : "text-foreground"}`}>
                {tier.name}
              </p>
            </button>
          ))}
        </div>

        <motion.div
          key={activeTier}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-border/30 p-8 md:p-10"
        >
          <div className="flex items-center gap-3 mb-4">
            {(() => {
              const Icon = tiers[activeTier].icon;
              return <Icon size={28} className="text-primary" />;
            })()}
            <h3 className="font-heading text-2xl uppercase text-foreground">{tiers[activeTier].name}</h3>
          </div>
          <p className="text-muted-foreground font-body text-sm mb-6">{tiers[activeTier].description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tiers[activeTier].features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-primary flex-shrink-0" />
                <p className="text-foreground/80 text-sm font-body">{feature}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LoyaltySection;
