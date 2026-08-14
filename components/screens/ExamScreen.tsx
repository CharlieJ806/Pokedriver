"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";
import { buildExamSession, gradeExam, isExamPass, EXAM_CONST } from "@/lib/exam";
import { AudioEngine } from "@/lib/audio";
import type { ExamSession } from "@/lib/types";

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ExamScreen() {
  const questionPool = useGameStore((s) => s.questionPool);
  const setScreen = useGameStore((s) => s.setScreen);
  const recordExamResult = useGameStore((s) => s.recordExamResult);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [result, setResult] = useState<{
    score: number;
    wrongCount: number;
    pass: boolean;
    stoppedEarly?: boolean; // 答错扣满后提前终止
    unanswered?: number; // 提前交卷时未答题数(按错误计分)
  } | null>(null);
  const recordedRef = useRef(false);

  // 倒计时(250ms 间隔,线上版行为)
  useEffect(() => {
    if (!session || session.done) return;
    const timer = setInterval(() => {
      setSession((s) => {
        if (!s || s.done) return s;
        const t = s.timeLeft - 250;
        if (t <= 0) {
          // 自动交卷
          submit(s);
          return { ...s, timeLeft: 0, done: true };
        }
        return { ...s, timeLeft: t };
      });
    }, 250);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.done]);

  const submit = (sess: ExamSession) => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    // 提前交卷:未答题按错误处理,计入总分(gradeExam 已把未答算作错误)
    const { score, wrongIds } = gradeExam(sess);
    // 错题本语义统一:答对即移出,把本次答对的题 id 一并传入
    const correctIds = sess.qs
      .filter((q, i) => sess.picked[i] != null && sess.picked[i] === q.ans)
      .map((q) => q.id);
    const unanswered = sess.picked.filter((p) => p == null).length;
    recordExamResult(score, wrongIds, correctIds);
    setResult({
      score,
      wrongCount: wrongIds.length,
      pass: isExamPass(score),
      unanswered,
    });
    // 结束考试:done=true 才会渲染结算页(倒计时 effect 也会随之停止)
    setSession({ ...sess, done: true });
    AudioEngine.sfx(isExamPass(score) ? "fanfare" : "defeat");
  };

  /** 答错扣分扣到 89 分(错满 11 题)→ 立即判不合格并终止本次模拟 */
  const failImmediately = (sess: ExamSession) => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const wrongIds = sess.qs
      .filter((q, i) => sess.picked[i] != null && sess.picked[i] !== q.ans)
      .map((q) => q.id);
    const correctIds = sess.qs
      .filter((q, i) => sess.picked[i] != null && sess.picked[i] === q.ans)
      .map((q) => q.id);
    // 未答题目不再计入(考试已终止),得分 = 100 - 错题数 = 89
    const score = sess.qs.length - wrongIds.length;
    recordExamResult(score, wrongIds, correctIds);
    setResult({
      score,
      wrongCount: wrongIds.length,
      pass: false,
      stoppedEarly: true,
    });
    setSession({ ...sess, done: true });
    AudioEngine.sfx("defeat");
  };

  const start = () => {
    const sess = buildExamSession(questionPool);
    if (!sess) return;
    recordedRef.current = false;
    setResult(null);
    setSession(sess);
    AudioEngine.sfx("click");
  };

  /* ── 结果页 ── */
  if (result && session?.done) {
    return (
      <section className="screen active" id="scr-exam">
        <div className="title-inner">
          <div className={`over-title ${result.pass ? "win" : ""}`}>
            {result.pass ? "🎉 考试合格！" : "💀 未达合格线"}
          </div>
          <div className="over-stats">
            <div className="over-stat">
              得分: <b>{result.score}</b> / {session.qs.length}
            </div>
            <div className="over-stat">
              合格线: <b>{EXAM_CONST.PASS_LINE}</b>
            </div>
            <div className="over-stat">
              错题: <b>{result.wrongCount}</b> 道 (已记入错题本)
            </div>
            {result.unanswered ? (
              <div className="over-stat">
                未答: <b>{result.unanswered}</b> 道 (按错误计分)
              </div>
            ) : null}
          </div>
          <div className="over-sub">
            {result.stoppedEarly
              ? "答错满 11 题(得分已降至 89),本次模拟已终止"
              : result.unanswered
                ? `提前交卷: ${result.unanswered} 道未答题已按错误计分 · 错题已计入错题本`
                : "错题已计入错题本 · 本次答对的题已从错题本移出"}
          </div>
          <div className="over-btns">
            <button className="btn btn-primary" onClick={() => setScreen("study")}>
              返回学习中心
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ── 考试中 ── */
  if (session) {
    const q = session.qs[session.idx]!;
    const picked = session.picked[session.idx];
    // 已答错题数(满分 100,答错一题扣 1 分)
    const wrongSoFar = session.picked.filter(
      (p, i) => p != null && p !== session.qs[i]!.ans,
    ).length;

    const pick = (i: number) => {
      if (picked != null) return; // 先选择后不可修改
      const picked2 = [...session.picked];
      picked2[session.idx] = i;
      const next: ExamSession = { ...session, picked: picked2 };
      setSession(next);
      if (i !== q.ans) {
        // 得分扣到 89 分(错满 11 题)直接判不合格并停止本次模拟
        if (next.qs.length - (wrongSoFar + 1) <= 89) {
          failImmediately(next);
        }
      }
    };

    const toggleMark = () => {
      setSession((s) => {
        if (!s) return s;
        const marked = [...s.marked];
        marked[s.idx] = !marked[s.idx];
        return { ...s, marked };
      });
    };

    const jump = (i: number) => {
      setSession((s) => (s ? { ...s, idx: i } : s));
    };

    const unanswered = session.picked.filter((p) => p == null).length;
    const submitNow = () => {
      // 有未答题时先确认:未答题按错误处理计入总成绩
      if (unanswered > 0) {
        if (
          !window.confirm(
            `还有 ${unanswered} 题未作答,未答题将按错误处理计入总成绩。确定交卷吗？`,
          )
        ) {
          return;
        }
      }
      submit(session);
    };

    return (
      <section className="screen active" id="scr-exam">
        <div className="title-inner" style={{ justifyContent: "flex-start", paddingTop: 16 }}>
          <div className="set-row">
            <div style={{ fontWeight: 800 }}>
              科目一模拟 · {session.idx + 1}/{session.qs.length}
            </div>
            <div style={{ fontWeight: 800, color: "var(--gold)", fontSize: 13 }}>
              得分 {session.qs.length - wrongSoFar}
            </div>
            <div className="exam-timer">⏱ {fmtTime(session.timeLeft)}</div>
          </div>

          <div className="exam-body">
            <div className="exam-main">
              <div className="exam-q">{q.q}</div>

              <div className="battle-options" style={{ flexDirection: "column" }}>
                {q.opts.map((opt, i) => (
                  <button
                    key={i}
                    className={
                      "battle-opt-btn" +
                      (picked === i ? (i === q.ans ? " correct" : " wrong") : "") +
                      (picked != null ? " disabled" : "")
                    }
                    disabled={picked != null}
                    onClick={() => pick(i)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {picked != null && (
                <div className="dim" style={{ textAlign: "center", padding: "4px 0 0" }}>
                  已作答,不可修改 · 答错扣 1 分
                </div>
              )}

              <div className="set-row">
                <button
                  className={`btn-mini ${session.marked[session.idx] ? "active" : ""}`}
                  onClick={toggleMark}
                >
                  🚩 {session.marked[session.idx] ? "取消标记" : "标记存疑"}
                </button>
                <button
                  className="btn-mini"
                  disabled={session.idx <= 0}
                  onClick={() => jump(session.idx - 1)}
                >
                  ‹ 上一题
                </button>
                <button
                  className="btn-mini"
                  disabled={session.idx >= session.qs.length - 1}
                  onClick={() => jump(session.idx + 1)}
                >
                  下一题 ›
                </button>
              </div>
            </div>

            {/* 题号导航(桌面端右侧边栏) */}
            <div className="exam-nav">
              <div className="exam-grid">
                {session.qs.map((_, i) => (
                  <button
                    key={i}
                    className={`exam-cell ${
                      i === session.idx ? "current" : ""
                    } ${session.picked[i] != null ? "answered" : ""} ${
                      session.marked[i] ? "marked" : ""
                    }`}
                    onClick={() => jump(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button className="btn btn-primary" onClick={submitNow}>
                交卷
              </button>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (window.confirm("确定要退出考试吗？本次成绩将不记录。")) {
                // setSession(null) 会触发计时 effect 的 cleanup 自动清计时器
                recordedRef.current = true; // 防止退出后被交卷逻辑记录
                setSession(null);
                setResult(null);
                setScreen("study");
              }
            }}
          >
            ✖ 退出考试 (不记录成绩)
          </button>
        </div>
      </section>
    );
  }

  /* ── 开考确认 ── */
  return (
    <section className="screen active" id="scr-exam">
      <div className="title-inner">
        <div className="title-logo">
          <div className="logo-top">科目一模拟</div>
          <div className="logo-sub">正式模考</div>
        </div>
        <div className="over-stats">
          <div className="over-stat">题目: {EXAM_CONST.COUNT} 题</div>
          <div className="over-stat">时间: {EXAM_CONST.TIME_MS / 60000} 分钟</div>
          <div className="over-stat">合格线: {EXAM_CONST.PASS_LINE} 分</div>
        </div>
        <div className="over-sub">
          每题作答后不可修改,答错扣 1 分;得分扣至 89 分立即判不合格并终止。可提前交卷,未答题按错误计分。错题计入错题本。
        </div>
        <div className="over-btns">
          <button
            className="btn btn-primary"
            disabled={questionPool.length < EXAM_CONST.COUNT}
            onClick={start}
          >
            开始考试
          </button>
          <button className="btn" onClick={() => setScreen("study")}>
            返回
          </button>
        </div>
      </div>
    </section>
  );
}
