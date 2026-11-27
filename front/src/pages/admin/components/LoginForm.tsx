import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import Panel from "../../../common/components/Panel";
import PanelTitle from "../../../common/components/PanelTitle";
import Button from "../../../common/components/Button";
import { adminApi } from "../api/adminApi";

export interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.login(password);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Panel className="mx-auto max-w-[420px] p-[26px]">
      <PanelTitle>Вход</PanelTitle>
      <form onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-[11px] uppercase tracking-[.06em] text-muted-faint">
            Пароль
          </span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm text-foreground outline-none transition focus:border-accent"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 font-mono text-[12.5px] text-red-400">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="cta"
          className="mt-5"
          disabled={!password}
          loading={submitting}
          leftIcon={<LogIn className="h-4 w-4" />}
        >
          Войти
        </Button>
      </form>
    </Panel>
  );
}
