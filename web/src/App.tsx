import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, clearToken, saveToken, type Role, type SessionUser } from './api';

const roleLabels: Record<Role, string> = {
  ADMIN: 'المدير',
  MANAGER: 'المشرف',
  TEACHER: 'المعلم',
  STUDENT: 'الطالب',
  PARENT: 'ولي الأمر',
};

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <div className="brand-mark">ق</div>
          <div>
            <strong>مركز التحفيظ</strong>
            <span>نظام المتابعة والإدارة</span>
          </div>
        </Link>
        <nav>
          <Link to="/">الرئيسية</Link>
          <Link to="/library">المكتبة</Link>
          <Link to="/media">الإعلام والأنشطة</Link>
          <Link className="login-link" to="/login">تسجيل الدخول</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">نظام متابعة التحفيظ • نموذج أولي أكاديمي</footer>
    </div>
  );
}

function HomePage() {
  return (
    <PublicLayout>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">متابعة منظمة • إدارة أسهل • معلومات أوضح</span>
          <h1>منصة رقمية لمتابعة رحلة حفظ القرآن الكريم</h1>
          <p>
            يهدف النظام إلى دعم العمليات الأكاديمية والإدارية في مركز التحفيظ، من خلال تنظيم بيانات
            الطلاب والحلقات والسكن، وتوفير أساس موحد لمتابعة التقدم اليومي والتقارير لاحقًا.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/library">استعراض المكتبة</Link>
            <Link className="secondary-button" to="/media">الإعلام والأنشطة</Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="quran-card">
            <div className="quran-icon">۞</div>
            <strong>التعلّم المنظّم</strong>
            <p>حلقة، معلم، فترات يومية، وسجل تقدّم موحد.</p>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <span>عن النظام</span>
          <h2>لماذا تم تطوير هذه المنصة؟</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card"><b>01</b><h3>إدارة مركزية</h3><p>تنظيم المستخدمين والحلقات والسكن من خلال نظام موحد.</p></article>
          <article className="feature-card"><b>02</b><h3>متابعة التقدم</h3><p>تهيئة النظام لتوثيق تقدم الحفظ اليومي حسب السورة والآيات والصفحات والفترة.</p></article>
          <article className="feature-card"><b>03</b><h3>وصول واضح</h3><p>بوابات مخصصة مستقبلًا للمعلم والطالب وولي الأمر والمشرف.</p></article>
        </div>
      </section>
    </PublicLayout>
  );
}

function LibraryPage() {
  const items = [
    { title: 'دليل أحكام التجويد', type: 'PDF', note: 'مرجع تعليمي' },
    { title: 'خطة مراجعة الحفظ', type: 'PDF', note: 'نموذج إرشادي' },
    { title: 'إرشادات للطالب', type: 'PDF', note: 'مرجع عام' },
  ];
  return (
    <PublicLayout>
      <section className="page-hero"><span>المكتبة</span><h1>مراجع ومواد تعليمية</h1><p>صفحة عامة للوصول إلى المواد المرجعية المعتمدة في المركز.</p></section>
      <section className="content-container card-list">
        {items.map((item) => <article className="document-card" key={item.title}><div className="pdf-badge">{item.type}</div><div><h3>{item.title}</h3><p>{item.note}</p></div><button disabled>فتح الملف</button></article>)}
      </section>
    </PublicLayout>
  );
}

function MediaPage() {
  return (
    <PublicLayout>
      <section className="page-hero"><span>الإعلام والأنشطة</span><h1>آخر أخبار المركز وأنشطته</h1><p>قناة عامة لعرض الأنشطة والإعلانات المؤسسية.</p></section>
      <section className="content-container media-grid">
        <article className="media-card"><div className="media-placeholder">صورة النشاط</div><small>نشاط</small><h3>لقاء تحفيزي للطلاب</h3><p>نموذج لمحتوى الأنشطة الذي سيقوم المشرف بإدارته لاحقًا.</p></article>
        <article className="media-card"><div className="media-placeholder">صورة النشاط</div><small>إعلان</small><h3>تنبيه بجدول الحلقات</h3><p>يمكن استخدام الصفحة لنشر الإعلانات والمعلومات العامة للزوار.</p></article>
      </section>
    </PublicLayout>
  );
}

function LoginPage({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login(loginId, password);
      saveToken(result.token);
      onLogin(result.user);
      navigate(result.dashboardReady ? '/admin' : '/under-development');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <section className="login-section">
        <form className="login-card" onSubmit={submit}>
          <div className="login-symbol">ق</div>
          <h1>تسجيل الدخول</h1>
          <p>استخدم معرف المستخدم وكلمة المرور الممنوحة من إدارة المركز.</p>
          <label>معرف المستخدم<input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="مثال: ADMIN001" autoComplete="username" /></label>
          <label>كلمة المرور<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-button full" disabled={loading}>{loading ? 'جارٍ التحقق...' : 'دخول'}</button>
        </form>
      </section>
    </PublicLayout>
  );
}

function UnderDevelopmentPage({ user, onLogout }: { user: SessionUser | null; onLogout: () => void }) {
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="development-page">
      <div className="development-card">
        <div className="login-symbol">ق</div>
        <span className="status-chip">{roleLabels[user.role]}</span>
        <h1>مرحبًا، {user.fullName}</h1>
        <p className="large-message">لوحة التحكم قيد التطوير</p>
        <p>تم تسجيل الدخول بنجاح والحساب محفوظ في النظام، ولكن بوابة هذا الدور لم تُنفذ ضمن النموذج الأولي الحالي.</p>
        <button className="secondary-button" onClick={onLogout}>تسجيل الخروج</button>
      </div>
    </div>
  );
}

