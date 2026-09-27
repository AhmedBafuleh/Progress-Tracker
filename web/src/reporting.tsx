import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  type AiAnalysisResponse,
  type AiPerson,
  type ReportStudent,
  type Role,
  type SessionUser,
  type StudentPerformanceReport,
} from './api';
import { DateField } from './dateFields';
import { Icon } from './icons';

const roleLabels: Record<Role, string> = {
  ADMIN: 'المدير',
  MANAGER: 'المشرف',
  TEACHER: 'المعلم',
  STUDENT: 'الطالب',
  PARENT: 'ولي الأمر',
};

const recordTypeLabels: Record<string, string> = {
  HIFZ: 'الحفظ',
  NEAR_REVIEW: 'المراجعة القريبة',
  FAR_REVIEW: 'المراجعة البعيدة',
  MATN: 'المتن',
};

const trendLabels: Record<string, string> = {
  IMPROVING: 'يتحسن',
  STABLE: 'مستقر',
  DECLINING: 'يحتاج متابعة',
  NEW_DATA: 'بيانات جديدة',
  NO_DATA: 'لا توجد بيانات كافية',
  INSUFFICIENT_DATA: 'بيانات غير كافية',
  NOT_APPLICABLE: 'غير منطبق',
};

const audienceLabels: Record<string, string> = {
  ADMIN: 'تقرير داخلي للإدارة',
  STUDENT: 'تقرير موجه للطالب',
  PARENT: 'تقرير موجه لولي الأمر',
  TEACHER: 'تقرير موجه للمعلم',
  MANAGER: 'تقرير موجه للمشرف',
};

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ar-SA');
}

function reportTitleForRole(role: Role) {
  if (role === 'STUDENT') return 'تقرير تقدمي';
  if (role === 'PARENT') return 'تقارير الأبناء';
  if (role === 'TEACHER') return 'تقارير طلابي';
  return 'تقارير أداء الطلاب';
}

function printCurrentReport(modeClass: string) {
  document.body.classList.add(modeClass);
  const cleanup = () => document.body.classList.remove(modeClass);
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 1500);
}

