import { signInWithEmail } from "@/app/actions";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const error = getParam(params, "error");
  const message = getParam(params, "message");

  return (
    <main className="auth-shell">
      <Link className="back-link" href="/">
        <ArrowLeft size={18} aria-hidden="true" />
        홈으로
      </Link>
      <section className="auth-panel">
        <div className="auth-icon">
          <KeyRound size={24} aria-hidden="true" />
        </div>
        <p className="eyebrow">LOGIN</p>
        <h1>이메일로 정원 시작하기</h1>
        <p>이메일로 받은 로그인 링크를 누르면 러닝 기록과 식물 성장 데이터를 저장할 수 있습니다.</p>
        {message ? <div className="notice success">{message}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
        <form action={signInWithEmail} className="email-login-form">
          <label>
            <span>이메일</span>
            <input name="email" type="email" placeholder="name@example.com" required />
          </label>
          <button className="primary-button full" type="submit">
            <Mail size={18} aria-hidden="true" />
            로그인 링크 받기
          </button>
        </form>
      </section>
    </main>
  );
}
