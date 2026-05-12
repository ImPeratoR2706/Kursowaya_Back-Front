import { motion } from "framer-motion";
import heroImg from "@/assets/hero-barbershop.jpg";

const HeroSection = () => {
  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Green gradient top corner like britva */}
      <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-primary/30 via-primary/5 to-transparent z-10 pointer-events-none" />
      
      {/* Hero image with border */}
      <div className="absolute inset-6 md:inset-8 border border-primary/30 overflow-hidden">
        <img
          src={heroImg}
          alt="Интерьер барбершопа"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" />
        <div className="absolute inset-0 bg-background/20" />
      </div>
      
      <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-foreground font-body text-sm md:text-base tracking-[0.3em] uppercase mb-4"
        >
          Сеть барбершопов
        </motion.p>
        
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-heading text-7xl md:text-[10rem] lg:text-[12rem] font-bold text-foreground uppercase leading-none mb-4 italic select-none"
        >
          STEEL<span className="text-primary">&</span>BLADE
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="font-heading text-xl md:text-3xl tracking-[0.2em] uppercase text-foreground/80 mb-12"
        >
          Стрижём&Бреем
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={scrollToBooking}
            className="border border-primary text-primary font-heading text-base uppercase tracking-[0.2em] px-12 py-5 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            Записаться онлайн
          </button>
        </motion.div>
      </div>

    </section>
  );
};

export default HeroSection;
