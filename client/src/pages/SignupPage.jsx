import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthPageLayout, {
  AuthField,
  PasswordField,
  PasswordStrength,
  SubmitButton,
  MailIcon,
  UserIcon,
  errorBoxClass,
  footerLinkClass,
} from "../components/AuthPageLayout";

export default function SignupPage() {
  const nav = useNavigate();
  const { user, loading, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
      await signup({ email, username, password });
      nav("/", { replace: true });
    } catch (err) {
      setError(err.message || "We couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Create your account"
      subtitle="It takes a minute. You'll be logged in straight away."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <AuthField
          label="Email"
          icon={MailIcon}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
        />

        <AuthField
          label="Username"
          hint="— this is how friends find you"
          icon={UserIcon}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="john"
        />

        <div>
          <PasswordField
            label="Password"
            hint="— at least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Create a password"
          />
          <PasswordStrength value={password} />
        </div>

        {error ? (
          <div className={errorBoxClass} role="alert">
            {error}
          </div>
        ) : null}

        <SubmitButton loading={submitting} loadingText="Creating your account…">
          Create account
        </SubmitButton>

        <p className="border-t border-line pt-5 text-center text-label text-fg-muted">
          Already have an account?{" "}
          <Link className={footerLinkClass} to="/login">
            Log in
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
