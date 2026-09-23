import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type Halaqah, type HalaqahReport, type LeaveRequest, type MonthlyTest, type MonthlyTestQuestion, type NoteViolation, type SessionUser, type StudentOption } from './api';
import { Icon } from './icons';

const recordTypeLabels: Record<string, string> = { HIFZ: 'حفظ', NEAR_REVIEW: 'مراجعة قريب', FAR_REVIEW: 'مراجعة بعيد', MATN: 'متن' };
const testTypeLabels: Record<string, string> = { HIFZ: 'حفظ', REVIEW: 'مراجعة', MATN: 'متن' };
const today = () => new Date().toISOString().slice(0, 10);
const messageOf = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export function DailyProgressRecorder({ user, onSaved }: { user: SessionUser; onSaved?: (message: string) => void }) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [periods, setPeriods] = useState<Array<{ id: string; name: string; startTime: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ halaqahId: '', studentId: '', periodId: '', attended: true, recordType: 'HIFZ', surah: '', verseFrom: 1, endSurah: '', verseTo: 1, matnName: '', matnFrom: '', matnTo: '', pages: 1, rating: 5, recordDate: today(), note: '' });

  useEffect(() => {
    void Promise.all([api.listProgressStudents(), api.listPeriods()])
      .then(([s, p]) => {
        setStudents(s.students); setPeriods(p.periods);
        const first = s.students[0];
        setForm((current) => ({ ...current, halaqahId: first?.halaqah.id || '', studentId: first?.id || '', periodId: p.periods[0]?.id || '' }));
      })
      .catch((err) => setError(messageOf(err, 'تعذر تحميل بيانات المتابعة')))
      .finally(() => setLoading(false));
  }, []);

  const halaqahs = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((student) => map.set(student.halaqah.id, student.halaqah.name));
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [students]);
  const filteredStudents = students.filter((student) => student.halaqah.id === form.halaqahId);

  function chooseHalaqah(halaqahId: string) {
    const first = students.find((student) => student.halaqah.id === halaqahId);
    setForm((current) => ({ ...current, halaqahId, studentId: first?.id || '' }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = { studentId: form.studentId, periodId: form.periodId, attended: form.attended, recordDate: form.recordDate, note: form.note || null };
      if (form.attended) {
        Object.assign(payload, { recordType: form.recordType, pages: form.pages, rating: form.rating });
        if (form.recordType === 'MATN') Object.assign(payload, { matnName: form.matnName, matnFrom: form.matnFrom || null, matnTo: form.matnTo || null });
        else Object.assign(payload, { surah: form.surah, verseFrom: form.verseFrom, endSurah: form.endSurah || form.surah, verseTo: form.verseTo });
      }
      const result = await api.createProgress(payload);
      setNotice(result.message); onSaved?.(result.message);
      setForm((current) => ({ ...current, attended: true, recordType: 'HIFZ', surah: '', verseFrom: 1, endSurah: '', verseTo: 1, matnName: '', matnFrom: '', matnTo: '', pages: 1, rating: 5, note: '' }));
    } catch (err) { setError(messageOf(err, 'تعذر حفظ متابعة الطالب')); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="loading-panel">جارٍ تحميل بيانات المتابعة...</div>;
  return <section className="admin-panel">
    <div className="panel-heading"><div><span>{user.role === 'ADMIN' ? 'متابعة جميع الطلاب' : 'الحلقات المسندة إليك'}</span><h2>تسجيل المتابعة اليومية</h2></div><p>اختر الحلقة أولًا ثم الطالب وسجّل الحضور ونوع المتابعة.</p></div>
    {notice && <div className="success-box">{notice}</div>}{error && <div className="error-box">{error}</div>}
    {students.length === 0 ? <div className="empty-state"><strong>لا يوجد طلاب متاحون للتسجيل</strong></div> : <form className="record-form" onSubmit={submit}>
      <div className="record-row">
        <label>الحلقة<select value={form.halaqahId} onChange={(e) => chooseHalaqah(e.target.value)}>{halaqahs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        <label>الطالب<select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>{filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.user.fullName}</option>)}</select></label>
        <label>الحضور<select value={form.attended ? 'YES' : 'NO'} onChange={(e) => setForm({ ...form, attended: e.target.value === 'YES' })}><option value="YES">حاضر</option><option value="NO">غائب</option></select></label>
      </div>
      {form.attended && <>
        <div className="record-row">
          <label>نوع المتابعة<select value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}><option value="HIFZ">حفظ</option><option value="NEAR_REVIEW">مراجعة قريب</option><option value="FAR_REVIEW">مراجعة بعيد</option><option value="MATN">متن</option></select></label>
          <label>الفترة<select value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })}>{periods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.startTime})</option>)}</select></label>
          <label>التاريخ<input type="date" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} /></label>
        </div>
        {form.recordType === 'MATN' ? <div className="record-range-box"><strong>متابعة المتن</strong><div className="record-row">
          <label>اسم المتن<input value={form.matnName} onChange={(e) => setForm({ ...form, matnName: e.target.value })} placeholder="مثال: تحفة الأطفال" required /></label>
          <label>من<input value={form.matnFrom} onChange={(e) => setForm({ ...form, matnFrom: e.target.value })} placeholder="البيت / الباب / الموضع" /></label>
          <label>إلى<input value={form.matnTo} onChange={(e) => setForm({ ...form, matnTo: e.target.value })} placeholder="البيت / الباب / الموضع" /></label>
        </div></div> : <div className="record-range-box"><strong>{recordTypeLabels[form.recordType]}</strong>
          <div className="quran-range-line"><label>السورة<input value={form.surah} onChange={(e) => setForm({ ...form, surah: e.target.value })} required /></label><label>من آية<input type="number" min={1} value={form.verseFrom} onChange={(e) => setForm({ ...form, verseFrom: Number(e.target.value) })} /></label></div>
          <div className="quran-range-line"><label>السورة<input value={form.endSurah} onChange={(e) => setForm({ ...form, endSurah: e.target.value })} placeholder="نفس السورة إذا تُرك فارغًا" /></label><label>إلى آية<input type="number" min={1} value={form.verseTo} onChange={(e) => setForm({ ...form, verseTo: Number(e.target.value) })} /></label></div>
        </div>}
        <div className="record-row"><label>عدد الصفحات<input type="number" min={0} step="0.25" value={form.pages} onChange={(e) => setForm({ ...form, pages: Number(e.target.value) })} /></label><label>التقييم<select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>{[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} / 5</option>)}</select></label></div>
      </>}
      {!form.attended && <div className="record-row"><label>الفترة<select value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })}>{periods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.startTime})</option>)}</select></label><label>التاريخ<input type="date" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} /></label></div>}
      <label>ملاحظة<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
      <div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ المتابعة'}</button></div>
    </form>}
  </section>;
}

