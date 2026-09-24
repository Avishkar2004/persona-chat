import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthPageLayout, {
  AuthField,
  PasswordField,
  SubmitButton,
  UserIcon,
  errorBoxClass,
  footerLinkClass,
} from "../components/AuthPageLayout";

export default function LoginPage() {
  const nav = useNavigate();
  const { user, loading, login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in: skip the form. Hooks above, so this return is safe.
  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ emailOrUsername, password });
      nav("/", { replace: true });
    } catch (err) {
      setError(err.message || "We couldn't log you in. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Welcome back"
      subtitle="Log in to carry on your chats."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <AuthField
          label="Email or username"
          icon={UserIcon}
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          placeholder="you@email.com or john"
        />

        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Your password"
        />

        {error ? (
          <div className={errorBoxClass} role="alert">
            {error}
          </div>
        ) : null}

        <SubmitButton loading={submitting} loadingText="Logging in…">
          Log in
        </SubmitButton>

        <p className="border-t border-line pt-5 text-center text-label text-fg-muted">
          New here?{" "}
          <Link className={footerLinkClass} to="/signup">
            Create an account
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
