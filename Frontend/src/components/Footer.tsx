import { motion } from "framer-motion";
import { MapPin, Phone, Clock, MessageCircle, Send } from "lucide-react";

const Footer = () => {
  return (
    <footer id="contacts" className="border-t border-border/20 pt-20 pb-8 px-4">
      <div className="container max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div className="md:col-span-1">
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-heading text-3xl font-bold text-foreground uppercase mb-4"
            >
              STEEL<span className="text-primary">&</span>BLADE
            </motion.h3>
            <p className="text-muted-foreground text-xs leading-relaxed font-body mb-6">
              Крупнейшая сеть барбершопов России. Стрижём и бреем с 2018 года.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                <Send size={18} />
              </a>
              <a href="#" className="w-10 h-10 border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm uppercase text-foreground tracking-wider mb-5">Контакты</h4>
            <div className="space-y-4">
              <div className="border border-border/30 bg-secondary/20 p-4">
                <div className="flex items-start gap-3">
                  <Phone size={14} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-foreground text-sm font-body">+7 (999) 123-45-67</p>
                    <p className="text-muted-foreground text-xs font-body mt-1">Телефон для связи</p>
                  </div>
                </div>
              </div>
              <div className="border border-border/30 bg-secondary/20 p-4">
                <div className="flex items-start gap-3">
                  <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-foreground text-sm font-body">г. Москва, ул. Тверская, 1</p>
                    <p className="text-muted-foreground text-xs font-body mt-1">Адрес салона</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm uppercase text-foreground tracking-wider mb-5">Часы работы</h4>
            <div className="border border-border/30 bg-secondary/20 p-4">
              <div className="flex items-start gap-3">
                <Clock size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-body">Пн–Пт: 10:00 – 22:00</p>
                  <p className="text-foreground text-sm font-body">Сб–Вс: 10:00 – 21:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground/40 text-xs font-body tracking-wider">
            © 2026 Steel&Blade. Все права защищены.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-muted-foreground/40 text-xs font-body hover:text-muted-foreground transition-colors">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-muted-foreground/40 text-xs font-body hover:text-muted-foreground transition-colors">
              Оферта
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
