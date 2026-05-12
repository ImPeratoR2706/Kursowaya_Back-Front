import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const links = [
  { label: "Услуги", href: "#services" },
  { label: "Команда", href: "#team" },
  { label: "Галерея", href: "#gallery" },
  { label: "О нас", href: "#about" },
  { label: "Запись", href: "#booking" },
  { label: "Контакты", href: "#contacts" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (href: string) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur-md border-b border-border/30" : "bg-transparent"
      }`}
    >
      <div className="container max-w-7xl flex items-center justify-between h-20 px-6">
        <a href="#" className="font-heading text-2xl font-bold text-foreground uppercase tracking-wider select-none">
          STEEL<span className="text-primary">&</span>BLADE
        </a>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="font-body text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              {l.label}
            </button>
          ))}
          <Link
            to="/login"
            className="flex items-center gap-2 border border-primary/50 text-primary font-heading text-xs uppercase tracking-[0.15em] px-4 py-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            <User className="w-3 h-3" />
            Кабинет
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-foreground z-50"
          aria-label="Меню"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile fullscreen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/98 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-6"
          >
            {links.map((l, i) => (
              <motion.button
                key={l.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => scrollTo(l.href)}
                className="font-heading text-3xl uppercase tracking-wider text-foreground hover:text-primary transition-colors"
              >
                {l.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