export function LeaveRequestsPanel({ user }: { user: SessionUser }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]); const [form, setForm] = useState({ type: 'DAY_OFF', fromDate: today(), toDate: today(), reason: '' });
  const [reviewNote, setReviewNote] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function refresh() { try { setRequests((await api.listLeaveRequests()).requests); } catch (err) { setError(messageOf(err, 'تعذر تحميل الطلبات')); } }
  useEffect(() => { void refresh(); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); try { const result = await api.createLeaveRequest(form); setNotice(result.message); setForm({ type: 'DAY_OFF', fromDate: today(), toDate: today(), reason: '' }); await refresh(); } catch (err) { setError(messageOf(err, 'تعذر إرسال الطلب')); } }
  async function review(id: string, status: 'APPROVED' | 'REJECTED') { try { const result = await api.reviewLeaveRequest(id, { status, reviewNote: reviewNote || null }); setNotice(result.message); setReviewNote(''); await refresh(); } catch (err) { setError(messageOf(err, 'تعذر تحديث الطلب')); } }
  return <>
    <section className="admin-panel"><div className="panel-heading"><div><span>الإجازات</span><h2>طلب إجازة أو يوم راحة</h2></div></div>{notice && <div className="success-box">{notice}</div>}{error && <div className="error-box">{error}</div>}
      <form className="user-form" onSubmit={submit}><label>نوع الطلب<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="DAY_OFF">يوم راحة</option><option value="VACATION">إجازة</option></select></label><label>من<input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></label><label>إلى<input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></label><label className="span-2">السبب<textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label><div className="form-actions"><button className="primary-button">إرسال الطلب</button></div></form>
    </section>
    <section className="admin-panel"><div className="panel-heading"><div><span>{user.role === 'ADMIN' ? 'جميع الطلبات' : 'طلباتي'}</span><h2>سجل الإجازات</h2></div></div>{user.role === 'ADMIN' && <label className="review-note-field">ملاحظة قرار الإدارة<input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="اختياري" /></label>}
      <div className="table-wrap"><table><thead><tr><th>صاحب الطلب</th><th>النوع</th><th>الفترة</th><th>الحالة</th><th>السبب</th>{user.role === 'ADMIN' && <th>القرار</th>}</tr></thead><tbody>{requests.map((r) => <tr key={r.id}><td>{r.requester.fullName}</td><td>{r.type === 'VACATION' ? 'إجازة' : 'يوم راحة'}</td><td>{new Date(r.fromDate).toLocaleDateString('ar-SA')} — {new Date(r.toDate || r.fromDate).toLocaleDateString('ar-SA')}</td><td><span className="status-chip">{r.status === 'PENDING' ? 'قيد المراجعة' : r.status === 'APPROVED' ? 'مقبول' : 'مرفوض'}</span></td><td>{r.reason || '—'}</td>{user.role === 'ADMIN' && <td>{r.status === 'PENDING' ? <div className="table-actions"><button className="table-action" onClick={() => void review(r.id, 'APPROVED')}><Icon name="check" /></button><button className="table-action danger" onClick={() => void review(r.id, 'REJECTED')}>×</button></div> : 'تمت المراجعة'}</td>}</tr>)}</tbody></table></div>
      {requests.length === 0 && <div className="empty-state"><strong>لا توجد طلبات</strong></div>}
    </section>
  </>;
}

