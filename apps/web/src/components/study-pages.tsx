"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStudy } from "./study-provider";
import { Recording } from "./recording";
import { PasswordSettings } from "./password-settings";
import {
  bank,
  tests,
  vocabulary,
  metadata,
  day,
  timezone,
  readLocal,
  type Progress,
} from "@/lib/learning";
import domain from "@/generated/core.js";
import { createDailyPractice } from "@/generated/daily-plan.js";
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">YOUR STUDY SPACE</div>
        <h1>{title}</h1>
        <p className="sub">{subtitle}</p>
      </div>
    </div>
  );
}
export function StartLink({
  ids,
  name,
  kind = "custom",
  mode = "learning",
  testId,
}: {
  ids: number[];
  name: string;
  kind?: string;
  mode?: string;
  testId?: number;
}) {
  return (
    <Link
      className="primary"
      href={
        "/practice/session?" +
        new URLSearchParams({
          ids: ids.join(","),
          name,
          kind,
          mode,
          ...(testId ? { test: String(testId) } : {}),
        })
      }
    >
      Start practice →
    </Link>
  );
}
function Resume() {
  const { checkpoint, open } = useStudy();
  return (
    <>
      {checkpoint && (
        <section className="panel resume-panel">
          <div>
            <div className="eyebrow">CONTINUE YOUR SESSION</div>
            <h3>{checkpoint.name}</h3>
            <p>
              Question {checkpoint.index + 1} / {checkpoint.questionIds.length}
            </p>
          </div>
          <Link
            className="primary"
            href={
              checkpoint.remote
                ? "/practice/" + checkpoint.remote.id
                : "/practice/session?resume=1"
            }
          >
            Resume practice →
          </Link>
        </section>
      )}
      {open
        .filter((a) => a.id !== checkpoint?.remote?.id)
        .map((a) => (
          <section key={a.id} className="panel resume-panel">
            <h3>{a.session_name}</h3>
            <Link className="secondary" href={"/practice/" + a.id}>
              Resume saved attempt →
            </Link>
          </section>
        ))}
    </>
  );
}
export function DailyCard() {
  const { progress, days } = useStudy();
  const plan = createDailyPractice({
    bank,
    history: progress.history,
    mistakes: progress.mistakes,
    minutes: progress.minutes,
    today: day(),
    activeDays: days,
    timezone: timezone(),
  });
  return (
    <section className="panel daily-card">
      <div className="eyebrow">YOUR NEXT SESSION</div>
      <h2>
        {plan.status === "ready"
          ? "A practice session that fits today"
          : "A good moment to review"}
      </h2>
      <p>
        {plan.status === "ready"
          ? `${plan.questionIds.length} questions · about ${Math.ceil(plan.estimated_seconds / 60)} minutes · ${Math.floor(plan.spent_seconds / 60)} active minutes today`
          : plan.status === "goal-complete"
            ? "Today’s time goal is complete. Come back tomorrow."
            : plan.status === "all-practiced"
              ? "All groups have been practiced today. Review your explanations or return tomorrow."
              : "No complete question group fits the time remaining today."}
      </p>
      {plan.status === "ready" && (
        <>
          <ul>
            {plan.groups.slice(0, 4).map((g) => (
              <li key={g.id}>
                Part {g.part} · {g.reason.text}
              </li>
            ))}
          </ul>
          <StartLink
            ids={plan.questionIds}
            kind="today"
            name="Today’s practice"
          />
        </>
      )}
      <p className="note">
        {plan.reviewDue} questions due for review. Suggestions use practice
        rules and estimated times; they are not a predicted TOEIC score.
      </p>
    </section>
  );
}
export function Dashboard() {
  const { ready, progress, days } = useStudy();
  const stats = domain.performance(progress.history, bank);
  return (
    <>
      <Heading
        title="A little better, every day."
        subtitle="Build your TOEIC routine, one focused session at a time."
      />
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h2>Make room for your next opportunity.</h2>
          <p>
            {progress.weeks} weeks · {progress.minutes} minutes a day · target{" "}
            {progress.target}
          </p>
          <Link className="primary" href="/practice">
            Let’s practice →
          </Link>
        </div>
        <div className="hero-art">
          <img
            src="/illustrations/study-books.svg"
            alt="Books and a growing plant"
          />
        </div>
      </section>
      <div className="stat-grid">
        {[
          ["First answers", stats.first.count],
          [
            "First-answer accuracy",
            stats.first.count ? stats.first.accuracy + "%" : "—",
          ],
          ["Active minutes today", Math.floor((days[day()] || 0) / 60)],
          ["Vocabulary learned", progress.known.length],
        ].map(([label, value]) => (
          <div className="panel stat" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {ready ? (
        <>
          <Resume />
          <DailyCard />
        </>
      ) : (
        <p role="status">Loading your study space…</p>
      )}
      <div className="parts-grid">
        {[
          "Practice all 7 parts",
          "Try a timed set",
          "Review your mistakes",
        ].map((title, i) => (
          <Link
            className="panel practice-card"
            key={title}
            href={["/practice", "/tests", "/review"][i]}
          >
            <h3>{title}</h3>
            <p>
              {
                [
                  "246 original questions with explanations.",
                  "10 sets, each with 20 questions.",
                  "Build recall through spaced review.",
                ][i]
              }
            </p>
            <span className="link">Explore →</span>
          </Link>
        ))}
      </div>
      <p className="note">
        Original educational content. Short practice sets are not full official
        TOEIC tests or calibrated score predictions.
      </p>
    </>
  );
}
export function Practice() {
  const { progress } = useStudy(),
    [count, setCount] = useState(20),
    [scope, setScope] = useState("all"),
    [mode, setMode] = useState("learning");
  return (
    <>
      <Heading
        title="Find your focus."
        subtitle="Practice each part or build a session of your own."
      />
      <Resume />
      <div className="parts-grid">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((part) => (
          <section className="panel practice-card" key={part}>
            <span className="badge">
              Part {part} · {part <= 4 ? "Listening" : "Reading"}
            </span>
            <h3>
              {
                [
                  "Photographs",
                  "Question–Response",
                  "Conversations",
                  "Talks",
                  "Incomplete Sentences",
                  "Text Completion",
                  "Reading Comprehension",
                ][part - 1]
              }
            </h3>
            <p>
              {bank.filter((q) => q.part === part).length} questions · groups
              stay together
            </p>
            <StartLink
              ids={domain
                .selectQuestions(
                  bank.filter((q) => q.part === part),
                  part === 3 ? 9 : 10,
                  progress.history,
                )
                .map((q) => q.id)}
              name={"Part " + part + " practice"}
              kind="part"
            />
          </section>
        ))}
      </div>
      <section className="panel daily-card">
        <h2>Build your own session</h2>
        <div className="form-grid">
          <label>
            Questions
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Focus
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">All parts</option>
              <option value="listening">Listening</option>
              <option value="reading">Reading</option>
            </select>
          </label>
          <label>
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="learning">Learning · check each answer</option>
              <option value="timed">Challenge · 15 minutes</option>
            </select>
          </label>
        </div>
        <div className="settings-actions">
          <StartLink
            ids={domain
              .selectQuestions(
                bank.filter(
                  (q) =>
                    scope === "all" ||
                    (scope === "listening" ? q.part <= 4 : q.part >= 5),
                ),
                count,
                progress.history,
                { balanced: scope === "all" },
              )
              .map((q) => q.id)}
            name="Custom practice"
            mode={mode}
            kind={mode === "timed" ? "timed" : "custom"}
          />
          <StartLink
            ids={domain
              .selectQuestions(
                bank.filter((q) => q.part >= 5),
                15,
                progress.history,
              )
              .map((q) => q.id)}
            name="Reading sprint"
            kind="reading"
            mode="timed"
          />
          <StartLink
            ids={domain
              .selectQuestions(bank, 14, progress.history, { balanced: true })
              .map((q) => q.id)}
            name="Balanced diagnostic"
            kind="diagnostic"
          />
        </div>
      </section>
    </>
  );
}
export function Tests() {
  return (
    <>
      <Heading
        title="Put your practice together."
        subtitle="10 original mini tests. 20 questions and 20 minutes per set."
      />
      <Resume />
      <div className="practice-grid">
        {tests.map((test) => (
          <section className="panel practice-card" key={test.id}>
            <span className="badge">
              SET {test.id.toString().padStart(2, "0")}
            </span>
            <h3>{test.title}</h3>
            <p>{test.topic}</p>
            <small>20 questions · Listening & Reading</small>
            <div className="settings-actions">
              <StartLink
                ids={test.questions}
                name={test.title}
                kind="set"
                testId={test.id}
                mode="timed"
              />
              <StartLink
                ids={test.questions}
                name={test.title}
                kind="set"
                testId={test.id}
              />
            </div>
          </section>
        ))}
      </div>
      <p className="note">
        These are short training sets, not 200-question official TOEIC
        examinations.
      </p>
    </>
  );
}
export function Plan() {
  const { progress } = useStudy();
  return (
    <>
      <Heading
        title="Your path, at your pace."
        subtitle="A practical routine for one to three months of preparation."
      />
      <DailyCard />
      <div className="week-grid">
        {Array.from({ length: progress.weeks }, (_, i) => (
          <section className="panel week-card" key={i}>
            <div className="eyebrow">WEEK {i + 1}</div>
            <h3>
              {i < progress.weeks / 3
                ? "Build your foundations"
                : i < (progress.weeks * 2) / 3
                  ? "Practice with purpose"
                  : "Build test confidence"}
            </h3>
            <ul>
              <li>{progress.minutes} active minutes per day, with breaks.</li>
              <li>
                {i < progress.weeks / 3
                  ? "Study Parts 1, 2 and grammar; discover your first-answer baseline."
                  : i < (progress.weeks * 2) / 3
                    ? "Alternate listening and reading; review errors after 1, 3 and 7 days."
                    : "Work through timed sets, review explanations, and protect your rest."}
              </li>
              <li>Learn 5 vocabulary items and replay their audio.</li>
              <li>Review weekly progress and adjust your study goal.</li>
            </ul>
          </section>
        ))}
      </div>
      <p className="note">
        This is a study framework. Target {progress.target} is your personal
        goal, not a guaranteed outcome.
      </p>
    </>
  );
}
export function Review() {
  const { progress } = useStudy(),
    schedule = domain.reviewSchedule(progress.history, bank, {
      today: day(),
      timezone: timezone(),
    }),
    due = new Set(schedule.due.map((x) => x.id)),
    pool = bank.filter(
      (q) => progress.mistakes.includes(q.id) || due.has(q.id),
    ),
    ids = domain
      .groups(bank)
      .filter((g) => g.questions.some((q) => pool.some((p) => p.id === q.id)))
      .flatMap((g) => g.questions.map((q) => q.id));
  return (
    <>
      <Heading
        title="Turn mistakes into progress."
        subtitle="Revisit the questions that deserve another look."
      />
      <section className="panel daily-card">
        <h2>{schedule.due.length} questions due today</h2>
        <p>
          Review intervals grow from 1 to 3 to 7 days after correct recall on a
          later due day. Early repetitions do not advance the schedule.
        </p>
        <p>
          {schedule.recall.count} spaced answers ·{" "}
          {schedule.recall.count
            ? schedule.recall.accuracy + "% recall accuracy"
            : "more evidence needed"}
        </p>
        {ids.length > 0 ? (
          <StartLink
            ids={domain
              .selectQuestions(
                bank.filter((q) => ids.includes(q.id)),
                50,
                progress.history,
              )
              .map((q) => q.id)}
            name="Mistake review"
            kind="review"
          />
        ) : (
          <Link className="primary" href="/practice">
            Start a practice session →
          </Link>
        )}
      </section>
      {pool.map((q) => (
        <section className="panel review-item" key={q.id}>
          <span className="badge">
            Part {q.part}
            {due.has(q.id) ? " · Due today" : ""}
          </span>
          <p>{q.prompt}</p>
          <StartLink
            ids={bank.filter((p) => p.group_id === q.group_id).map((p) => p.id)}
            name={"Review question " + q.id}
            kind="review"
          />
        </section>
      ))}
      {progress.unverified_mistakes.length > 0 && (
        <p className="note">
          {progress.unverified_mistakes.length} imported items have an unknown
          content version. They are kept in backups and excluded from assessed
          progress.
        </p>
      )}
    </>
  );
}
export function Vocabulary() {
  const { progress, update } = useStudy(),
    [index, setIndex] = useState(0),
    [flipped, setFlipped] = useState(false),
    word = vocabulary[index],
    known = progress.known.includes(index),
    asset = metadata.vocabulary[index].audio_asset_id;
  return (
    <>
      <Heading
        title="Words for the working world."
        subtitle={`${progress.known.length} / ${vocabulary.length} learned · original workplace examples`}
      />
      <section className="panel vocab-card">
        <span className="badge">
          WORD {index + 1} / {vocabulary.length}
        </span>
        <h2>{word[0]}</h2>
        <button
          className="secondary"
          type="button"
          onClick={() => setFlipped(!flipped)}
        >
          {flipped ? "Hide meaning" : "Show meaning"}
        </button>
        {flipped && (
          <>
            <p>
              {word[1]} · {word[3]}
            </p>
            <p>{word[2]}</p>
          </>
        )}
        <Recording assetId={asset} />
        <div className="vocab-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setIndex((index + vocabulary.length - 1) % vocabulary.length);
              setFlipped(false);
            }}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="primary"
            onClick={() =>
              update((s) => ({
                ...s,
                known: known
                  ? s.known.filter((i) => i !== index)
                  : [...s.known, index],
                vocabDays: [...new Set([...s.vocabDays, day()])],
              }))
            }
          >
            {known ? "✓ Learned · undo" : "Mark learned"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setIndex((index + 1) % vocabulary.length);
              setFlipped(false);
            }}
          >
            Next →
          </button>
        </div>
      </section>
    </>
  );
}
export function ProgressPage() {
  const { progress, days } = useStudy(),
    stats = domain.performance(progress.history, bank),
    schedule = domain.reviewSchedule(progress.history, bank, {
      today: day(),
      timezone: timezone(),
    });
  return (
    <>
      <Heading
        title="See how far you’ve come."
        subtitle="Separate first answers, repeated practice and spaced recall."
      />
      <div className="stat-grid">
        {[
          ["First answers", stats.first.count, stats.first.accuracy],
          ["Repeated answers", stats.repeats.count, stats.repeats.accuracy],
          ["Spaced recall", schedule.recall.count, schedule.recall.accuracy],
        ].map(([label, count, accuracy]) => (
          <div className="panel stat" key={String(label)}>
            <small>{label}</small>
            <strong>{count ? accuracy + "%" : "—"}</strong>
            <p>{count} answered</p>
          </div>
        ))}
      </div>
      <section className="panel daily-card">
        <h2>First answers by part</h2>
        {stats.parts.map((p) => (
          <div className="part-stat" key={p.part}>
            <b>Part {p.part}</b>
            <progress max={100} value={p.accuracy} />
            <span>
              {p.count ? p.accuracy + "%" : "—"} · {p.count} answers ·{" "}
              {p.confidence} confidence
            </span>
          </div>
        ))}
        <p className="note">
          At least five first answers per part are required before focus
          suggestions. Reviewed skill tags are limited; difficulty is not
          calibrated.
        </p>
      </section>
      <section className="panel daily-card">
        <h2>Active study time</h2>
        {Object.entries(days)
          .sort()
          .slice(-7)
          .map(([date, seconds]) => (
            <div className="history-row" key={date}>
              <span>{date}</span>
              <b>{Math.floor(seconds / 60)} minutes</b>
              <span>Estimated engagement</span>
            </div>
          ))}
        <p className="note">
          Counts visible, engaged practice and actual audio playback. Stops
          after two minutes without input. Imported session durations are
          excluded from daily goals.
        </p>
      </section>
      <section className="panel daily-card">
        <h2>Practice history</h2>
        {progress.history
          .slice()
          .reverse()
          .map((h, i) => (
            <div className="history-row" key={h.attemptId || i}>
              <div>
                <b>{h.name}</b>
                <p>{new Date(h.date).toLocaleDateString()}</p>
              </div>
              <span>
                {h.answers.filter((a) => a.correct).length} / {h.answers.length}
                <p>
                  {h.server_graded
                    ? "Server graded"
                    : h.assessment === "unverified"
                      ? "Unverified import"
                      : "Local / recalculated"}
                </p>
              </span>
              {h.server_graded && h.attemptId ? (
                <Link className="link" href={"/practice/" + h.attemptId}>
                  Review result →
                </Link>
              ) : (
                <span>
                  {Math.floor(h.seconds / 60)} min ·{" "}
                  {h.time_source === "active_estimate"
                    ? "active estimate"
                    : "legacy estimate"}
                </span>
              )}
            </div>
          ))}
      </section>
    </>
  );
}
export function Settings() {
  const study = useStudy(),
    { progress, update, user, status, notice, setNotice } = study,
    [email, setEmail] = useState(""),
    [incoming, setIncoming] = useState<Progress | null>(null),
    [busy, setBusy] = useState(false),
    router = useRouter();
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  function backup() {
    const blob = new Blob(
        [
          JSON.stringify(
            {
              app: "toeic-path",
              version: 1,
              exported_at: new Date().toISOString(),
              state: progress,
              session: study.checkpoint,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "toeic-path-backup-" + day() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <Heading
        title="Make this path yours."
        subtitle="Choose a sustainable routine and keep your learning safe."
      />
      <section className="panel daily-card">
        <h2>Study preferences</h2>
        <div className="form-grid">
          <label>
            Preparation length
            <select
              value={progress.weeks}
              onChange={(e) =>
                update((s) => ({ ...s, weeks: Number(e.target.value) }))
              }
            >
              {[4, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n} weeks
                </option>
              ))}
            </select>
          </label>
          <label>
            Minutes per day
            <select
              value={progress.minutes}
              onChange={(e) =>
                update((s) => ({ ...s, minutes: Number(e.target.value) }))
              }
            >
              {[20, 30, 45, 60, 90, 120].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Target score
            <input
              type="number"
              min={10}
              max={990}
              step={5}
              value={progress.target}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 10 && n <= 990 && n % 5 === 0)
                  update((s) => ({ ...s, target: n }));
              }}
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={progress.start.slice(0, 10)}
              onChange={(e) => {
                if (e.target.value)
                  update((s) => ({
                    ...s,
                    start: new Date(e.target.value + "T12:00:00").toISOString(),
                  }));
              }}
            />
          </label>
        </div>
      </section>
      <section className="panel daily-card">
        <h2>Account & cloud sync</h2>
        <p role="status">{status}</p>
        {user ? (
          <>
            <p>Signed in as {user.email}</p>
            <div className="settings-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => void action(study.reload)}
              >
                Reload cloud
              </button>
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  try {
                    const guest = readLocal<Progress>(
                      "toeic-path-v1",
                      progress,
                    );
                    setIncoming(
                      domain.validateBackup(
                        { app: "toeic-path", version: 1, state: guest },
                        bank,
                        vocabulary.length,
                        metadata.content_version,
                      ) as Progress,
                    );
                  } catch {
                    setNotice("No compatible guest progress found");
                  }
                }}
              >
                Preview guest progress import
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await study.signout();
                    router.refresh();
                  })
                }
              >
                Sign out
              </button>
            </div>
            <p className="note">
              Reload cloud keeps a local backup first. Guest progress is merged
              only when you explicitly import it.
            </p>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(() => study.signin(email));
            }}
          >
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <button className="primary" disabled={busy} type="submit">
              Email me a sign-in link
            </button>
            <p className="note">
              Open the email in this browser to finish secure sign-in. Your
              guest progress stays separate.
            </p>
            <Link className="link" href="/">
              Đăng nhập / Đăng ký bằng mật khẩu →
            </Link>
          </form>
        )}
        {notice && <p>{notice}</p>}
      </section>
      <PasswordSettings />
      <section className="panel daily-card">
        <h2>Listening voices</h2>
        <p>All listening uses the original Faye and Dmitri recordings.</p>
        <h3>Faye · Female</h3>
        <Recording text="Hello. I will read the female speaker’s lines in your practice conversations." />
        <h3>Dmitri · Male</h3>
        <Recording text="Hello. I will read the male speaker’s lines in your practice conversations." />
      </section>
      <section className="panel daily-card">
        <h2>Backup & restore</h2>
        <p>
          Moving from GitHub Pages? Export there, then import the file here.
          Browser storage cannot move automatically between website addresses.
        </p>
        <div className="settings-actions">
          <button className="secondary" type="button" onClick={backup}>
            Export my progress
          </button>
          <label>
            Preview a backup
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 5 * 1024 * 1024)
                    throw Error("Maximum backup size is 5 MB");
                  setIncoming(
                    domain.validateBackup(
                      JSON.parse(await file.text()),
                      bank,
                      vocabulary.length,
                      metadata.content_version,
                    ) as Progress,
                  );
                } catch (error) {
                  setNotice(
                    error instanceof Error ? error.message : "Invalid backup",
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {incoming && (
          <div className="explanation">
            <h3>Review before merging</h3>
            <p>
              {domain.mergeBackup(progress, incoming).added} new sessions ·{" "}
              {domain.mergeBackup(progress, incoming).duplicates} duplicates ·{" "}
              {domain.mergeBackup(progress, incoming).unverifiedAdded}{" "}
              unverified sessions.
            </p>
            <p>
              Current preferences stay unchanged. Imported server claims are
              removed; matching content is recalculated locally.
            </p>
            <button
              className="primary"
              type="button"
              onClick={() => {
                update(
                  (s) => domain.mergeBackup(s, incoming).state as Progress,
                );
                setIncoming(null);
                setNotice("Progress merged.");
              }}
            >
              Merge this backup
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => setIncoming(null)}
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </>
  );
}
