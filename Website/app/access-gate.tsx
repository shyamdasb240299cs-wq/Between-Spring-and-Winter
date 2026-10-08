"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";

export const accessSessionKey = "between-spring-access-v2";

export default function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    field.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previous; };
  }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passcode === "160123") {
      try { sessionStorage.setItem(accessSessionKey, "granted"); } catch {}
      onUnlock();
    } else {
      setError(true);
      field.current?.focus({ preventScroll: true });
      field.current?.select();
    }
  }
  return <div className="access-gate" role="dialog" aria-modal="true" aria-labelledby="access-title" aria-describedby="access-description">
    <div className="access-card">
      <div className="access-art" aria-hidden="true">
        <span className="access-art-season">春 <span>THE FIRST SEASON</span></span>
        <div className="access-art-caption"><span>A story, kept just for you.</span><p>Some worlds begin<br/>with a little secret.</p></div>
      </div>
      <div className="access-paper">
        <div className="access-seal" aria-hidden="true"><LockKeyhole size={19} strokeWidth={1.3}/></div>
        <p className="access-eyebrow">FOR AAMI, WITH LOVE</p>
        <h1 id="access-title">Between<br/><em>Spring</em> <span>&amp;</span> Winter</h1>
        <div className="access-divider" aria-hidden="true"><span>✿</span></div>
        <p id="access-description" className="access-description">A little world waiting for you.<br/>Enter our secret to step inside.</p>
        <form onSubmit={submit} className="access-form">
          <label htmlFor="story-passcode">Your secret passcode</label>
          <div className={"access-field" + (error ? " has-error" : "")}>
            <input ref={field} id="story-passcode" name="passcode" type={visible ? "text" : "password"} inputMode="numeric" value={passcode} onChange={event => { setPasscode(event.target.value); setError(false); }} placeholder="Enter the passcode" autoComplete="off" autoCapitalize="none" spellCheck={false} required aria-invalid={error} aria-describedby="access-feedback"/>
            <button className="access-visibility" type="button" aria-label={visible ? "Hide passcode" : "Show passcode"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          </div>
          <p id="access-feedback" className="access-feedback" aria-live="polite">{error ? "That isn’t our secret. Try once more." : "Only you have the key to this little world."}</p>
          <button className="access-submit" type="submit"><span>Open our little world</span><ArrowRight size={18} strokeWidth={1.5}/></button>
        </form>
        <p className="access-signature">Made for you, <em>by Shyamu</em></p>
      </div>
    </div>
  </div>;
}
