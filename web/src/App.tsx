import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  api,
  clearToken,
  saveToken,
  resolveMediaUrl,
  type Activity,
  type Halaqah,
  type HomeContent,
  type LibraryItem,
  type ManagedUser,
  type ParentLink,
  type Period,
  type ProgressEntry,
  type Role,
  type SessionUser,
  type StudentOption,
  type Teacher,
} from './api';
import { Icon, type IconName } from './icons';

const roleLabels: Record<Role, string> = {
  ADMIN: 'المدير',
  MANAGER: 'المشرف',
  TEACHER: 'المعلم',
  STUDENT: 'الطالب',
  PARENT: 'ولي الأمر',
};

const initialHome: HomeContent = {
  eyebrow: 'متابعة منظمة • إدارة أسهل • معلومات أوضح',
  heroTitle: 'منصة رقمية لمتابعة رحلة حفظ القرآن الكريم',
  heroBody: 'نظام موحد لإدارة مركز التحفيظ ومتابعة تقدم الطلاب بصورة واضحة ومنظمة.',
  aboutTitle: 'لماذا تم تطوير هذه المنصة؟',
  aboutBody: 'منصة تجمع الإدارة والمتابعة الأكاديمية والتواصل مع الطالب وولي الأمر في مكان واحد.',
  feature1Title: 'إدارة مركزية',
  feature1Body: 'تنظيم المستخدمين والحلقات والسكن من خلال نظام موحد.',
  feature2Title: 'متابعة التقدم',
  feature2Body: 'توثيق تقدم الحفظ اليومي حسب السورة والآيات والصفحات والفترة.',
  feature3Title: 'وصول واضح',
  feature3Body: 'بوابات مخصصة للمدير والمشرف والمعلم والطالب وولي الأمر.',
  calloutTitle: 'رحلة حفظ أوضح للجميع',
  calloutBody: 'بيانات موحدة وتقارير مختصرة تساعد المركز على متابعة الطالب واتخاذ القرار بسرعة.',
};

type CreatableRole = 'MANAGER' | 'TEACHER' | 'STUDENT' | 'PARENT';

const accountPrefixes: Record<CreatableRole, string> = {
  MANAGER: 'MAN',
  TEACHER: 'TEA',
  STUDENT: 'STU',
  PARENT: 'PAR',
};

function accountPrefix(role: CreatableRole) {
  return accountPrefixes[role];
}

type ManagementTab = 'overview' | 'users' | 'halaqahs' | 'parents' | 'library' | 'media' | 'home' | 'schedule' | 'reports';

type NavItem<T extends string> = { id: T; label: string; icon: IconName };

function routeForRole(role: Role) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'MANAGER') return '/manager';
  if (role === 'TEACHER') return '/teacher';
  if (role === 'STUDENT') return '/student';
  return '/parent';
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function pagesTotal(entries: ProgressEntry[]) {
  return entries.reduce((sum, entry) => sum + Number(entry.pages || 0), 0);
}

function averageRating(entries: ProgressEntry[]) {
  if (!entries.length) return 0;
  return entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length;
}

function BrandLogo() {
  return <img className="brand-logo" src="/logo.svg" alt="شعار مركز التحفيظ" />;
}

function PublicLayout({ children, user }: { children: ReactNode; user: SessionUser | null }) {
  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <BrandLogo />
          <div><strong>مركز التحفيظ</strong><span>نظام المتابعة والإدارة</span></div>
        </Link>
        <nav>
          <Link to="/">الرئيسية</Link>
          <Link to="/library">المكتبة</Link>
          <Link to="/media">الإعلام والأنشطة</Link>
          {user ? (
            <Link className="account-link" to={routeForRole(user.role)} title="العودة إلى لوحة التحكم">
              <Icon name="user" size={18} />
              <span>{user.fullName}</span>
            </Link>
          ) : (
            <Link className="login-link" to="/login">تسجيل الدخول</Link>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">نظام متابعة التحفيظ • إدارة ومتابعة متكاملة</footer>
    </div>
  );
}

function HomePage({ user }: { user: SessionUser | null }) {
  const [home, setHome] = useState<HomeContent>(initialHome);

  useEffect(() => {
    void api.getHome().then((result) => setHome(result.home)).catch(() => undefined);
  }, []);

  return (
    <PublicLayout user={user}>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{home.eyebrow}</span>
          <h1>{home.heroTitle}</h1>
          <p>{home.heroBody}</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/library">استعراض المكتبة</Link>
            <Link className="secondary-button" to="/media">الإعلام والأنشطة</Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="quran-card">
            <div className="quran-icon">ق</div>
            <strong>{home.calloutTitle}</strong>
            <p>{home.calloutBody}</p>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><span>عن النظام</span><h2>{home.aboutTitle}</h2><p>{home.aboutBody}</p></div>
        <div className="feature-grid">
          <article className="feature-card"><b>01</b><h3>{home.feature1Title}</h3><p>{home.feature1Body}</p></article>
          <article className="feature-card"><b>02</b><h3>{home.feature2Title}</h3><p>{home.feature2Body}</p></article>
          <article className="feature-card"><b>03</b><h3>{home.feature3Title}</h3><p>{home.feature3Body}</p></article>
        </div>
      </section>
    </PublicLayout>
  );
}

function LibraryPage({ user }: { user: SessionUser | null }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.getPublicLibrary().then((result) => setItems(result.items)).finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout user={user}>
      <section className="page-hero"><span>المكتبة</span><h1>مراجع ومواد تعليمية</h1><p>المواد المرجعية المعتمدة والمتاحة لزوار المركز.</p></section>
      <section className="content-container card-list">
        {loading && <EmptyState title="جارٍ تحميل المكتبة" />}
        {!loading && items.length === 0 && <EmptyState title="لا توجد مواد منشورة حاليًا" />}
        {items.map((item) => (
          <article className="document-card" key={item.id}>
            <div className="pdf-badge"><Icon name="file" size={23} /></div>
            <div><h3>{item.title}</h3><p>{item.description || 'مادة تعليمية'}</p><small>{item.type}</small></div>
            <a className="secondary-button compact-button" href={item.url} target="_blank" rel="noreferrer">فتح المادة</a>
          </article>
        ))}
      </section>
    </PublicLayout>
  );
}