export function NotesPanel({ user }: { user: SessionUser }) {
  const [targets, setTargets] = useState<Array<{ id: string; fullName: string; extra?: string }>>([]); const [notes, setNotes] = useState<NoteViolation[]>([]);
  const [form, setForm] = useState({ subjectUserId: '', kind: 'NOTE', content: '' }); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function refresh() {
    try {
      setNotes((await api.listNotes()).notes);
      if (user.role === 'TEACHER') {
        const result = await api.listProgressStudents(); const mapped = result.students.map((s) => ({ id: s.user.id, fullName: s.user.fullName, extra: s.halaqah.name })); setTargets(mapped); setForm((current) => ({ ...current, subjectUserId: current.subjectUserId || mapped[0]?.id || '' }));
      } else {
        const result = await api.listUsers(); const allowed = result.users.filter((u) => user.role === 'ADMIN' ? u.role === 'MANAGER' || u.role === 'TEACHER' : u.role === 'STUDENT'); const mapped = allowed.map((u) => ({ id: u.id, fullName: u.fullName, extra: u.loginId })); setTargets(mapped); setForm((current) => ({ ...current, subjectUserId: current.subjectUserId || mapped[0]?.id || '' }));
      }
    } catch (err) { setError(messageOf(err, 'تعذر تحميل الملاحظات')); }
  }
  useEffect(() => { void refresh(); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); try { const result = await api.createNote(form); setNotice(result.message); setForm((current) => ({ ...current, content: '', kind: 'NOTE' })); await refresh(); } catch (err) { setError(messageOf(err, 'تعذر تسجيل الملاحظة')); } }
  return <>
    <section className="admin-panel"><div className="panel-heading"><div><span>السلوك والمتابعة</span><h2>{user.role === 'ADMIN' ? 'ملاحظات ومخالفات الموظفين' : 'ملاحظات ومخالفات الطلاب'}</h2></div><p>{user.role === 'TEACHER' ? 'المعلم يستطيع التسجيل لطلاب حلقاته فقط.' : user.role === 'MANAGER' ? 'يسجل المشرف ملاحظات الطلاب خارج الحلقة.' : 'للمدير صلاحية تسجيل ملاحظات الموظفين.'}</p></div>{notice && <div className="success-box">{notice}</div>}{error && <div className="error-box">{error}</div>}
      {targets.length ? <form className="user-form" onSubmit={submit}><label>الحساب<select value={form.subjectUserId} onChange={(e) => setForm({ ...form, subjectUserId: e.target.value })}>{targets.map((t) => <option key={t.id} value={t.id}>{t.fullName} {t.extra ? '— ' + t.extra : ''}</option>)}</select></label><label>النوع<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="NOTE">ملاحظة</option><option value="VIOLATION">مخالفة</option></select></label><label className="span-2">التفاصيل<textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required /></label><div className="form-actions"><button className="primary-button">حفظ</button></div></form> : <div className="empty-state"><strong>لا توجد حسابات متاحة</strong></div>}
    </section>
    <section className="admin-panel"><div className="panel-heading"><div><span>السجل</span><h2>الملاحظات والمخالفات</h2></div></div><div className="item-list">{notes.map((n) => <div className="item-row" key={n.id}><div className="item-main"><strong>{n.subject.fullName} — {n.kind === 'VIOLATION' ? 'مخالفة' : 'ملاحظة'}</strong><span>{n.content}</span><span>بواسطة {n.author.fullName}{n.halaqah ? ' • ' + n.halaqah.name : ''}</span></div></div>)}</div>{notes.length === 0 && <div className="empty-state"><strong>لا توجد ملاحظات مسجلة</strong></div>}</section>
  </>;
}

