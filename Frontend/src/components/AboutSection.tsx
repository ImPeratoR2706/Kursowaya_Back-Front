import { motion } from "framer-motion";

const stats = [
  { value: "200+", label: "Филиалов" },
  { value: "500K+", label: "Довольных клиентов" },
  { value: "1000+", label: "Барберов" },
  { value: "4.9", label: "Средний рейтинг" },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-20 px-4 border-t border-border/20">
      <div className="container max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-heading text-5xl md:text-7xl font-bold text-foreground uppercase italic mb-8"
            >
              О нас
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <p className="text-muted-foreground leading-relaxed font-body text-sm">
                <span className="text-foreground font-semibold">Steel&Blade</span> — крупнейшая сеть барбершопов, 
                объединяющая более 200 филиалов по всей России. Мы не просто стрижём — мы создаём культуру 
                мужского ухода за собой.
              </p>
              <p className="text-muted-foreground leading-relaxed font-body text-sm">
                Каждый наш мастер проходит строгую сертификацию и постоянно повышает квалификацию. 
                Мы используем только премиальную косметику от ведущих мировых брендов: Graham Hill, 
                DEPOT, London Grooming, Solomon's, RHEA.
              </p>
              <p className="text-muted-foreground leading-relaxed font-body text-sm">
                У нас чёткая система грейдов: Барбер → Топ-Барбер → Бренд-Барбер → Эксперт. 
                Каждый уровень подтверждён реальным мастерством и сертификацией.
              </p>
            </motion.div>

            {/* App download CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-8 border border-border/40 p-6"
            >
              <p className="text-primary font-heading text-lg uppercase mb-2">Скачай приложение</p>
              <p className="text-muted-foreground text-xs font-body mb-4">
                Отслеживай кешбэк за услуги, записывайся онлайн и получай уведомления об акциях
              </p>
              <div className="flex gap-3">
                <button className="border border-border text-foreground font-body text-xs px-5 py-3 hover:border-primary hover:text-primary transition-colors">
                  App Store
                </button>
                <button className="border border-border text-foreground font-body text-xs px-5 py-3 hover:border-primary hover:text-primary transition-colors">
                  Google Play
                </button>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border border-border/30 p-8 text-center hover:border-primary/30 transition-colors duration-500"
              >
                <div className="font-heading text-4xl md:text-5xl font-bold text-primary mb-2 italic">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-body">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