function MediaSlideshow({ item }: { item: Activity }) {
  const assets = item.assets?.length
    ? item.assets
    : item.imageUrl
      ? [{ id: 'legacy', kind: 'IMAGE', mimeType: 'image/*', fileName: '', url: item.imageUrl, sortOrder: 0, createdAt: item.createdAt }]
      : [];
  const [index, setIndex] = useState(0);
  const active = assets[Math.min(index, Math.max(assets.length - 1, 0))];

  useEffect(() => {
    if (index >= assets.length) setIndex(0);
  }, [assets.length, index]);

  if (!active) {
    return <div className="media-placeholder"><Icon name="media" size={42} /></div>;
  }

  const url = resolveMediaUrl(active.url);
  return (
    <div className="media-slideshow">
      {active.kind === 'VIDEO' ? (
        <video className="media-image" src={url} controls preload="metadata" />
      ) : (
        <img className="media-image" src={url} alt={item.title} />
      )}
      {assets.length > 1 && (
        <>
          <button
            type="button"
            className="slideshow-button slideshow-prev"
            onClick={() => setIndex((current) => (current - 1 + assets.length) % assets.length)}
            aria-label="الوسائط السابقة"
          >
            <Icon name="chevronRight" />
          </button>
          <button
            type="button"
            className="slideshow-button slideshow-next"
            onClick={() => setIndex((current) => (current + 1) % assets.length)}
            aria-label="الوسائط التالية"
          >
            <Icon name="chevronLeft" />
          </button>
          <div className="slideshow-dots" aria-label="عدد الوسائط">
            {assets.map((asset, assetIndex) => (
              <button
                key={asset.id}
                type="button"
                className={assetIndex === index ? 'active' : ''}
                onClick={() => setIndex(assetIndex)}
                aria-label={`عرض الوسائط ${assetIndex + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MediaPage({ user }: { user: SessionUser | null }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.getPublicMedia().then((result) => setActivities(result.activities)).finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout user={user}>
      <section className="page-hero"><span>الإعلام والأنشطة</span><h1>آخر أخبار المركز وأنشطته</h1><p>الإعلانات والفعاليات والأنشطة المنشورة للزوار.</p></section>
      <section className="content-container media-grid">
        {loading && <EmptyState title="جارٍ تحميل المحتوى" />}
        {!loading && activities.length === 0 && <EmptyState title="لا توجد منشورات حاليًا" />}
        {activities.map((item) => (
          <article className="media-card" key={item.id}>
            <MediaSlideshow item={item} />
            <small>{item.category}</small>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
            <div className="media-meta">{formatDate(item.createdAt)}</div>
          </article>
        ))}
      </section>
    </PublicLayout>
  );
}

function LoginPage({ user, onLogin }: { user: SessionUser | null; onLogin: (user: SessionUser) => void }) {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={routeForRole(user.role)} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login(loginId, password);
      saveToken(result.token);
      onLogin(result.user);
      navigate(routeForRole(result.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout user={user}>
      <section className="login-section">
        <form className="login-card" onSubmit={submit}>
          <div className="login-symbol">ق</div>
          <h1>تسجيل الدخول</h1>
          <p>أدخل معرف المستخدم وكلمة المرور للوصول إلى لوحة التحكم المخصصة لدورك.</p>
          <label>معرف المستخدم<input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="مثال: ADMIN001" autoComplete="username" required /></label>
          <label>كلمة المرور
            <div className="password-field">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <button type="button" className="icon-button password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                <Icon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-button full" disabled={loading}>{loading ? 'جارٍ التحقق...' : 'دخول'}</button>
        </form>
      </section>
    </PublicLayout>
  );
}

function EmptyState({ title, text }: { title: string; text?: string }) {
  return <div className="empty-state"><Icon name="file" size={30} /><strong>{title}</strong>{text && <p>{text}</p>}</div>;
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

function DashboardShell<T extends string>({
  user,
  title,
  nav,
  active,
  onChange,
  onLogout,
  children,
}: {
  user: SessionUser;
  title: string;
  nav: NavItem<T>[];
  active: T;
  onChange: (tab: T) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand admin-brand" to="/" title="الذهاب إلى الموقع العام"><BrandLogo /><div><strong>مركز التحفيظ</strong><span>{title}</span></div></Link>
        <nav>
          {nav.map((item) => (
            <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={onLogout}><Icon name="logout" size={18} /><span>تسجيل الخروج</span></button>
      </aside>
      <main className="admin-main">
        <div className="admin-header">
          <div><span>{roleLabels[user.role]}</span><h1>{user.fullName}</h1><small dir="ltr">{user.loginId}</small></div>
          <div className="admin-avatar">{user.fullName.trim().charAt(0) || 'ق'}</div>
        </div>
        {children}
      </main>
    </div>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="إغلاق">×</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function Notice({ message, error }: { message: string; error: string }) {
  return <>{message && <div className="success-box">{message}</div>}{error && <div className="error-box">{error}</div>}</>;
}

function ManagementDashboard({ user, onLogout, mode }: { user: SessionUser | null; onLogout: () => void; mode: 'ADMIN' | 'MANAGER' }) {
  const [active, setActive] = useState<ManagementTab>('overview');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [halaqahs, setHalaqahs] = useState<Halaqah[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [media, setMedia] = useState<Activity[]>([]);
  const [home, setHome] = useState<HomeContent>(initialHome);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isAdmin = mode === 'ADMIN';

  const nav = useMemo<NavItem<ManagementTab>[]>(() => {
    const items: NavItem<ManagementTab>[] = [
      { id: 'overview', label: 'نظرة عامة', icon: 'home' },
      { id: 'users', label: 'إدارة المستخدمين', icon: 'users' },
    ];
    if (isAdmin) items.push({ id: 'halaqahs', label: 'الحلقات', icon: 'school' });
    items.push(
      { id: 'parents', label: 'ربط أولياء الأمور', icon: 'link' },
      { id: 'library', label: 'المكتبة', icon: 'book' },
      { id: 'media', label: 'الإعلام والأنشطة', icon: 'media' },
    );
    if (isAdmin) items.push({ id: 'home', label: 'الصفحة الرئيسية', icon: 'home' });
    items.push({ id: 'schedule', label: 'الفترات', icon: 'clock' }, { id: 'reports', label: 'التقارير', icon: 'chart' });
    return items;
  }, [isAdmin]);

  async function refreshAll() {
    setLoading(true);
    setError('');
    try {
      const [u, h, t, p, l, m, hm, per, prog] = await Promise.all([
        api.listUsers(),
        api.listHalaqahs(),
        api.listTeachers(),
        api.listParentLinks(),
        api.getManagedLibrary(),
        api.getManagedMedia(),
        api.getHome(),
        api.listPeriods(),
        api.listProgress(),
      ]);
      setUsers(u.users);
      setHalaqahs(h.halaqahs);
      setTeachers(t.teachers);
      setLinks(p.links);
      setLibrary(l.items);
      setMedia(m.activities);
      setHome(hm.home);
      setPeriods(per.periods);
      setProgress(prog.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshAll(); }, []);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== mode) return <Navigate to={routeForRole(user.role)} replace />;

  const activeUsers = users.filter((entry) => entry.isActive).length;
  const studentUsers = users.filter((entry) => entry.role === 'STUDENT').length;
  const avg = averageRating(progress);

  function flash(message: string) { setNotice(message); setError(''); void refreshAll(); }
  function fail(message: string) { setError(message); setNotice(''); }

  return (
    <DashboardShell user={user} title={isAdmin ? 'لوحة الإدارة' : 'لوحة المشرف'} nav={nav} active={active} onChange={setActive} onLogout={onLogout}>
      <Notice message={notice} error={error} />
      {loading && <div className="loading-panel">جارٍ تحميل البيانات...</div>}
      {!loading && active === 'overview' && (
        <>
          <div className="stat-grid">
            <StatCard label="الحسابات النشطة" value={activeUsers} />
            <StatCard label="الطلاب" value={studentUsers} />
            <StatCard label="الحلقات" value={halaqahs.length} />
            <StatCard label="سجلات المتابعة" value={progress.length} />
          </div>
          <section className="admin-panel dashboard-welcome">
            <div><span className="eyebrow">ملخص النظام</span><h2>الإدارة اليومية من مكان واحد</h2><p>انتقل من القائمة لإدارة الحسابات والمحتوى والربط والفترات والتقارير.</p></div>
            <div className="summary-ring"><strong>{avg.toFixed(1)}</strong><span>متوسط التقييم / 5</span></div>
          </section>
          <section className="admin-panel">
            <div className="panel-heading"><div><span>آخر المتابعة</span><h2>أحدث سجلات الطلاب</h2></div></div>
            <ProgressTable entries={progress.slice(0, 6)} compact />
          </section>
        </>
      )}
      {!loading && active === 'users' && <UsersManager users={users} halaqahs={halaqahs} isAdmin={isAdmin} onChanged={flash} onError={fail} />}
      {!loading && active === 'halaqahs' && isAdmin && <HalaqahManager halaqahs={halaqahs} teachers={teachers} onChanged={flash} onError={fail} />}
      {!loading && active === 'parents' && <ParentLinksManager users={users} links={links} onChanged={flash} onError={fail} />}
      {!loading && active === 'library' && <LibraryManager items={library} onChanged={flash} onError={fail} />}
      {!loading && active === 'media' && <MediaManager items={media} onChanged={flash} onError={fail} />}
      {!loading && active === 'home' && isAdmin && <HomeEditor home={home} onChanged={flash} onError={fail} />}
      {!loading && active === 'schedule' && <ScheduleManager periods={periods} canEdit={isAdmin} onChanged={flash} onError={fail} />}
      {!loading && active === 'reports' && <ReportsPanel users={users} halaqahs={halaqahs} entries={progress} />}
    </DashboardShell>
  );
}

function UsersManager({ users, halaqahs, isAdmin, onChanged, onError }: { users: ManagedUser[]; halaqahs: Halaqah[]; isAdmin: boolean; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ loginNumber: '', fullName: '', password: '', role: 'STUDENT' as CreatableRole, halaqahId: '', building: '', room: '' });
  const [modal, setModal] = useState<{ type: 'credential' | 'reset' | 'edit' | 'delete'; user: ManagedUser } | null>(null);
  const [credential, setCredential] = useState<{ loginId: string; password: string } | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', isActive: true, halaqahId: '', building: '', room: '' });
  const isStudent = form.role === 'STUDENT';

  async function createUser(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await api.createUser({
        ...form,
        halaqahId: isStudent ? form.halaqahId : undefined,
        building: isStudent ? form.building : undefined,
        room: isStudent ? form.room : undefined,
      });
      setForm({ loginNumber: '', fullName: '', password: '', role: 'STUDENT', halaqahId: '', building: '', room: '' });
      setShowPassword(false);
      onChanged(result.message);
    } catch (err) { onError(err instanceof Error ? err.message : 'تعذر إنشاء الحساب'); }
  }

  function canManage(entry: ManagedUser) {
    if (entry.role === 'ADMIN') return false;
    if (!isAdmin && entry.role === 'MANAGER') return false;
    return true;
  }

  async function openCredential(entry: ManagedUser) {
    try {
      const result = await api.getCredential(entry.id);
      setCredential(result);
      setModal({ type: 'credential', user: entry });
    } catch (err) { onError(err instanceof Error ? err.message : 'تعذر عرض بيانات الدخول'); }
  }

  function openEdit(entry: ManagedUser) {
    setEditForm({
      fullName: entry.fullName,
      isActive: entry.isActive,
      halaqahId: entry.studentProfile?.halaqah?.id || '',
      building: entry.studentProfile?.dormitory?.building || '',
      room: entry.studentProfile?.dormitory?.room || '',
    });
    setModal({ type: 'edit', user: entry });
  }

  async function submitEdit() {
    if (!modal) return;
    try {
      const payload: Record<string, unknown> = { fullName: editForm.fullName, isActive: editForm.isActive };
      if (modal.user.role === 'STUDENT') Object.assign(payload, { halaqahId: editForm.halaqahId, building: editForm.building, room: editForm.room });
      const result = await api.updateUser(modal.user.id, payload);
      setModal(null);
      onChanged(result.message);
    } catch (err) { onError(err instanceof Error ? err.message : 'تعذر تحديث الحساب'); }
  }

  async function submitReset() {
    if (!modal || modalPassword.length < 8) { onError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل'); return; }
    try {
      const result = await api.resetPassword(modal.user.id, modalPassword);
      setModal(null); setModalPassword(''); setShowResetPassword(false);
      onChanged(result.message);
    } catch (err) { onError(err instanceof Error ? err.message : 'تعذر إعادة تعيين كلمة المرور'); }
  }

  async function submitDelete() {
    if (!modal) return;
    try {
      const result = await api.deleteUser(modal.user.id);
      setModal(null);
      onChanged(result.message);
    } catch (err) { onError(err instanceof Error ? err.message : 'تعذر حذف الحساب'); }
  }

  return (
    <>
      <section className="admin-panel">
        <div className="panel-heading"><div><span>إدارة الحسابات</span><h2>إضافة مستخدم جديد</h2></div><p>{isAdmin ? 'المدير يمكنه إنشاء جميع الأدوار غير الإدارية.' : 'المشرف يمكنه إنشاء المعلم والطالب وولي الأمر.'}</p></div>
        <form className="user-form" onSubmit={createUser}>
          <label>نوع الحساب<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as CreatableRole })}>{isAdmin && <option value="MANAGER">مشرف</option>}<option value="TEACHER">معلم</option><option value="STUDENT">طالب</option><option value="PARENT">ولي أمر</option></select></label>
          <label>الاسم الكامل<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label>
          <label>رقم الحساب
            <div className="login-id-field" dir="ltr">
              <span>{accountPrefix(form.role)}</span>
              <input
                value={form.loginNumber}
                onChange={(e) => setForm({ ...form, loginNumber: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                pattern="[0-9]+"
                placeholder="69260001"
                required
              />
            </div>
          </label>
          <label>كلمة المرور<div className="password-field"><input dir="ltr" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} autoComplete="new-password" required /><button type="button" className="icon-button password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}><Icon name={showPassword ? 'eyeOff' : 'eye'} /></button></div></label>
          {isStudent && <><label>الحلقة<select value={form.halaqahId} onChange={(e) => setForm({ ...form, halaqahId: e.target.value })} required><option value="">اختر الحلقة</option>{halaqahs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>المبنى<input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} required /></label><label>الغرفة<input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} required /></label></>}
          <div className="form-actions"><button className="primary-button"><Icon name="plus" size={18} />حفظ الحساب</button></div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="panel-heading"><div><span>قاعدة البيانات</span><h2>الحسابات المسجلة</h2></div><p>{users.length} حساب</p></div>
        <div className="table-wrap"><table><thead><tr><th>الاسم</th><th>المعرف</th><th>الدور</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{users.map((entry) => <tr key={entry.id}><td>{entry.fullName}</td><td dir="ltr">{entry.loginId}</td><td>{roleLabels[entry.role]}</td><td><span className={`status-chip ${entry.isActive ? '' : 'status-off'}`}>{entry.isActive ? 'نشط' : 'موقوف'}</span></td><td>{canManage(entry) ? <div className="table-actions"><button className="table-action" onClick={() => void openCredential(entry)} disabled={!entry.passwordAvailable} title="عرض بيانات الدخول"><Icon name="eye" /></button><button className="table-action" onClick={() => { setModalPassword(''); setModal({ type: 'reset', user: entry }); }} title="تعديل كلمة المرور"><Icon name="key" /></button><button className="table-action" onClick={() => openEdit(entry)} title="تعديل الحساب"><Icon name="edit" /></button><button className="table-action danger" onClick={() => setModal({ type: 'delete', user: entry })} title="حذف الحساب"><Icon name="trash" /></button></div> : <span className="protected-label">محمي</span>}</td></tr>)}</tbody></table></div>
      </section>

      {modal?.type === 'credential' && credential && <Modal title="بيانات الدخول" onClose={() => { setModal(null); setCredential(null); }} footer={<button className="primary-button" onClick={() => void navigator.clipboard.writeText(`${credential.loginId}\n${credential.password}`)}>نسخ البيانات</button>}><div className="credential-box"><div><span>معرف المستخدم</span><strong dir="ltr">{credential.loginId}</strong></div><div><span>كلمة المرور</span><strong dir="ltr">{credential.password}</strong></div></div></Modal>}
      {modal?.type === 'reset' && <Modal title={`إعادة تعيين كلمة مرور ${modal.user.fullName}`} onClose={() => setModal(null)} footer={<><button className="secondary-button" onClick={() => setModal(null)}>إلغاء</button><button className="primary-button" onClick={() => void submitReset()}>حفظ كلمة المرور</button></>}><label className="modal-field">كلمة المرور الجديدة<div className="password-field"><input dir="ltr" type={showResetPassword ? 'text' : 'password'} value={modalPassword} onChange={(e) => setModalPassword(e.target.value)} minLength={8} /><button type="button" className="icon-button password-toggle" onClick={() => setShowResetPassword((v) => !v)}><Icon name={showResetPassword ? 'eyeOff' : 'eye'} /></button></div></label></Modal>}
      {modal?.type === 'edit' && <Modal title={`تعديل حساب ${modal.user.fullName}`} onClose={() => setModal(null)} footer={<><button className="secondary-button" onClick={() => setModal(null)}>إلغاء</button><button className="primary-button" onClick={() => void submitEdit()}>حفظ التغييرات</button></>}><div className="modal-form"><label>الاسم الكامل<input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></label><label className="check-field"><input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />الحساب نشط</label>{modal.user.role === 'STUDENT' && <><label>الحلقة<select value={editForm.halaqahId} onChange={(e) => setEditForm({ ...editForm, halaqahId: e.target.value })}>{halaqahs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="split-fields"><label>المبنى<input value={editForm.building} onChange={(e) => setEditForm({ ...editForm, building: e.target.value })} /></label><label>الغرفة<input value={editForm.room} onChange={(e) => setEditForm({ ...editForm, room: e.target.value })} /></label></div></>}</div></Modal>}
      {modal?.type === 'delete' && <Modal title="تأكيد حذف الحساب" onClose={() => setModal(null)} footer={<><button className="secondary-button" onClick={() => setModal(null)}>إلغاء</button><button className="danger-button" onClick={() => void submitDelete()}><Icon name="trash" size={18} />حذف نهائي</button></>}><div className="confirm-copy"><strong>{modal.user.fullName}</strong><p>سيتم حذف الحساب والبيانات التابعة التي يسمح النظام بحذفها. لا يمكن التراجع عن هذا الإجراء.</p></div></Modal>}
    </>
  );
}

function HalaqahManager({ halaqahs, teachers, onChanged, onError }: { halaqahs: Halaqah[]; teachers: Teacher[]; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [name, setName] = useState('');
  async function add(event: FormEvent) { event.preventDefault(); try { await api.createHalaqah(name); setName(''); onChanged('تمت إضافة الحلقة'); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر إضافة الحلقة'); } }
  return <>
    <section className="admin-panel"><div className="panel-heading"><div><span>الحلقات</span><h2>إضافة حلقة</h2></div></div><form className="inline-form" onSubmit={add}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الحلقة" required /><button className="primary-button"><Icon name="plus" size={18} />إضافة</button></form></section>
    <section className="admin-panel"><div className="panel-heading"><div><span>التعيينات</span><h2>الحلقات والمعلمون</h2></div></div><div className="management-grid">{halaqahs.map((item) => <HalaqahCard key={item.id} halaqah={item} teachers={teachers} onChanged={onChanged} onError={onError} />)}</div>{halaqahs.length === 0 && <EmptyState title="لا توجد حلقات" />}</section>
  </>;
}

function HalaqahCard({ halaqah, teachers, onChanged, onError }: { halaqah: Halaqah; teachers: Teacher[]; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [name, setName] = useState(halaqah.name);
  const [teacherId, setTeacherId] = useState(halaqah.teacher?.id || '');
  async function save() { try { const result = await api.updateHalaqah(halaqah.id, { name, teacherId: teacherId || null }); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر تحديث الحلقة'); } }
  async function remove() { try { const result = await api.deleteHalaqah(halaqah.id); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر حذف الحلقة'); } }
  return <div className="management-card"><div className="card-icon"><Icon name="school" /></div><label>اسم الحلقة<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>المعلم<select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">بدون معلم</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}</select></label><div className="card-meta">الطلاب: {halaqah._count?.students ?? 0}</div><div className="card-actions"><button className="primary-button compact-button" onClick={() => void save()}>حفظ</button><button className="danger-text-button" onClick={() => void remove()} disabled={(halaqah._count?.students ?? 0) > 0}>حذف</button></div></div>;
}

function ParentLinksManager({ users, links, onChanged, onError }: { users: ManagedUser[]; links: ParentLink[]; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const parents = users.filter((u) => u.role === 'PARENT' && u.isActive);
  const students = users.filter((u) => u.role === 'STUDENT' && u.isActive);
  const [parentId, setParentId] = useState('');
  const [studentId, setStudentId] = useState('');
  async function add(event: FormEvent) { event.preventDefault(); try { const result = await api.createParentLink(parentId, studentId); setParentId(''); setStudentId(''); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر إنشاء الربط'); } }
  async function remove(id: string) { try { const result = await api.deleteParentLink(id); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر إلغاء الربط'); } }
  return <>
    <section className="admin-panel"><div className="panel-heading"><div><span>ولي الأمر</span><h2>ربط ولي أمر بطالب</h2></div></div><form className="user-form" onSubmit={add}><label>ولي الأمر<select value={parentId} onChange={(e) => setParentId(e.target.value)} required><option value="">اختر ولي الأمر</option>{parents.map((item) => <option value={item.id} key={item.id}>{item.fullName}</option>)}</select></label><label>الطالب<select value={studentId} onChange={(e) => setStudentId(e.target.value)} required><option value="">اختر الطالب</option>{students.map((item) => <option value={item.id} key={item.id}>{item.fullName}</option>)}</select></label><div className="form-actions"><button className="primary-button"><Icon name="link" size={18} />إنشاء الربط</button></div></form></section>
    <section className="admin-panel"><div className="panel-heading"><div><span>الروابط الحالية</span><h2>أولياء الأمور والطلاب</h2></div></div><div className="table-wrap"><table><thead><tr><th>ولي الأمر</th><th>الطالب</th><th>الحلقة</th><th></th></tr></thead><tbody>{links.map((link) => <tr key={link.id}><td>{link.parent.fullName}</td><td>{link.student.user.fullName}</td><td>{link.student.halaqah.name}</td><td><button className="table-action danger" onClick={() => void remove(link.id)}><Icon name="trash" /></button></td></tr>)}</tbody></table></div>{links.length === 0 && <EmptyState title="لا توجد روابط مسجلة" />}</section>
  </>;
}

function LibraryManager({ items, onChanged, onError }: { items: LibraryItem[]; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', type: 'PDF', url: '', published: true });
  function clear() { setEditing(null); setForm({ title: '', description: '', type: 'PDF', url: '', published: true }); }
  function edit(item: LibraryItem) { setEditing(item); setForm({ title: item.title, description: item.description || '', type: item.type, url: item.url, published: item.published }); }
  async function submit(event: FormEvent) { event.preventDefault(); try { const result = editing ? await api.updateLibraryItem(editing.id, form) : await api.createLibraryItem(form); clear(); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر حفظ المادة'); } }
  async function remove(item: LibraryItem) { try { const result = await api.deleteLibraryItem(item.id); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر حذف المادة'); } }
  return <><section className="admin-panel"><div className="panel-heading"><div><span>المكتبة</span><h2>{editing ? 'تعديل مادة' : 'إضافة مادة جديدة'}</h2></div>{editing && <button className="text-button" onClick={clear}>إلغاء التعديل</button>}</div><form className="user-form" onSubmit={submit}><label>العنوان<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label><label>النوع<input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="PDF" required /></label><label className="span-2">رابط الملف أو المادة<input dir="ltr" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com/file.pdf" required /><small className="field-help">هذا هو الرابط الذي سيفتحه الزائر عند الضغط على «فتح المادة».</small></label><label className="span-2">الوصف<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="check-field span-2"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />منشور للزوار</label><div className="form-actions"><button className="primary-button">{editing ? 'حفظ التعديلات' : 'إضافة إلى المكتبة'}</button></div></form></section><section className="admin-panel"><div className="panel-heading"><div><span>المواد</span><h2>محتوى المكتبة</h2></div></div><div className="item-list">{items.map((item) => <div className="item-row" key={item.id}><div className="card-icon"><Icon name="file" /></div><div className="item-main"><strong>{item.title}</strong><span>{item.type} • {item.published ? 'منشور' : 'مخفي'}</span></div><div className="table-actions"><button className="table-action" onClick={() => edit(item)}><Icon name="edit" /></button><button className="table-action danger" onClick={() => void remove(item)}><Icon name="trash" /></button></div></div>)}</div>{items.length === 0 && <EmptyState title="المكتبة فارغة" />}</section></>;
}

function MediaManager({ items, onChanged, onError }: { items: Activity[]; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'نشاط', published: true });
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  function clear() {
    setEditing(null);
    setForm({ title: '', content: '', category: 'نشاط', published: true });
    setFiles([]);
    setDragging(false);
  }

  function edit(item: Activity) {
    setEditing(item);
    setForm({ title: item.title, content: item.content, category: item.category, published: item.published });
    setFiles([]);
  }

  function addFiles(fileList: FileList | File[]) {
    const accepted = Array.from(fileList).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (accepted.length !== Array.from(fileList).length) onError('يسمح فقط بملفات الصور والفيديو.');
    setFiles((current) => [...current, ...accepted].slice(0, 12));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = editing
        ? await api.updateActivity(editing.id, form)
        : await api.createActivity(form);

      for (const file of files) {
        await api.uploadActivityAsset(result.activity.id, file);
      }

      clear();
      onChanged(files.length ? 'تم حفظ المنشور ورفع الوسائط بنجاح' : result.message);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'تعذر حفظ المحتوى');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Activity) {
    try {
      const result = await api.deleteActivity(item.id);
      onChanged(result.message);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'تعذر حذف المحتوى');
    }
  }

  async function removeAsset(item: Activity, assetId: string) {
    try {
      const result = await api.deleteActivityAsset(item.id, assetId);
      onChanged(result.message);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'تعذر حذف الملف');
    }
  }

  return (
    <>
      <section className="admin-panel">
        <div className="panel-heading">
          <div><span>الإعلام والأنشطة</span><h2>{editing ? 'تعديل منشور' : 'إضافة منشور'}</h2></div>
          {editing && <button type="button" className="text-button" onClick={clear}>إلغاء التعديل</button>}
        </div>
        <form className="user-form" onSubmit={submit}>
          <label>العنوان<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>التصنيف<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /></label>
          <label className="span-2">المحتوى<textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required /></label>

          <div className="span-2 media-upload-field">
            <span className="field-label">الصور والفيديو</span>
            <label
              className={`media-dropzone ${dragging ? 'dragging' : ''}`}
              onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <input
                className="file-input"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
              <Icon name="media" size={32} />
              <strong>اسحب الصور أو الفيديو هنا</strong>
              <span>أو اضغط للاختيار من الهاتف أو الكمبيوتر — حتى 12 ملفًا</span>
            </label>
            {files.length > 0 && (
              <div className="selected-media-list">
                {files.map((file, index) => (
                  <div className="selected-media-item" key={`${file.name}-${file.size}-${index}`}>
                    <span>{file.name}</span>
                    <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
                    <button type="button" className="table-action danger" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label="إزالة الملف">
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {editing && (editing.assets?.length ?? 0) > 0 && (
            <div className="span-2">
              <span className="field-label">الوسائط الحالية</span>
              <div className="existing-media-grid">
                {editing.assets!.map((asset) => (
                  <div className="existing-media-item" key={asset.id}>
                    {asset.kind === 'VIDEO'
                      ? <video src={resolveMediaUrl(asset.url)} controls preload="metadata" />
                      : <img src={resolveMediaUrl(asset.url)} alt="" />}
                    <button type="button" className="table-action danger" onClick={() => void removeAsset(editing, asset.id)} title="حذف الملف">
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="check-field span-2"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />منشور للزوار</label>
          <div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ والرفع...' : editing ? 'حفظ التعديلات' : 'نشر المحتوى'}</button></div>
        </form>
      </section>

      <section className="admin-panel">
        <div className="panel-heading"><div><span>المنشورات</span><h2>المحتوى الإعلامي</h2></div></div>
        <div className="item-list">
          {items.map((item) => (
            <div className="item-row" key={item.id}>
              <div className="card-icon"><Icon name="media" /></div>
              <div className="item-main"><strong>{item.title}</strong><span>{item.category} • {item.published ? 'منشور' : 'مخفي'} • {(item.assets?.length ?? 0)} وسائط • {formatDate(item.createdAt)}</span></div>
              <div className="table-actions">
                <button className="table-action" onClick={() => edit(item)} title="تعديل المنشور"><Icon name="edit" /></button>
                <button className="table-action danger" onClick={() => void remove(item)} title="حذف المنشور"><Icon name="trash" /></button>
              </div>
            </div>
          ))}
        </div>
        {items.length === 0 && <EmptyState title="لا توجد منشورات" />}
      </section>
    </>
  );
}

function HomeEditor({ home, onChanged, onError }: { home: HomeContent; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState<HomeContent>(home);
  useEffect(() => setForm(home), [home]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await api.updateHome(form);
      onChanged(result.message);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'تعذر تحديث الصفحة الرئيسية');
    }
  }

  return (
    <form className="home-editor-stack" onSubmit={submit}>
      <section className="admin-panel">
        <div className="panel-heading"><div><span>القسم الأول</span><h2>واجهة الصفحة الرئيسية</h2></div><p>هذا هو القسم الكبير الذي يظهر أولًا للزائر.</p></div>
        <div className="content-editor">
          <label>الشريط التعريفي<input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} /></label>
          <label>العنوان الرئيسي<input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} /></label>
          <label className="span-2">وصف الواجهة<textarea value={form.heroBody} onChange={(e) => setForm({ ...form, heroBody: e.target.value })} /></label>
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-heading"><div><span>القسم الثاني</span><h2>عن النظام</h2></div><p>العنوان والوصف الظاهران فوق بطاقات المزايا.</p></div>
        <div className="content-editor">
          <label>عنوان القسم<input value={form.aboutTitle} onChange={(e) => setForm({ ...form, aboutTitle: e.target.value })} /></label>
          <label className="span-2">وصف القسم<textarea value={form.aboutBody} onChange={(e) => setForm({ ...form, aboutBody: e.target.value })} /></label>
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-heading"><div><span>القسم الثالث</span><h2>بطاقات المزايا</h2></div><p>كل بطاقة مستقلة لتسهيل تعديل محتواها.</p></div>
        <div className="home-feature-editor-grid">
          <div className="home-feature-editor-card">
            <strong>الميزة 01</strong>
            <label>العنوان<input value={form.feature1Title} onChange={(e) => setForm({ ...form, feature1Title: e.target.value })} /></label>
            <label>الوصف<textarea value={form.feature1Body} onChange={(e) => setForm({ ...form, feature1Body: e.target.value })} /></label>
          </div>
          <div className="home-feature-editor-card">
            <strong>الميزة 02</strong>
            <label>العنوان<input value={form.feature2Title} onChange={(e) => setForm({ ...form, feature2Title: e.target.value })} /></label>
            <label>الوصف<textarea value={form.feature2Body} onChange={(e) => setForm({ ...form, feature2Body: e.target.value })} /></label>
          </div>
          <div className="home-feature-editor-card">
            <strong>الميزة 03</strong>
            <label>العنوان<input value={form.feature3Title} onChange={(e) => setForm({ ...form, feature3Title: e.target.value })} /></label>
            <label>الوصف<textarea value={form.feature3Body} onChange={(e) => setForm({ ...form, feature3Body: e.target.value })} /></label>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-heading"><div><span>القسم الأخضر</span><h2>البطاقة الخضراء في الواجهة</h2></div><p>هذه هي البطاقة الكبيرة الموجودة بجانب عنوان الصفحة.</p></div>
        <div className="content-editor">
          <label>عنوان البطاقة<input value={form.calloutTitle} onChange={(e) => setForm({ ...form, calloutTitle: e.target.value })} /></label>
          <label className="span-2">وصف البطاقة<textarea value={form.calloutBody} onChange={(e) => setForm({ ...form, calloutBody: e.target.value })} /></label>
        </div>
      </section>

      <div className="home-editor-save">
        <span>هذه الصلاحية متاحة للمدير فقط.</span>
        <button className="primary-button" type="submit"><Icon name="check" size={18} />حفظ جميع تعديلات الصفحة الرئيسية</button>
      </div>
    </form>
  );
}

function ScheduleManager({ periods, canEdit, onChanged, onError }: { periods: Period[]; canEdit: boolean; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState({ number: periods.length + 1, name: '', startTime: '08:00', endTime: '09:00' });
  async function submit(event: FormEvent) { event.preventDefault(); try { const result = await api.createPeriod(form); setForm({ number: periods.length + 2, name: '', startTime: '08:00', endTime: '09:00' }); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر إضافة الفترة'); } }
  return <><section className="admin-panel"><div className="panel-heading"><div><span>الجدول اليومي</span><h2>فترات المتابعة</h2></div><p>{canEdit ? 'يمكن للمدير تعديل الفترات.' : 'عرض فقط للمشرف.'}</p></div>{canEdit && <form className="period-form" onSubmit={submit}><label>الرقم<input type="number" min={1} value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} /></label><label>اسم الفترة<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>البداية<input dir="ltr" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label><label>النهاية<input dir="ltr" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label><button className="primary-button">إضافة الفترة</button></form>}<div className="period-list">{periods.map((period) => <PeriodCard key={period.id} period={period} canEdit={canEdit} onChanged={onChanged} onError={onError} />)}</div></section></>;
}

function PeriodCard({ period, canEdit, onChanged, onError }: { period: Period; canEdit: boolean; onChanged: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState(period);
  async function save() { try { const result = await api.updatePeriod(period.id, { number: form.number, name: form.name, startTime: form.startTime, endTime: form.endTime }); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر تحديث الفترة'); } }
  async function remove() { try { const result = await api.deletePeriod(period.id); onChanged(result.message); } catch (err) { onError(err instanceof Error ? err.message : 'تعذر حذف الفترة'); } }
  if (!canEdit) return <div className="period-card"><div className="period-number">{period.number}</div><div><strong>{period.name}</strong><span dir="ltr">{period.startTime} - {period.endTime}</span></div></div>;
  return <div className="period-card editable"><input className="tiny-input" type="number" value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} /><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input dir="ltr" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /><input dir="ltr" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /><button className="table-action" onClick={() => void save()}><Icon name="check" /></button><button className="table-action danger" onClick={() => void remove()}><Icon name="trash" /></button></div>;
}

function ReportsPanel({ users, halaqahs, entries }: { users: ManagedUser[]; halaqahs: Halaqah[]; entries: ProgressEntry[] }) {
  const students = users.filter((u) => u.role === 'STUDENT');
  const teachers = users.filter((u) => u.role === 'TEACHER');
  const totalPages = pagesTotal(entries);
  const avg = averageRating(entries);
  const byStudent = useMemo(() => {
    const map = new Map<string, { name: string; sessions: number; pages: number; rating: number }>();
    entries.forEach((entry) => {
      const current = map.get(entry.student.id) || { name: entry.student.user.fullName, sessions: 0, pages: 0, rating: 0 };
      current.sessions += 1; current.pages += Number(entry.pages); current.rating += entry.rating;
      map.set(entry.student.id, current);
    });
    return [...map.values()].map((item) => ({ ...item, average: item.sessions ? item.rating / item.sessions : 0 })).sort((a, b) => b.sessions - a.sessions);
  }, [entries]);
  return <><div className="stat-grid"><StatCard label="الطلاب" value={students.length} /><StatCard label="المعلمون" value={teachers.length} /><StatCard label="إجمالي الصفحات" value={totalPages.toFixed(1)} /><StatCard label="متوسط التقييم" value={`${avg.toFixed(1)} / 5`} /></div><section className="admin-panel"><div className="panel-heading"><div><span>ملخص الأداء</span><h2>تقرير الطلاب</h2></div><p>{halaqahs.length} حلقة</p></div><div className="table-wrap"><table><thead><tr><th>الطالب</th><th>الجلسات</th><th>الصفحات</th><th>متوسط التقييم</th></tr></thead><tbody>{byStudent.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.sessions}</td><td>{item.pages.toFixed(1)}</td><td>{item.average.toFixed(1)} / 5</td></tr>)}</tbody></table></div>{byStudent.length === 0 && <EmptyState title="لا توجد بيانات متابعة بعد" />}</section></>;
}

function TeacherDashboard({ user, onLogout }: { user: SessionUser | null; onLogout: () => void }) {
  type Tab = 'overview' | 'record' | 'students' | 'history';
  const [active, setActive] = useState<Tab>('overview');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ studentId: '', periodId: '', surah: '', verseFrom: 1, verseTo: 1, pages: 1, rating: 5, recordDate: new Date().toISOString().slice(0, 10), note: '' });
  const nav: NavItem<Tab>[] = [{ id: 'overview', label: 'نظرة عامة', icon: 'home' }, { id: 'record', label: 'تسجيل المتابعة', icon: 'edit' }, { id: 'students', label: 'طلابي', icon: 'users' }, { id: 'history', label: 'سجل المتابعة', icon: 'history' }];

  async function refresh() { setLoading(true); try { const [s, p, e] = await Promise.all([api.listProgressStudents(), api.listPeriods(), api.listProgress()]); setStudents(s.students); setPeriods(p.periods); setEntries(e.entries); setForm((current) => ({ ...current, studentId: current.studentId || s.students[0]?.id || '', periodId: current.periodId || p.periods[0]?.id || '' })); } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل البيانات'); } finally { setLoading(false); } }
  useEffect(() => { void refresh(); }, []);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'TEACHER') return <Navigate to={routeForRole(user.role)} replace />;

  async function submit(event: FormEvent) { event.preventDefault(); try { const result = await api.createProgress(form); setNotice(result.message); setError(''); setForm({ ...form, surah: '', verseFrom: 1, verseTo: 1, pages: 1, note: '' }); await refresh(); setActive('history'); } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ المتابعة'); } }
  async function remove(id: string) { try { const result = await api.deleteProgress(id); setNotice(result.message); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حذف السجل'); } }

  return <DashboardShell user={user} title="لوحة المعلم" nav={nav} active={active} onChange={setActive} onLogout={onLogout}><Notice message={notice} error={error} />{loading ? <div className="loading-panel">جارٍ تحميل البيانات...</div> : <>{active === 'overview' && <><div className="stat-grid"><StatCard label="الطلاب" value={students.length} /><StatCard label="سجلات المتابعة" value={entries.length} /><StatCard label="إجمالي الصفحات" value={pagesTotal(entries).toFixed(1)} /><StatCard label="متوسط التقييم" value={`${averageRating(entries).toFixed(1)} / 5`} /></div><section className="admin-panel"><div className="panel-heading"><div><span>اليوم</span><h2>آخر المتابعات</h2></div></div><ProgressTable entries={entries.slice(0, 6)} compact /></section></>}{active === 'record' && <section className="admin-panel"><div className="panel-heading"><div><span>تقدم الحفظ</span><h2>تسجيل متابعة جديدة</h2></div></div>{students.length === 0 ? <EmptyState title="لا يوجد طلاب مرتبطون بحلقاتك" /> : <form className="user-form" onSubmit={submit}><label>الطالب<select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>{students.map((student) => <option key={student.id} value={student.id}>{student.user.fullName} - {student.halaqah.name}</option>)}</select></label><label>الفترة<select value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })} required>{periods.map((period) => <option key={period.id} value={period.id}>{period.name} ({period.startTime})</option>)}</select></label><label>السورة<input value={form.surah} onChange={(e) => setForm({ ...form, surah: e.target.value })} required /></label><label>التاريخ<input dir="ltr" type="date" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} required /></label><label>من الآية<input type="number" min={1} value={form.verseFrom} onChange={(e) => setForm({ ...form, verseFrom: Number(e.target.value) })} /></label><label>إلى الآية<input type="number" min={1} value={form.verseTo} onChange={(e) => setForm({ ...form, verseTo: Number(e.target.value) })} /></label><label>عدد الصفحات<input type="number" min={0} step="0.25" value={form.pages} onChange={(e) => setForm({ ...form, pages: Number(e.target.value) })} /></label><label>التقييم<select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label><label className="span-2">ملاحظة<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label><div className="form-actions"><button className="primary-button">حفظ المتابعة</button></div></form>}</section>}{active === 'students' && <section className="admin-panel"><div className="panel-heading"><div><span>الحلقات المسندة</span><h2>قائمة الطلاب</h2></div></div><div className="student-grid">{students.map((student) => <div className="student-card" key={student.id}><div className="student-avatar"><Icon name="user" /></div><strong>{student.user.fullName}</strong><span>{student.halaqah.name}</span>{student.dormitory && <small>مبنى {student.dormitory.building} • غرفة {student.dormitory.room}</small>}</div>)}</div></section>}{active === 'history' && <section className="admin-panel"><div className="panel-heading"><div><span>السجل الأكاديمي</span><h2>متابعات الطلاب</h2></div></div><ProgressTable entries={entries} onDelete={remove} /></section>}</>}</DashboardShell>;
}

function ProgressTable({ entries, compact = false, onDelete }: { entries: ProgressEntry[]; compact?: boolean; onDelete?: (id: string) => void }) {
  if (!entries.length) return <EmptyState title="لا توجد سجلات متابعة" />;
  return <div className="table-wrap"><table><thead><tr><th>التاريخ</th><th>الطالب</th><th>السورة</th><th>الآيات</th><th>الصفحات</th><th>التقييم</th>{!compact && <th>الفترة</th>}{onDelete && <th></th>}</tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{formatDate(entry.recordDate)}</td><td>{entry.student.user.fullName}</td><td>{entry.surah}</td><td>{entry.verseFrom} - {entry.verseTo}</td><td>{Number(entry.pages).toFixed(1)}</td><td><span className="rating-badge">{entry.rating} / 5</span></td>{!compact && <td>{entry.period.name}</td>}{onDelete && <td><button className="table-action danger" onClick={() => onDelete(entry.id)}><Icon name="trash" /></button></td>}</tr>)}</tbody></table></div>;
}

function StudentDashboard({ user, onLogout }: { user: SessionUser | null; onLogout: () => void }) {
  type Tab = 'overview' | 'history';
  const [active, setActive] = useState<Tab>('overview');
  const [entries, setEntries] = useState<ProgressEntry[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const nav: NavItem<Tab>[] = [{ id: 'overview', label: 'ملخص تقدمي', icon: 'chart' }, { id: 'history', label: 'سجل الحفظ', icon: 'history' }];
  useEffect(() => { void api.listProgress().then((r) => setEntries(r.entries)).catch((err) => setError(err instanceof Error ? err.message : 'تعذر تحميل التقدم')).finally(() => setLoading(false)); }, []);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'STUDENT') return <Navigate to={routeForRole(user.role)} replace />;
  const latest = entries[0];
  return <DashboardShell user={user} title="لوحة الطالب" nav={nav} active={active} onChange={setActive} onLogout={onLogout}>{error && <div className="error-box">{error}</div>}{loading ? <div className="loading-panel">جارٍ تحميل بياناتك...</div> : active === 'overview' ? <><div className="stat-grid"><StatCard label="جلسات المتابعة" value={entries.length} /><StatCard label="إجمالي الصفحات" value={pagesTotal(entries).toFixed(1)} /><StatCard label="متوسط التقييم" value={`${averageRating(entries).toFixed(1)} / 5`} /><StatCard label="آخر سورة" value={latest?.surah || '—'} /></div><section className="admin-panel"><div className="panel-heading"><div><span>آخر تقدم</span><h2>آخر جلسات الحفظ</h2></div></div><ProgressTable entries={entries.slice(0, 8)} /></section></> : <section className="admin-panel"><div className="panel-heading"><div><span>السجل الكامل</span><h2>تاريخ المتابعة</h2></div></div><ProgressTable entries={entries} /></section>}</DashboardShell>;
}

function ParentDashboard({ user, onLogout }: { user: SessionUser | null; onLogout: () => void }) {
  type Tab = 'overview' | 'children' | 'history';
  const [active, setActive] = useState<Tab>('overview');
  const [children, setChildren] = useState<StudentOption[]>([]); const [entries, setEntries] = useState<ProgressEntry[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [childFilter, setChildFilter] = useState('');
  const nav: NavItem<Tab>[] = [{ id: 'overview', label: 'نظرة عامة', icon: 'home' }, { id: 'children', label: 'الأبناء', icon: 'child' }, { id: 'history', label: 'سجل المتابعة', icon: 'history' }];
  useEffect(() => { void Promise.all([api.listChildren(), api.listProgress()]).then(([c, e]) => { setChildren(c.children); setEntries(e.entries); setChildFilter(c.children[0]?.id || ''); }).catch((err) => setError(err instanceof Error ? err.message : 'تعذر تحميل البيانات')).finally(() => setLoading(false)); }, []);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'PARENT') return <Navigate to={routeForRole(user.role)} replace />;
  const filtered = childFilter ? entries.filter((entry) => entry.student.id === childFilter) : entries;
  return <DashboardShell user={user} title="لوحة ولي الأمر" nav={nav} active={active} onChange={setActive} onLogout={onLogout}>{error && <div className="error-box">{error}</div>}{loading ? <div className="loading-panel">جارٍ تحميل البيانات...</div> : <>{active === 'overview' && <><div className="stat-grid"><StatCard label="الأبناء المرتبطون" value={children.length} /><StatCard label="جلسات المتابعة" value={entries.length} /><StatCard label="إجمالي الصفحات" value={pagesTotal(entries).toFixed(1)} /><StatCard label="متوسط التقييم" value={`${averageRating(entries).toFixed(1)} / 5`} /></div><section className="admin-panel"><div className="panel-heading"><div><span>آخر المستجدات</span><h2>أحدث المتابعات</h2></div></div><ProgressTable entries={entries.slice(0, 8)} /></section></>}{active === 'children' && <section className="admin-panel"><div className="panel-heading"><div><span>الحسابات المرتبطة</span><h2>الأبناء</h2></div></div><div className="student-grid">{children.map((child) => <div className="student-card" key={child.id}><div className="student-avatar"><Icon name="child" /></div><strong>{child.user.fullName}</strong><span>{child.halaqah.name}</span><small>المعلم: {child.halaqah.teacher?.fullName || 'غير معيّن'}</small></div>)}</div>{children.length === 0 && <EmptyState title="لا يوجد طالب مرتبط بحسابك" />}</section>}{active === 'history' && <section className="admin-panel"><div className="panel-heading"><div><span>التقدم الأكاديمي</span><h2>سجل المتابعة</h2></div>{children.length > 1 && <select className="filter-select" value={childFilter} onChange={(e) => setChildFilter(e.target.value)}><option value="">جميع الأبناء</option>{children.map((child) => <option key={child.id} value={child.id}>{child.user.fullName}</option>)}</select>}</div><ProgressTable entries={filtered} /></section>}</>}</DashboardShell>;
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
      <Route path="/" element={<HomePage user={user} />} />
      <Route path="/library" element={<LibraryPage user={user} />} />
      <Route path="/media" element={<MediaPage user={user} />} />
      <Route path="/login" element={<LoginPage user={user} onLogin={setUser} />} />
      <Route path="/admin" element={<ManagementDashboard user={user} onLogout={logout} mode="ADMIN" />} />
      <Route path="/manager" element={<ManagementDashboard user={user} onLogout={logout} mode="MANAGER" />} />
      <Route path="/teacher" element={<TeacherDashboard user={user} onLogout={logout} />} />
      <Route path="/student" element={<StudentDashboard user={user} onLogout={logout} />} />
      <Route path="/parent" element={<ParentDashboard user={user} onLogout={logout} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
