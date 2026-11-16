"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStudy } from "./study-provider";
import { Recording } from "./recording";
import { useStudyActivity } from "./use-study-activity";
import { createAnswerQueue } from "@/generated/answer-queue.js";
import domain from "@/generated/core.js";
import {
  bank,
  scenes,
  tests,
  metadata,
  validCheckpoint,
  readLocal,
  writeLocal,
  type Question,
  type Checkpoint,
  type Snapshot,
  type Feedback,
} from "@/lib/learning";
type QuizState = {
  cp: Checkpoint;
  questions: Question[];
  feedback: Record<number, Feedback>;
  result: Snapshot["result"];
};
export function Quiz({ attemptId }: { attemptId?: string }) {
  const study = useStudy(),
    studyRef = useRef(study);
  studyRef.current = study;
  const params = useSearchParams(),
    router = useRouter(),
    [quiz, setQuiz] = useState<QuizState | null>(null),
    quizRef = useRef(quiz),
    [message, setMessage] = useState("Loading your practice…"),
    [busy, setBusy] = useState(false),
    [syncStatus, setSyncStatus] = useState(""),
    [remaining, setRemaining] = useState(0),
    queue = useRef<ReturnType<typeof createAnswerQueue> | null>(null),
    epoch = useRef(0),
    clock = useRef({ server: Date.now(), mono: 0 }),
    starting = useRef(false),
    finishRef = useRef<() => Promise<void>>(async () => {});
  quizRef.current = quiz;
  const owner = study.user?.id ?? null;
  function persist(q: QuizState) {
    quizRef.current = q;
    setQuiz(q);
    if (!q.result) studyRef.current.saveCheckpoint(q.cp);
    else if (studyRef.current.checkpoint?.id === q.cp.id)
      studyRef.current.saveCheckpoint(null);
  }
  function installQueue(cp: Checkpoint) {
    queue.current?.close();
    if (!cp.remote) {
      queue.current = null;
      return;
    }
    const thisEpoch = epoch.current,
      remote = cp.remote;
    queue.current = createAnswerQueue({
      revision: remote.revision,
      pending: remote.pending,
      save: (id: number, choice: number, revision: number) =>
        studyRef.current.repo.savePracticeAnswer(
          remote.id,
          id,
          choice,
          revision,
        ),
      onStatus: (status: string) => {
        if (thisEpoch === epoch.current) setSyncStatus(status);
      },
      onAck: (_id: number, _choice: number, revision: number) => {
        if (thisEpoch !== epoch.current || !quizRef.current) return;
        const next = {
          ...quizRef.current,
          cp: {
            ...quizRef.current.cp,
            remote: {
              ...remote,
              revision,
              pending: queue.current?.pending || {},
            },
          },
        };
        persist(next);
      },
    });
  }
  function fromSnapshot(
    snapshot: Snapshot,
    saved: Checkpoint | null,
  ): QuizState {
    const questions = snapshot.questions.map((item) => {
      const local = bank.find((q) => q.id === item.question_id);
      if (!local || local.content_version !== item.content_version)
        throw Error(
          "This session uses a different content version. Export a backup and refresh the app.",
        );
      const question = { ...local, ...item.snapshot, id: item.question_id };
      if (!snapshot.result) {
        delete question.answer;
        delete question.explanation;
      }
      return question;
    });
    const a = snapshot.attempt,
      start = Date.parse(a.started_at),
      deadline = a.expires_at ? Date.parse(a.expires_at) : null;
    clock.current = {
      server: Date.parse(snapshot.server_now),
      mono: performance.now(),
    };
    const pending =
      saved?.remote?.id === a.id ? { ...saved.remote.pending } : {};
    for (const [id, choice] of Object.entries(pending))
      if (snapshot.answers[Number(id)] === choice) delete pending[Number(id)];
    if (Object.keys(pending).length && saved?.remote?.revision !== a.revision)
      throw Error(
        "Cloud conflict: this attempt changed in another tab. Local answers are preserved. Export your backup, then load the server version.",
      );
    return {
      cp: {
        version: 1,
        contentVersion: metadata.content_version,
        id: a.id,
        kind: a.kind,
        name: a.session_name,
        questionIds: questions.map((q) => q.id),
        index: Math.min(saved?.index || 0, questions.length - 1),
        answers: { ...snapshot.answers, ...pending },
        checked: !!snapshot.checked.includes(
          questions[Math.min(saved?.index || 0, questions.length - 1)].id,
        ),
        start,
        limit: deadline ? (deadline - start) / 1000 : 0,
        deadline,
        activeMilliseconds: (snapshot.active_seconds || 0) * 1000,
        setId: a.test_id,
        remote: { id: a.id, ownerId: a.user_id, revision: a.revision, pending },
      },
      questions,
      feedback: Object.fromEntries(
        snapshot.feedback.map((f) => [f.question_id, f]),
      ),
      result: snapshot.result,
    };
  }
  useEffect(() => {
    if (!study.ready) return;
    let cancelled = false;
    const thisEpoch = ++epoch.current;
    setQuiz(null);
    setMessage("Loading your practice…");
    queue.current?.close();
    starting.current = false;
    async function boot() {
      try {
        const saved = validCheckpoint(study.checkpoint, study.progress.history);
        const remote = attemptId || (params.get("resume") && saved?.remote?.id);
        if (remote) {
          if (!owner) {
            setMessage("Sign in to resume this account’s practice.");
            return;
          }
          const snapshot = (await study.repo.practiceSnapshot(
            remote,
          )) as Snapshot;
          if (cancelled) return;
          const next = fromSnapshot(
            snapshot,
            saved?.remote?.id === remote ? saved : null,
          );
          if (snapshot.attempt.user_id !== owner)
            throw Error(
              "This practice does not belong to the signed-in account.",
            );
          persist(next);
          installQueue(next.cp);
          if (queue.current?.size) void queue.current.flush();
          setMessage("");
          return;
        }
        if (
          params.get("resume") ||
          (!owner &&
            saved &&
            !saved.remote &&
            saved.questionIds.join(",") === params.get("ids") &&
            saved.kind === (params.get("kind") || "custom"))
        ) {
          if (!saved || saved.remote)
            throw Error("No compatible device checkpoint is available.");
          clock.current = { server: Date.now(), mono: performance.now() };
          persist({
            cp: saved,
            questions: saved.questionIds.map(
              (id) => bank.find((q) => q.id === id)!,
            ),
            feedback: {},
            result: null,
          });
          setMessage("");
          return;
        }
        const ids = (params.get("ids") || "")
            .split(",")
            .filter(Boolean)
            .map(Number),
          allowed = [
            "part",
            "set",
            "custom",
            "review",
            "reading",
            "timed",
            "diagnostic",
            "daily",
            "today",
          ],
          kind = allowed.includes(params.get("kind") || "")
            ? params.get("kind")!
            : "custom",
          mode = params.get("mode") === "timed" ? "timed" : "learning",
          testId = Number(params.get("test")) || null,
          test = tests.find((t) => t.id === testId);
        if (
          !ids.length ||
          ids.length > 50 ||
          new Set(ids).size !== ids.length ||
          ids.some((id) => !bank.some((q) => q.id === id))
        )
          throw Error("Choose a valid practice session from the library.");
        for (const id of ids) {
          const q = bank.find((q) => q.id === id)!;
          if (
            bank.some(
              (item) => item.group_id === q.group_id && !ids.includes(item.id),
            )
          )
            throw Error(
              "Question groups must stay together. Please choose a complete session.",
            );
        }
        if (
          kind === "set" &&
          (!test || JSON.stringify(ids) !== JSON.stringify(test.questions))
        )
          throw Error("This practice set is invalid.");
        const name = (params.get("name") || "Practice").slice(0, 200),
          now = Date.now(),
          limit =
            mode === "timed"
              ? kind === "set"
                ? 1200
                : kind === "reading"
                  ? 720
                  : 900
              : 0;
        if (owner) {
          starting.current = true;
          const intentKey = study.storageKey + "-start-intent",
            config = JSON.stringify({ ids, mode, testId, kind }),
            old = readLocal<{ config: string; key: string } | null>(
              intentKey,
              null,
            ),
            key = old?.config === config ? old.key : crypto.randomUUID();
          writeLocal(intentKey, { config, key });
          const snapshot = (await study.repo.beginPractice({
            ids,
            key,
            mode,
            testId,
            kind,
            ownerId: owner,
          })) as Snapshot;
          if (cancelled || thisEpoch !== epoch.current) return;
          const next = fromSnapshot(snapshot, null);
          persist(next);
          installQueue(next.cp);
          localStorage.removeItem(intentKey);
          router.replace("/practice/" + snapshot.attempt.id, { scroll: false });
          setMessage("");
          return;
        }
        clock.current = { server: now, mono: performance.now() };
        persist({
          cp: {
            version: 1,
            contentVersion: metadata.content_version,
            id: "local-" + crypto.randomUUID(),
            kind,
            name,
            questionIds: ids,
            index: 0,
            answers: {},
            checked: false,
            start: now,
            limit,
            deadline: limit ? now + limit * 1000 : null,
            activeMilliseconds: 0,
            setId: testId,
            remote: null,
          },
          questions: ids.map((id) => bank.find((q) => q.id === id)!),
          feedback: {},
          result: null,
        });
        setMessage("");
      } catch (error) {
        if (!cancelled)
          setMessage(
            error instanceof Error ? error.message : "Practice could not load",
          );
      } finally {
        starting.current = false;
      }
    }
    void boot();
    return () => {
      cancelled = true;
      epoch.current++;
      queue.current?.close();
    };
  }, [study.ready, owner, attemptId, params.toString()]);
  const stopActivity = useStudyActivity(
    quiz && !quiz.result ? quiz.cp.id : null,
    quiz && !quiz.result ? quiz.cp.remote?.id || null : null,
    quiz?.cp.deadline || null,
    (milliseconds) => {
      const current = quizRef.current;
      if (current && !current.result)
        persist({
          ...current,
          cp: {
            ...current.cp,
            activeMilliseconds: current.cp.activeMilliseconds + milliseconds,
          },
        });
    },
  );
  useEffect(() => {
    if (!quiz?.cp.limit || quiz.result) return;
    const update = () => {
      const now = clock.current.server + performance.now() - clock.current.mono,
        left = Math.max(0, Math.ceil(((quiz.cp.deadline || 0) - now) / 1000));
      setRemaining(left);
      if (!left) void finishRef.current();
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [quiz?.cp.id, quiz?.result]);
  async function choose(choice: number) {
    const q = quizRef.current;
    if (!q || q.result || busy) return;
    const id = q.questions[q.cp.index].id;
    const next = {
      ...q,
      cp: {
        ...q.cp,
        answers: { ...q.cp.answers, [id]: choice },
        checked: false,
      },
    };
    delete next.feedback[id];
    if (queue.current && next.cp.remote) {
      queue.current.enqueue(id, choice);
      next.cp.remote = { ...next.cp.remote, pending: queue.current.pending };
    }
    persist(next);
    if (queue.current) void queue.current.flush();
  }
  async function check() {
    const q = quizRef.current;
    if (!q || busy || q.result) return;
    const id = q.questions[q.cp.index].id;
    if (q.cp.answers[id] === undefined) return;
    const version = epoch.current;
    setBusy(true);
    try {
      let feedback: Feedback;
      if (q.cp.remote) {
        if (!(await queue.current?.flush()))
          throw Error(
            "Save pending answers before checking. Retry sync when online.",
          );
        feedback = await study.repo.gradePracticeAnswer(q.cp.remote.id, id);
      } else {
        const question = q.questions[q.cp.index];
        feedback = {
          question_id: id,
          answer: question.answer!,
          correct: q.cp.answers[id] === question.answer,
          explanation: question.explanation!,
        };
      }
      if (version !== epoch.current || !quizRef.current) return;
      persist({
        ...quizRef.current,
        cp: { ...quizRef.current.cp, checked: true },
        feedback: { ...quizRef.current.feedback, [id]: feedback },
      });
    } catch (error) {
      study.setNotice(error instanceof Error ? error.message : "Check failed");
    } finally {
      if (version === epoch.current) setBusy(false);
    }
  }
  const finishing = useRef(false);
  async function finish() {
    const q = quizRef.current;
    if (!q || q.result || finishing.current || busy) return;
    finishing.current = true;
    setBusy(true);
    const version = epoch.current;
    try {
      await stopActivity();
      if (version !== epoch.current) return;
      if (q.cp.remote) {
        if (!(await queue.current?.flush())) {
          const expired =
            q.cp.deadline !== null &&
            clock.current.server + performance.now() - clock.current.mono >=
              q.cp.deadline;
          if (!expired)
            throw Error(
              "Answers are pending sync. Retry sync before submitting.",
            );
          writeLocal(study.storageKey + "-expired-answer-backup", q.cp);
        }
        const snapshot = (await study.repo.completePractice(
          q.cp.remote.id,
        )) as Snapshot;
        if (version !== epoch.current) return;
        const next = fromSnapshot(snapshot, null);
        persist(next);
        await study.refresh();
      } else {
        const latest = quizRef.current!,
          answers = domain.score(latest.questions, latest.cp.answers),
          correct = answers.filter((a) => a.correct).length;
        study.addHistory({
          attemptId: q.cp.id,
          date: new Date().toISOString(),
          name: q.cp.name,
          setId: q.cp.setId,
          seconds: Math.round(latest.cp.activeMilliseconds / 1000),
          time_source: "active_estimate",
          assessment: "local_current",
          content_version: metadata.content_version,
          source: "local_practice",
          server_graded: false,
          answers,
        });
        persist({
          ...latest,
          result: {
            correct,
            total: answers.length,
            accuracy: Math.round((correct / answers.length) * 100),
          },
          feedback: Object.fromEntries(
            latest.questions.map((question) => [
              question.id,
              {
                question_id: question.id,
                answer: question.answer!,
                explanation: question.explanation!,
                correct: latest.cp.answers[question.id] === question.answer,
              },
            ]),
          ),
        });
      }
    } catch (error) {
      if (version === epoch.current)
        study.setNotice(
          error instanceof Error ? error.message : "Submission failed",
        );
    } finally {
      finishing.current = false;
      if (version === epoch.current) setBusy(false);
    }
  }
  finishRef.current = finish;
  async function retry() {
    if (!quiz?.cp.remote) return;
    try {
      if (await queue.current?.flush()) setSyncStatus("saved");
      else
        study.setNotice("Sync is still pending. Local answers are preserved.");
    } catch {
      study.setNotice("Retry failed. Keep this tab open or export a backup.");
    }
  }
  function move(index: number) {
    if (!quizRef.current || busy) return;
    const q = quizRef.current,
      nextQuestion = q.questions[index];
    persist({
      ...q,
      cp: { ...q.cp, index, checked: !!q.feedback[nextQuestion.id] },
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  if (!study.ready) return <p role="status">Loading your account…</p>;
  if (!quiz)
    return (
      <section className="panel empty">
        <p role="status">{message}</p>
        <Link className="primary" href="/practice">
          Practice library
        </Link>
        <Link className="secondary" href="/settings">
          Account settings
        </Link>
        {attemptId && owner && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              writeLocal(
                study.storageKey + "-conflict-backup",
                study.checkpoint,
              );
              study.saveCheckpoint(null);
              location.reload();
            }}
          >
            Back up local answers & load server version
          </button>
        )}
      </section>
    );
  const q = quiz.questions[quiz.cp.index],
    feedback =
      quiz.feedback[q.id] ||
      (quiz.cp.checked && !quiz.cp.remote
        ? {
            answer: q.answer!,
            explanation: q.explanation!,
            correct: quiz.cp.answers[q.id] === q.answer,
          }
        : undefined),
    timed = quiz.cp.limit > 0;
  if (quiz.result)
    return (
      <div className="quiz">
        <section className="panel empty">
          <div className="eyebrow">SESSION COMPLETE</div>
          <h1>{quiz.cp.name}</h1>
          <div className="big-score">{quiz.result.accuracy}%</div>
          <p>
            {quiz.result.correct} / {quiz.result.total} correct ·{" "}
            {quiz.cp.remote ? "Server graded" : "Graded on this device"}
          </p>
          <p className="note">
            This is practice accuracy, not an official TOEIC score.
          </p>
          <Link className="primary" href="/practice">
            Keep practicing →
          </Link>
          <Link className="secondary" href="/progress">
            My progress
          </Link>
        </section>
        {quiz.questions.map((question) => (
          <section className="panel result-question" key={question.id}>
            <span className="badge">
              Part {question.part} · Question {question.id}
            </span>
            <p>{question.prompt}</p>
            <p>
              Your answer:{" "}
              {quiz.cp.answers[question.id] === undefined
                ? "Skipped"
                : question.options[quiz.cp.answers[question.id]]}
            </p>
            <p>
              Correct answer:{" "}
              {
                question.options[
                  quiz.feedback[question.id]?.answer ?? question.answer ?? 0
                ]
              }
            </p>
            <p>
              {quiz.feedback[question.id]?.explanation || question.explanation}
            </p>
            {question.audio && (
              <details>
                <summary>Replay listening</summary>
                <Recording assetId={question.audio_asset_id} />
                <p className="passage">{question.audio}</p>
              </details>
            )}
          </section>
        ))}
      </div>
    );
  return (
    <div className="quiz">
      <div className="quiz-top">
        <div>
          <b>{quiz.cp.name}</b>
          <p>
            Question {quiz.cp.index + 1} / {quiz.questions.length} · Part{" "}
            {q.part}
          </p>
        </div>
        {timed && (
          <span className="timer" role="timer">
            {Math.floor(remaining / 60)}:
            {String(remaining % 60).padStart(2, "0")}
          </span>
        )}
        <Link className="text-btn" href="/practice">
          Save & leave
        </Link>
      </div>
      {quiz.cp.remote && (
        <p className="sync-state" role="status">
          {syncStatus === "error"
            ? "Offline — answers saved locally"
            : syncStatus === "conflict"
              ? "Conflict — local answers preserved"
              : syncStatus === "pending" || syncStatus === "saving"
                ? "Saving answers…"
                : "Answers saved to cloud"}
          {["error", "conflict", "pending"].includes(syncStatus) && (
            <button
              className="secondary"
              type="button"
              onClick={() => void retry()}
            >
              Retry sync
            </button>
          )}
        </p>
      )}
      <section className="panel quiz-card">
        <div className="eyebrow">
          {timed
            ? "TIMED PRACTICE · RESULTS AFTER SUBMISSION"
            : "LEARNING MODE · CHECK AS YOU GO"}
        </div>
        {q.scene && scenes[q.scene] && (
          <div
            className="scene"
            dangerouslySetInnerHTML={{ __html: scenes[q.scene] }}
          />
        )}
        {q.audio && <Recording key={q.id} assetId={q.audio_asset_id} />}{" "}
        {q.passage && <div className="passage">{q.passage}</div>}
        <h1 className="question-text">{q.prompt}</h1>
        <div className="answers">
          {q.options.map((option, index) => (
            <button
              key={index}
              className={
                "answer" +
                (quiz.cp.answers[q.id] === index ? " selected" : "") +
                (feedback?.answer === index ? " correct" : "") +
                (feedback &&
                quiz.cp.answers[q.id] === index &&
                !feedback.correct
                  ? " wrong"
                  : "")
              }
              type="button"
              aria-pressed={quiz.cp.answers[q.id] === index}
              disabled={busy || !!feedback}
              onClick={() => void choose(index)}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              {option}
            </button>
          ))}
        </div>
        <div className="quiz-actions">
          <button
            className="secondary"
            type="button"
            disabled={quiz.cp.index === 0 || busy}
            onClick={() => move(quiz.cp.index - 1)}
          >
            ← Previous
          </button>
          {!timed && (
            <button
              type="button"
              className="primary"
              disabled={busy || quiz.cp.answers[q.id] === undefined}
              aria-disabled={!!feedback}
              onClick={() => {
                if (!feedback) void check();
              }}
            >
              {feedback
                ? "Answer checked ✓"
                : busy
                  ? "Checking…"
                  : "Check answer"}
            </button>
          )}
          {quiz.cp.index < quiz.questions.length - 1 ? (
            <button
              className="primary"
              type="button"
              disabled={busy}
              onClick={() => move(quiz.cp.index + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              className="primary"
              type="button"
              disabled={busy}
              onClick={() => void finish()}
            >
              Finish practice
            </button>
          )}
        </div>
        {feedback && (
          <div className="explanation" role="status">
            <b>{feedback.correct ? "Correct!" : "Let’s learn from this."}</b>
            <p>
              Answer {String.fromCharCode(65 + feedback.answer)} ·{" "}
              {feedback.explanation}
            </p>
          </div>
        )}
        {q.audio && (!timed || feedback) && (
          <details className="transcript">
            <summary>Show transcript</summary>
            <p className="passage">{q.audio}</p>
          </details>
        )}
      </section>
      <div className="question-nav" aria-label="Question navigator">
        {quiz.questions.map((question, i) => (
          <button
            type="button"
            key={question.id}
            aria-current={i === quiz.cp.index ? "step" : undefined}
            className={i === quiz.cp.index ? "primary" : "secondary"}
            onClick={() => move(i)}
            disabled={busy}
          >
            {i + 1}
            {quiz.cp.answers[question.id] !== undefined ? " ✓" : ""}
          </button>
        ))}
      </div>
      <p className="note">
        Your checkpoint saves as you practice. Timed sessions keep the original
        deadline when resumed.
      </p>
    </div>
  );
}