export function StandardStudentReportsPanel({ user }: { user: SessionUser }) {
  const [students, setStudents] = useState<ReportStudent[]>([]);
  const [studentId, setStudentId] = useState('');
  const [from, setFrom] = useState(daysAgoIso(29));
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<StudentPerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void api.listReportStudents()
      .then((result) => {
        setStudents(result.students);
        setStudentId(result.students[0]?.id || '');
      })
      .catch((err) => setError(messageOf(err, 'تعذر تحميل الطلاب المتاحين للتقرير')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!studentId) {
      setReport(null);
      return;
    }
    setReportLoading(true);
    setError('');
    void api.getStudentReport(studentId, from, to)
      .then((result) => setReport(result.report))
      .catch((err) => setError(messageOf(err, 'تعذر إنشاء تقرير الطالب')))
      .finally(() => setReportLoading(false));
  }, [studentId, from, to]);

  const selected = students.find((student) => student.id === studentId);

  if (loading) return <div className="loading-panel">جارٍ تحميل التقارير...</div>;

  return (
    <section className="admin-panel standard-report-panel">
      <div className="panel-heading">
        <div>
          <span>تقارير سريعة بدون ذكاء اصطناعي</span>
          <h2>{reportTitleForRole(user.role)}</h2>
        </div>
        <p>تعتمد هذه التقارير مباشرة على سجلات النظام وتعمل حتى عند عدم توفر خدمة الذكاء الاصطناعي.</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      {students.length === 0 ? (
        <div className="empty-state"><strong>لا يوجد طلاب متاحون حسب صلاحيات هذا الحساب.</strong></div>
      ) : (
        <>
          <div className="report-controls no-print">
            {students.length > 1 ? (
              <label>الطالب
                <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.user.fullName} — {student.halaqah.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="report-fixed-person"><span>الطالب</span><strong>{selected?.user.fullName}</strong></div>
            )}
            <label>من<DateField value={from} onChange={setFrom} required /></label>
            <label>إلى<DateField value={to} onChange={setTo} required /></label>
            {report && <button type="button" className="secondary-button compact-button" onClick={() => printCurrentReport('printing-standard-report')}><Icon name="file" size={17} />طباعة / حفظ PDF</button>}
          </div>

          {reportLoading ? <div className="loading-panel">جارٍ إعداد التقرير...</div> : report && (
            <div className="standard-print-report">
              <div className="report-document-header">
                <div>
                  <span>دار النور لتعليم القرآن الكريم</span>
                  <h2>تقرير أداء الطالب</h2>
                </div>
                <div className="report-identity">
                  <strong>{report.student.user.fullName}</strong>
                  <span dir="ltr">{report.student.user.loginId}</span>
                  <span>{report.student.halaqah.name}</span>
                </div>
              </div>

              <div className="report-period">الفترة: {report.period.from} — {report.period.to}</div>

              <div className="stat-grid report-stat-grid">
                <div className="stat-card"><span>الحضور</span><strong>{report.summary.attendanceRate.toFixed(0)}%</strong><small>{report.summary.attended} حاضر • {report.summary.absent} غائب</small></div>
                <div className="stat-card"><span>إجمالي الصفحات</span><strong>{report.summary.totalPages.toFixed(1)}</strong></div>
                <div className="stat-card"><span>متوسط التقييم</span><strong>{report.summary.averageRating.toFixed(1)} / 5</strong></div>
                <div className="stat-card"><span>متوسط الاختبارات</span><strong>{report.summary.averageTestScore.toFixed(1)} / 100</strong><small>{report.summary.tests} اختبار</small></div>
              </div>

              <div className="report-section">
                <div className="report-section-title"><span>تفصيل أنواع المتابعة</span><h3>الأداء الأكاديمي</h3></div>
                <div className="performance-breakdown">
                  {Object.entries(report.summary.recordTypes).map(([type, values]) => (
                    <div className="performance-card" key={type}>
                      <span>{recordTypeLabels[type] || type}</span>
                      <strong>{values.averageRating.toFixed(1)} / 5</strong>
                      <small>{values.count} سجل • {values.pages.toFixed(1)} صفحة</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="report-section">
                <div className="report-section-title"><span>مقارنة بالفترة السابقة</span><h3>الاتجاه</h3></div>
                <div className="trend-grid">
                  <div className="trend-card"><span>التقييم</span><strong>{trendLabels[report.trend.rating.direction] || report.trend.rating.direction}</strong><small>{report.trend.rating.previous.toFixed(1)} ← {report.trend.rating.current.toFixed(1)}</small></div>
                  <div className="trend-card"><span>الاختبارات</span><strong>{trendLabels[report.trend.tests.direction] || report.trend.tests.direction}</strong><small>{report.trend.tests.previous.toFixed(1)} ← {report.trend.tests.current.toFixed(1)}</small></div>
                </div>
              </div>

              <div className="report-section">
                <div className="report-section-title"><span>آخر السجلات</span><h3>المتابعة اليومية</h3></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>التاريخ</th><th>الحضور</th><th>النوع</th><th>التقييم</th><th>الصفحات</th></tr></thead>
                    <tbody>
                      {report.progress.slice(0, 15).map((entry) => (
                        <tr key={entry.id}>
                          <td>{displayDate(entry.recordDate)}</td>
                          <td>{entry.attended ? 'حاضر' : 'غائب'}</td>
                          <td>{entry.attended ? recordTypeLabels[entry.recordType || ''] || 'متابعة' : '—'}</td>
                          <td>{entry.rating ? `${entry.rating}/5` : '—'}</td>
                          <td>{entry.attended ? Number(entry.pages).toFixed(1) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="report-section">
                <div className="report-section-title"><span>الاختبارات الشهرية</span><h3>النتائج</h3></div>
                {report.tests.length ? (
                  <div className="table-wrap"><table><thead><tr><th>التاريخ</th><th>النوع</th><th>الدرجة</th><th>الملاحظات</th></tr></thead><tbody>{report.tests.slice(0, 10).map((test) => <tr key={test.id}><td>{displayDate(test.testDate)}</td><td>{test.type === 'HIFZ' ? 'حفظ' : test.type === 'REVIEW' ? 'مراجعة' : 'متن'}</td><td><strong>{test.score}/100</strong></td><td>{test.note || '—'}</td></tr>)}</tbody></table></div>
                ) : <div className="empty-state"><strong>لا توجد اختبارات في هذه الفترة.</strong></div>}
              </div>

              <div className="report-footer-note">هذا تقرير نظامي مباشر من السجلات المسجلة، وليس تقريرًا مولدًا بالذكاء الاصطناعي.</div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function AdminAiAssistantPanel() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState('');
  const [people, setPeople] = useState<AiPerson[]>([]);
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('STUDENT');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState(daysAgoIso(29));
  const [to, setTo] = useState(todayIso());
  const [audience, setAudience] = useState<'ADMIN' | 'STUDENT' | 'PARENT' | 'TEACHER' | 'MANAGER'>('ADMIN');
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<AiAnalysisResponse[]>([]);
  const [result, setResult] = useState<AiAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([api.getAiStatus(), api.listAiPeople()])
      .then(([status, peopleResult]) => {
        setConfigured(status.configured);
        setModel(status.model);
        setPeople(peopleResult.people);
        const firstStudent = peopleResult.people.find((person) => person.role === 'STUDENT') || peopleResult.people[0];
        setUserId(firstStudent?.id || '');
      })
      .catch((err) => setError(messageOf(err, 'تعذر تحميل المساعد الذكي')))
      .finally(() => setLoading(false));
  }, []);

  const filteredPeople = useMemo(
    () => people.filter((person) => roleFilter === 'ALL' || person.role === roleFilter),
    [people, roleFilter],
  );

  useEffect(() => {
    if (!filteredPeople.some((person) => person.id === userId)) setUserId(filteredPeople[0]?.id || '');
  }, [filteredPeople, userId]);

  function changePerson(id: string) {
    setUserId(id);
    setHistory([]);
    setResult(null);
    setQuestion('');
  }

  async function analyze(event?: FormEvent) {
    event?.preventDefault();
    if (!userId) return;
    setAsking(true);
    setError('');
    try {
      const response = await api.analyzePerson({
        userId,
        from,
        to,
        audience,
        question: question.trim() || null,
        previousAnswers: history.slice(-4).map((item) => item.analysis.answer || item.analysis.summary),
      });
      setResult(response);
      setHistory((current) => [...current, response].slice(-6));
      setQuestion('');
    } catch (err) {
      setError(messageOf(err, 'تعذر إنشاء التحليل الذكي'));
    } finally {
      setAsking(false);
    }
  }

  const selected = people.find((person) => person.id === userId);
  const priorityLabels = { HIGH: 'عالية', MEDIUM: 'متوسطة', LOW: 'منخفضة' };

  if (loading) return <div className="loading-panel">جارٍ تحميل المساعد الذكي...</div>;

  return (
    <>
      <section className="admin-panel ai-control-panel no-print">
        <div className="panel-heading">
          <div><span>خاص بالمدير فقط</span><h2>المساعد الذكي المؤسسي</h2></div>
          <div className={`ai-provider-status ${configured ? 'ready' : 'not-ready'}`}><i />{configured ? `جاهز • ${model}` : 'غير مهيأ'}</div>
        </div>

        {!configured && (
          <div className="ai-setup-box">
            <strong>ميزة الذكاء الاصطناعي خاصة بالمؤسسة وتعمل من خادم محلي.</strong>
            <span>شغّل Ollama على خادم الكلية وثبّت النموذج المحدد في <code>LOCAL_AI_MODEL</code>. التطبيق يتصل افتراضيًا بـ <code>http://127.0.0.1:11434</code> ولا يحتاج مفتاح API خارجيًا.</span>
          </div>
        )}
        {error && <div className="error-box">{error}</div>}

        <div className="ai-selector-grid">
          <label>نوع الحساب<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'ALL' | Role)}><option value="ALL">جميع الحسابات</option><option value="STUDENT">طالب</option><option value="TEACHER">معلم</option><option value="MANAGER">مشرف</option><option value="PARENT">ولي أمر</option><option value="ADMIN">مدير</option></select></label>
          <label>الشخص<select value={userId} onChange={(event) => changePerson(event.target.value)}>{filteredPeople.map((person) => <option key={person.id} value={person.id}>{person.fullName} — {roleLabels[person.role]}</option>)}</select></label>
          <label>من<DateField value={from} onChange={setFrom} required /></label>
          <label>إلى<DateField value={to} onChange={setTo} required /></label>
          <label>نوع التقرير<select value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)}><option value="ADMIN">داخلي للإدارة</option><option value="STUDENT">موجه للطالب</option><option value="PARENT">موجه لولي الأمر</option><option value="TEACHER">موجه للمعلم</option><option value="MANAGER">موجه للمشرف</option></select></label>
        </div>

        <div className="ai-quick-actions">
          <button type="button" className="primary-button" onClick={() => void analyze()} disabled={!configured || !userId || asking}><Icon name="sparkles" size={18} />{asking ? 'جارٍ التحليل...' : 'إنشاء تحليل شامل'}</button>
          <span>سيستخدم المساعد فقط السجلات المتاحة في النظام للفترة المختارة، ويعالجها على خادم الذكاء الاصطناعي المحلي.</span>
        </div>
      </section>

      {result && (
        <section className="admin-panel ai-result-shell">
          <div className="panel-heading no-print">
            <div><span>التحليل الحالي</span><h2>{selected?.fullName}</h2></div>
            <button type="button" className="secondary-button compact-button" onClick={() => printCurrentReport('printing-ai-report')}><Icon name="printer" size={17} />طباعة / حفظ PDF</button>
          </div>

          <div className="ai-print-report">
            <div className="ai-report-letterhead">
              <div><strong>دار النور لتعليم القرآن الكريم</strong><span>تقرير تحليل ذكي</span></div>
              <div><strong>{result.subject.fullName}</strong><span dir="ltr">{result.subject.loginId}</span></div>
            </div>
            <div className="ai-report-meta"><span>{audienceLabels[result.audience]}</span><span>الفترة: {result.period.from} — {result.period.to}</span><span>تاريخ التقرير: {todayIso()}</span></div>

            <div className="ai-report-title"><span>تحليل مساعد لاتخاذ القرار</span><h2>{result.analysis.title}</h2></div>

            <div className="ai-report-section">
              <h3>الملخص</h3>
              <p>{result.analysis.summary}</p>
            </div>

            <div className="ai-trajectory-card">
              <div><span>الاتجاه التقديري</span><strong>{trendLabels[result.analysis.trajectory.label] || result.analysis.trajectory.label}</strong></div>
              <p>{result.analysis.trajectory.explanation}</p>
            </div>

            <div className="ai-report-section">
              <h3>التوصيات</h3>
              <div className="ai-recommendations">{result.analysis.recommendations.map((recommendation, index) => <article key={index}><div><span>{priorityLabels[recommendation.priority]}</span><strong>{recommendation.title}</strong></div><p>{recommendation.reason}</p></article>)}</div>
            </div>

            <div className="ai-report-section">
              <h3>الأدلة من السجلات</h3>
              <ul>{result.analysis.evidence.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </div>

            {result.analysis.answer && <div className="ai-report-section"><h3>الإجابة</h3><p>{result.analysis.answer}</p></div>}

            {result.analysis.limitations.length > 0 && <div className="ai-limitations"><strong>حدود التحليل</strong><ul>{result.analysis.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}

            <div className="ai-report-disclaimer">هذا التقرير مولد بمساعدة الذكاء الاصطناعي اعتمادًا على السجلات المتاحة في النظام. التوصيات مساعدة لاتخاذ القرار وليست قرارًا إداريًا أو أكاديميًا تلقائيًا.</div>
          </div>

          <form className="ai-question-box no-print" onSubmit={analyze}>
            <label>اسأل المساعد عن هذا الشخص<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="مثال: لماذا تراجعت المراجعة البعيدة؟ أو قارن هذه الفترة بالفترة السابقة." /></label>
            <button className="primary-button" disabled={!configured || asking || !question.trim()}><Icon name="sparkles" size={18} />{asking ? 'جارٍ الإجابة...' : 'إرسال السؤال'}</button>
          </form>

          {history.length > 1 && <div className="ai-history no-print"><span>المحادثة الحالية: {history.length} إجابات</span></div>}
        </section>
      )}
    </>
  );
}
