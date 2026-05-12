import { motion } from "framer-motion";
import barber1 from "@/assets/barber-1.jpg";
import barber2 from "@/assets/barber-2.jpg";
import barber3 from "@/assets/barber-3.jpg";

const team = [
  {
    name: "Артём Волков",
    role: "Бренд-Барбер",
    experience: "7 лет опыта",
    image: barber1,
    speciality: "Классические стрижки, моделирование бороды",
  },
  {
    name: "Дмитрий Козлов",
    role: "Топ-Барбер",
    experience: "5 лет опыта",
    image: barber2,
    speciality: "Фейды, современные стрижки",
  },
  {
    name: "Максим Соколов",
    role: "Эксперт",
    experience: "10 лет опыта",
    image: barber3,
    speciality: "Королевское бритьё, камуфляж седины",
  },
];

const TeamSection = () => {
  return (
    <section id="team" className="py-20 px-4 border-t border-border/20">
      <div className="container max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-5xl md:text-7xl font-bold text-foreground uppercase italic mb-12"
        >
          Команда
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="group relative overflow-hidden border border-border/30 hover:border-primary/30 transition-all duration-500"
            >
              <div className="relative h-80 overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  width={512}
                  height={640}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading text-xl uppercase text-foreground">{member.name}</h3>
                  <span className="text-primary text-xs font-heading uppercase tracking-wider border border-primary/30 px-2 py-1">
                    {member.role}
                  </span>
                </div>
                <p className="text-primary text-xs font-body uppercase tracking-wider mb-2">{member.experience}</p>
                <p className="text-muted-foreground text-sm font-body">{member.speciality}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