export function MonthlyTestsPanel({ user }: { user: SessionUser }) {
  const [students, setStudents] = useState<StudentOption[]>([]); const [tests, setTests] = useState<MonthlyTest[]>([]);
  const [questions, setQuestions] = useState<MonthlyTestQuestion[]>([{ questionNumber: 1, correct: true, surah: '', ayah: 1, referenceText: '' }]);
  const [form, setForm] = useState({ halaqahId: '', studentId: '', type: 'HIFZ', matnName: '', testDate: today(), note: '' }); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  async function refresh() { try { const [s, t] = await Promise.all([api.listProgressStudents(), api.listMonthlyTests()]); setStudents(s.students); setTests(t.tests); const first = s.students[0]; setForm((current) => ({ ...current, halaqahId: current.halaqahId || first?.halaqah.id || '', studentId: current.studentId || first?.id || '' })); } catch (err) { setError(messageOf(err, 'تعذر تحميل الاختبارات')); } }
  useEffect(() => { void refresh(); }, []);
  const halaqahs = useMemo(() => { const map = new Map<string,string>(); students.forEach((s) => map.set(s.halaqah.id, s.halaqah.name)); return [...map.entries()].map(([id,name]) => ({ id,name })); }, [students]);
  const filteredStudents = students.filter((s) => s.halaqah.id === form.halaqahId); const scorePreview = questions.length ? Math.round((questions.filter((q) => q.correct).length / questions.length) * 100) : 0;
  function chooseHalaqah(halaqahId: string) { const first = students.find((s) => s.halaqah.id === halaqahId); setForm((current) => ({ ...current, halaqahId, studentId: first?.id || '' })); }
  function addQuestion() { setQuestions((current) => [...current, { questionNumber: current.length + 1, correct: true, surah: '', ayah: 1, referenceText: '' }]); }
  function updateQuestion(index: number, patch: Partial<MonthlyTestQuestion>) { setQuestions((current) => current.map((q, i) => i === index ? { ...q, ...patch } : q)); }
  function removeQuestion(index: number) { setQuestions((current) => current.filter((_, i) => i !== index).map((q, i) => ({ ...q, questionNumber: i + 1 }))); }
  async function submit(event: FormEvent) { event.preventDefault(); try { const result = await api.createMonthlyTest({ ...form, questions }); setNotice(result.message); setQuestions([{ questionNumber: 1, correct: true, surah: '', ayah: 1, referenceText: '' }]); setForm((current) => ({ ...current, note: '', matnName: '' })); await refresh(); } catch (err) { setError(messageOf(err, 'تعذر حفظ الاختبار')); } }
  return <>
    <section className="admin-panel"><div className="panel-heading"><div><span>التقييم الشهري</span><h2>اختبار شهري جديد</h2></div><div className="test-score-preview"><strong>{scorePreview}</strong><span>/100</span></div></div>{notice && <div className="success-box">{notice}</div>}{error && <div className="error-box">{error}</div>}
      {students.length ? <form onSubmit={submit}><div className="record-row"><label>الحلقة<select value={form.halaqahId} onChange={(e) => chooseHalaqah(e.target.value)}>{halaqahs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label><label>الطالب<select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>{filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.user.fullName}</option>)}</select></label><label>نوع الاختبار<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="HIFZ">حفظ</option><option value="REVIEW">مراجعة</option><option value="MATN">متن</option></select></label><label>التاريخ<input type="date" value={form.testDate} onChange={(e) => setForm({ ...form, testDate: e.target.value })} /></label></div>
        {form.type === 'MATN' && <label className="standalone-field">اسم المتن<input value={form.matnName} onChange={(e) => setForm({ ...form, matnName: e.target.value })} required /></label>}
        <div className="test-questions">{questions.map((q, index) => <div className="test-question" key={index}><div className="question-number">{q.questionNumber}</div>{form.type === 'MATN' ? <label>موضع السؤال<input value={q.referenceText || ''} onChange={(e) => updateQuestion(index, { referenceText: e.target.value })} placeholder="البيت أو الباب أو الموضع" /></label> : <><label>السورة<input value={q.surah || ''} onChange={(e) => updateQuestion(index, { surah: e.target.value })} required /></label><label>الآية<input type="number" min={1} value={q.ayah || 1} onChange={(e) => updateQuestion(index, { ayah: Number(e.target.value) })} /></label></>}<label>الإجابة<select value={q.correct ? 'TRUE' : 'FALSE'} onChange={(e) => updateQuestion(index, { correct: e.target.value === 'TRUE' })}><option value="TRUE">صحيح</option><option value="FALSE">خطأ</option></select></label>{questions.length > 1 && <button type="button" className="table-action danger" onClick={() => removeQuestion(index)}><Icon name="trash" /></button>}</div>)}<button type="button" className="secondary-button compact-button add-question" onClick={addQuestion}><Icon name="plus" size={17} />إضافة سؤال</button></div>
        <label className="standalone-field">ملاحظات عامة<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><div className="form-actions"><button className="primary-button">حفظ الاختبار — {scorePreview}/100</button></div>
      </form> : <div className="empty-state"><strong>لا يوجد طلاب متاحون للاختبار</strong></div>}
    </section>
    <section className="admin-panel"><div className="panel-heading"><div><span>النتائج</span><h2>سجل الاختبارات الشهرية</h2></div></div><div className="table-wrap"><table><thead><tr><th>التاريخ</th><th>الحلقة</th><th>الطالب</th><th>النوع</th><th>الدرجة</th><th>الأسئلة</th></tr></thead><tbody>{tests.map((t) => <tr key={t.id}><td>{new Date(t.testDate).toLocaleDateString('ar-SA')}</td><td>{t.halaqah.name}</td><td>{t.student.user.fullName}</td><td>{testTypeLabels[t.type]}</td><td><strong>{t.score}/100</strong></td><td>{t.questions.length}</td></tr>)}</tbody></table></div>{tests.length === 0 && <div className="empty-state"><strong>لا توجد اختبارات مسجلة</strong></div>}</section>
  </>;
}