type Halaqah = { id: string; name: string };

function AdminPage({ user, onLogout }: { user: SessionUser | null; onLogout: () => void }) {
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [newHalaqah, setNewHalaqah] = useState('');
  const [form, setForm] = useState({ loginId: '', fullName: '', password: '', role: 'STUDENT' as Exclude<Role, 'ADMIN'>, halaqahId: '', building: '', room: '' });

  const isStudent = form.role === 'STUDENT';

  async function refresh() {
    const [u, h] = await Promise.all([api.listUsers(), api.listHalaqahs()]);
    setUsers(u.users as any[]);
    setHalaqahs(h.halaqahs);
  }

  useEffect(() => { void refresh().catch(() => setError('تعذر تحميل بيانات لوحة التحكم')); }, []);

  async function addHalaqah(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    try { await api.createHalaqah(newHalaqah); setNewHalaqah(''); setNotice('تمت إضافة الحلقة بنجاح'); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر إضافة الحلقة'); }
  }

  async function addUser(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await api.createUser({ ...form, halaqahId: isStudent ? form.halaqahId : undefined, building: isStudent ? form.building : undefined, room: isStudent ? form.room : undefined });
      setNotice('تم إنشاء الحساب وحفظ البيانات بنجاح');
      setForm({ loginId: '', fullName: '', password: '', role: 'STUDENT', halaqahId: '', building: '', room: '' });
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء الحساب'); }
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/under-development" replace />;

  const roleCount = useMemo(() => users.filter((entry) => entry.role !== 'ADMIN').length, [users]);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand admin-brand"><div className="brand-mark">ق</div><div><strong>مركز التحفيظ</strong><span>لوحة الإدارة</span></div></div>
        <nav><a className="active">نظرة عامة</a><a>إدارة المستخدمين</a><a>الحلقات</a><a>السكن</a><a>الجداول والتقارير</a></nav>
        <button className="sidebar-logout" onClick={onLogout}>تسجيل الخروج</button>
      </aside>
      <main className="admin-main">
        <div className="admin-header"><div><span>مرحبًا بك</span><h1>{user.fullName}</h1></div><div className="admin-avatar">أ</div></div>
        {notice && <div className="success-box">{notice}</div>}{error && <div className="error-box">{error}</div>}
        <div className="stat-grid"><div className="stat-card"><span>الحسابات المسجلة</span><strong>{users.length}</strong></div><div className="stat-card"><span>حسابات الأدوار</span><strong>{roleCount}</strong></div><div className="stat-card"><span>الحلقات</span><strong>{halaqahs.length}</strong></div></div>

        <section className="admin-panel"><div className="panel-heading"><div><span>إعداد البيانات</span><h2>إضافة حلقة</h2></div></div><form className="inline-form" onSubmit={addHalaqah}><input value={newHalaqah} onChange={(e) => setNewHalaqah(e.target.value)} placeholder="اسم الحلقة" required /><button className="primary-button">إضافة الحلقة</button></form></section>

        <section className="admin-panel"><div className="panel-heading"><div><span>إدارة الحسابات</span><h2>إضافة مستخدم جديد</h2></div><p>يدعم النموذج الحالي إنشاء المشرف والمعلم والطالب وولي الأمر.</p></div>
          <form className="user-form" onSubmit={addUser}>
            <label>نوع الحساب<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Exclude<Role, 'ADMIN'> })}><option value="MANAGER">مشرف</option><option value="TEACHER">معلم</option><option value="STUDENT">طالب</option><option value="PARENT">ولي أمر</option></select></label>
            <label>الاسم الكامل<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label>
            <label>معرف المستخدم<input value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} required /></label>
            <label>كلمة المرور<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></label>
            {isStudent && <><label>الحلقة<select value={form.halaqahId} onChange={(e) => setForm({ ...form, halaqahId: e.target.value })} required><option value="">اختر الحلقة</option>{halaqahs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label><label>المبنى<input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} required /></label><label>الغرفة<input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} required /></label></>}
            <div className="form-actions"><button className="primary-button">حفظ الحساب</button></div>
          </form>
        </section>

        <section className="admin-panel"><div className="panel-heading"><div><span>قاعدة البيانات</span><h2>الحسابات المسجلة</h2></div></div><div className="table-wrap"><table><thead><tr><th>الاسم</th><th>المعرف</th><th>الدور</th><th>الحالة</th></tr></thead><tbody>{users.map((entry) => <tr key={entry.id}><td>{entry.fullName}</td><td dir="ltr">{entry.loginId}</td><td>{roleLabels[entry.role as Role]}</td><td><span className="status-chip">{entry.isActive ? 'نشط' : 'موقوف'}</span></td></tr>)}</tbody></table></div></section>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.me().then((result) => setUser(result.user)).catch(() => clearToken()).finally(() => setChecking(false));
  }, []);

  function logout() { clearToken(); setUser(null); window.location.href = '/'; }

  if (checking) return <div className="app-loading">جارٍ تحميل النظام...</div>;

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/media" element={<MediaPage />} />
      <Route path="/login" element={<LoginPage onLogin={setUser} />} />
      <Route path="/admin" element={<AdminPage user={user} onLogout={logout} />} />
      <Route path="/under-development" element={<UnderDevelopmentPage user={user} onLogout={logout} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
