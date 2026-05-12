import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import gallery4 from "@/assets/gallery-4.jpg";
import serviceHaircut from "@/assets/service-haircut.jpg";
import serviceShave from "@/assets/service-shave.jpg";

const images = [
  { src: gallery1, alt: "Интерьер барбершопа" },
  { src: gallery3, alt: "Результат стрижки" },
  { src: gallery2, alt: "Инструменты барбера" },
  { src: serviceHaircut, alt: "Процесс стрижки" },
  { src: gallery4, alt: "Процедура ухода" },
  { src: serviceShave, alt: "Бритьё" },
];

const GallerySection = () => {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section id="gallery" className="py-20 px-4 border-t border-border/20">
      <div className="container max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-heading text-5xl md:text-7xl font-bold text-foreground uppercase italic mb-12"
        >
          Галерея
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative aspect-[4/3] overflow-hidden cursor-pointer group"
              onClick={() => setSelected(i)}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 transition-colors duration-300" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-8"
            onClick={() => setSelected(null)}
          >
            <button className="absolute top-6 right-6 text-foreground hover:text-primary transition-colors">
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={images[selected].src}
              alt={images[selected].alt}
              className="max-w-full max-h-[80vh] object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default GallerySection;