export function HalaqahReportPanel({ halaqahs }: { halaqahs: Halaqah[] }) {
  const [halaqahId, setHalaqahId] = useState(halaqahs[0]?.id || ''); const [report, setReport] = useState<HalaqahReport | null>(null); const [error, setError] = useState('');
  useEffect(() => { if (!halaqahId) return; void api.getHalaqahReport(halaqahId).then((r) => { setReport(r.report); setError(''); }).catch((err) => setError(messageOf(err, 'تعذر تحميل تقرير الحلقة'))); }, [halaqahId]);
  return <section className="admin-panel"><div className="panel-heading"><div><span>تقرير الحلقة الكامل</span><h2>الحضور والتقدم والاختبارات</h2></div><select className="filter-select" value={halaqahId} onChange={(e) => setHalaqahId(e.target.value)}>{halaqahs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>{error && <div className="error-box">{error}</div>}{report && <><div className="stat-grid"><div className="stat-card"><span>الطلاب</span><strong>{report.summary.students}</strong></div><div className="stat-card"><span>الحضور</span><strong>{report.summary.attended}</strong></div><div className="stat-card"><span>الغياب</span><strong>{report.summary.absent}</strong></div><div className="stat-card"><span>متوسط الاختبارات</span><strong>{report.summary.averageTestScore.toFixed(1)}/100</strong></div></div><div className="report-summary-line">المعلم: <strong>{report.halaqah.teacher?.fullName || 'غير معيّن'}</strong> • سجلات المتابعة: {report.summary.progressRecords} • الاختبارات: {report.summary.monthlyTests}</div><div className="table-wrap"><table><thead><tr><th>الطالب</th><th>المعرف</th><th>مقدار الحفظ</th><th>الجوال</th><th>البريد</th></tr></thead><tbody>{report.halaqah.students.map((s) => <tr key={s.id}><td>{s.user.fullName}</td><td dir="ltr">{s.user.loginId}</td><td>{s.memorizedAmount || '—'}</td><td dir="ltr">{s.user.mobile || '—'}</td><td dir="ltr">{s.user.email || '—'}</td></tr>)}</tbody></table></div></>}</section>;
}