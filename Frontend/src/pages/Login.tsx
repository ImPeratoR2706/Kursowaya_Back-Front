import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { validateEmail, validatePassword, validatePersonName } from "@/lib/formValidation";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, register, user, bootstrapping } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!bootstrapping && user) navigate("/dashboard", { replace: true });
  }, [bootstrapping, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      toast({ title: "Проверьте форму", description: emailErr, variant: "destructive" });
      return;
    }
    const passwordErr = validatePassword(password);
    if (passwordErr) {
      toast({ title: "Проверьте форму", description: passwordErr, variant: "destructive" });
      return;
    }
    if (isRegister) {
      const ln = validatePersonName(lastName, "Фамилия");
      const fn = validatePersonName(name, "Имя");
      const pat = validatePersonName(patronymic, "Отчество");
      const first = ln || fn || pat;
      if (first) {
        toast({ title: "Проверьте форму", description: first, variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);
    try {
      if (isRegister) {
        const parts = [lastName.trim(), name.trim(), patronymic.trim()].filter(Boolean);
        const fullName = parts.join(" ").trim();
        await register(fullName || name, email, password);
      } else {
        await login(email.trim(), password);
      }
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось выполнить запрос",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground uppercase italic">
            STEEL<span className="text-primary">&</span>BLADE
          </h1>
          <p className="text-muted-foreground text-sm font-body mt-2">
            {isRegister ? "Создание аккаунта" : "Вход в личный кабинет"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="border border-border/40 p-8 space-y-5">
          {isRegister && (
            <>
              <div>
                <label htmlFor="lastName" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
                  Фамилия
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Ваша фамилия"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
                  Имя
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Ваше имя"
                />
              </div>
              <div>
                <label htmlFor="patronymic" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
                  Отчество
                </label>
                <input
                  id="patronymic"
                  type="text"
                  required
                  value={patronymic}
                  onChange={(e) => setPatronymic(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Ваше отчество"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
              placeholder="mail@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs uppercase tracking-wider text-muted-foreground font-body mb-2">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary/50 border border-border/40 text-foreground font-body text-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || bootstrapping}
            className="w-full border border-primary text-primary font-heading text-sm uppercase tracking-[0.2em] px-6 py-4 hover:bg-primary hover:text-primary-foreground transition-all duration-300 disabled:opacity-50"
          >
            {submitting ? "Подождите…" : isRegister ? "Зарегистрироваться" : "Войти"}
          </button>

          <p className="text-center text-muted-foreground text-xs font-body">
            {isRegister ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary hover:underline"
            >
              {isRegister ? "Войти" : "Зарегистрироваться"}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
