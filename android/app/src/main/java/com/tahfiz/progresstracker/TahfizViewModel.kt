package com.tahfiz.progresstracker

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tahfiz.progresstracker.data.*
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TahfizUiState(
    val loading: Boolean = false,
    val user: UserDto? = null,
    val error: String? = null,
    val message: String? = null,
    val serverUrl: String = "",
    val users: List<ManagedUserDto> = emptyList(),
    val halaqahs: List<HalaqahDto> = emptyList(),
    val teachers: List<TeacherDto> = emptyList(),
    val students: List<StudentDto> = emptyList(),
    val children: List<StudentDto> = emptyList(),
    val parentLinks: List<ParentLinkDto> = emptyList(),
    val periods: List<PeriodDto> = emptyList(),
    val progress: List<ProgressEntryDto> = emptyList(),
    val leaves: List<LeaveRequestDto> = emptyList(),
    val notes: List<NoteViolationDto> = emptyList(),
    val tests: List<MonthlyTestDto> = emptyList(),
    val notifications: List<NotificationDto> = emptyList(),
    val unreadCount: Int = 0,
    val library: List<LibraryItemDto> = emptyList(),
    val media: List<ActivityDto> = emptyList(),
    val publicLibrary: List<LibraryItemDto> = emptyList(),
    val publicMedia: List<ActivityDto> = emptyList(),
    val home: HomeContentDto? = null,
    val reportStudents: List<ReportStudentDto> = emptyList(),
    val selectedReport: StudentPerformanceReportDto? = null,
    val halaqahReport: HalaqahReportDto? = null,
    val aiStatus: AiStatusResponse? = null,
    val aiPeople: List<AiPersonDto> = emptyList(),
    val aiResult: AiAnalysisResponse? = null,
    val aiHistory: List<AiAnalysisResponse> = emptyList(),
    val credentialReveal: CredentialResponse? = null,
)

class TahfizViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("progress_tracker_session", 0)
    private val _state = MutableStateFlow(
        TahfizUiState(serverUrl = prefs.getString("server_url", ApiClient.baseUrl()) ?: ApiClient.baseUrl()),
    )
    val state: StateFlow<TahfizUiState> = _state.asStateFlow()

    init {
        ApiClient.configure(_state.value.serverUrl)
        loadPublicContent()
        restoreSession()
    }

    fun setServerUrl(url: String) {
        runCatching {
            ApiClient.configure(url)
            val normalized = ApiClient.baseUrl()
            prefs.edit().putString("server_url", normalized).apply()
            _state.value = _state.value.copy(serverUrl = normalized, message = "تم حفظ عنوان الخادم")
            loadPublicContent(showLoading = true)
        }.onFailure {
            _state.value = _state.value.copy(error = "عنوان الخادم غير صالح")
        }
    }

    private fun restoreSession() {
        val token = prefs.getString("token", null) ?: return
        ApiClient.setToken(token)
        _state.value = _state.value.copy(loading = true)
        viewModelScope.launch {
            runCatching { ApiClient.api.me() }
                .onSuccess { response ->
                    _state.value = _state.value.copy(user = response.user, loading = false, error = null)
                    saveUser(response.user)
                    loadDashboard()
                }
                .onFailure {
                    clearSession(keepServer = true)
                    _state.value = _state.value.copy(
                        user = null,
                        loading = false,
                        error = "انتهت جلسة الدخول. سجل الدخول مرة أخرى.",
                    )
                }
        }
    }

    fun login(loginId: String, password: String) {
        if (loginId.isBlank() || password.isBlank()) {
            _state.value = _state.value.copy(error = "أدخل معرف المستخدم وكلمة المرور")
            return
        }
        _state.value = _state.value.copy(loading = true, error = null, message = null)
        viewModelScope.launch {
            runCatching { ApiClient.api.login(LoginRequest(loginId.trim(), password)) }
                .onSuccess { response ->
                    ApiClient.setToken(response.token)
                    prefs.edit().putString("token", response.token).apply()
                    saveUser(response.user)
                    _state.value = _state.value.copy(user = response.user, loading = false, error = null)
                    loadDashboard()
                }
                .onFailure {
                    _state.value = _state.value.copy(
                        loading = false,
                        error = ApiClient.friendlyError(it, "تعذر تسجيل الدخول. تحقق من البيانات واتصال الخادم."),
                    )
                }
        }
    }

    fun logout() {
        clearSession(keepServer = true)
        _state.value = TahfizUiState(serverUrl = ApiClient.baseUrl())
        loadPublicContent(showLoading = true)
    }

    fun refresh() = loadDashboard()

    fun refreshPublic() = loadPublicContent(showLoading = true)

    fun clearFeedback() {
        _state.value = _state.value.copy(error = null, message = null)
    }

    fun clearCredential() {
        _state.value = _state.value.copy(credentialReveal = null)
    }

    private fun loadPublicContent(showLoading: Boolean = false) {
        if (showLoading) {
            _state.value = _state.value.copy(loading = true, error = null)
        }
        viewModelScope.launch {
            runCatching {
                val home = async { ApiClient.api.home().home }
                val library = async { ApiClient.api.publicLibrary().items }
                val media = async { ApiClient.api.publicMedia().activities }
                Triple(home.await(), library.await(), media.await())
            }.onSuccess { (home, library, media) ->
                _state.value = _state.value.copy(
                    loading = if (showLoading) false else _state.value.loading,
                    home = home,
                    publicLibrary = library,
                    publicMedia = media,
                )
            }.onFailure {
                if (_state.value.user == null) {
                    _state.value = _state.value.copy(
                        loading = false,
                        error = ApiClient.friendlyError(it, "تعذر تحميل الموقع العام"),
                    )
                }
            }
        }
    }

    private fun loadDashboard() {
        val user = _state.value.user ?: return
        _state.value = _state.value.copy(loading = true, error = null)

        viewModelScope.launch {
            runCatching {
                val commonHome = async { ApiClient.api.home().home }
                val commonLibrary = async {
                    if (user.role == "ADMIN" || user.role == "MANAGER") ApiClient.api.managedLibrary().items
                    else ApiClient.api.publicLibrary().items
                }
                val commonMedia = async {
                    if (user.role == "ADMIN" || user.role == "MANAGER") ApiClient.api.managedMedia().activities
                    else ApiClient.api.publicMedia().activities
                }
                val commonReportStudents = async { ApiClient.api.reportStudents().students }

                when (user.role) {
                    "ADMIN" -> {
                        val users = async { ApiClient.api.users().users }
                        val halaqahs = async { ApiClient.api.halaqahs().halaqahs }
                        val teachers = async { ApiClient.api.teachers().teachers }
                        val students = async { ApiClient.api.students().students }
                        val links = async { ApiClient.api.parentLinks().links }
                        val periods = async { ApiClient.api.periods().periods }
                        val progress = async { ApiClient.api.progress().entries }
                        val leaves = async { ApiClient.api.leaves().requests }
                        val notes = async { ApiClient.api.notes().notes }
                        val tests = async { ApiClient.api.monthlyTests().tests }
                        val notifications = async { ApiClient.api.notifications() }
                        val aiStatus = async { ApiClient.api.aiStatus() }
                        val aiPeople = async { ApiClient.api.aiPeople().people }

                        DashboardPayload(
                            users = users.await(),
                            halaqahs = halaqahs.await(),
                            teachers = teachers.await(),
                            students = students.await(),
                            parentLinks = links.await(),
                            periods = periods.await(),
                            progress = progress.await(),
                            leaves = leaves.await(),
                            notes = notes.await(),
                            tests = tests.await(),
                            notifications = notifications.await().notifications,
                            home = commonHome.await(),
                            library = commonLibrary.await(),
                            media = commonMedia.await(),
                            reportStudents = commonReportStudents.await(),
                            aiStatus = runCatching { aiStatus.await() }.getOrNull(),
                            aiPeople = runCatching { aiPeople.await() }.getOrDefault(emptyList()),
                        )
                    }

                    "MANAGER" -> {
                        val users = async { ApiClient.api.users().users }
                        val halaqahs = async { ApiClient.api.halaqahs().halaqahs }
                        val teachers = async { ApiClient.api.teachers().teachers }
                        val students = async { ApiClient.api.students().students }
                        val links = async { ApiClient.api.parentLinks().links }
                        val periods = async { ApiClient.api.periods().periods }
                        val progress = async { ApiClient.api.progress().entries }
                        val leaves = async { ApiClient.api.leaves().requests }
                        val notes = async { ApiClient.api.notes().notes }
                        val notifications = async { ApiClient.api.notifications() }
                        DashboardPayload(
                            users = users.await(),
                            halaqahs = halaqahs.await(),
                            teachers = teachers.await(),
                            students = students.await(),
                            parentLinks = links.await(),
                            periods = periods.await(),
                            progress = progress.await(),
                            leaves = leaves.await(),
                            notes = notes.await(),
                            notifications = notifications.await().notifications,
                            home = commonHome.await(),
                            library = commonLibrary.await(),
                            media = commonMedia.await(),
                            reportStudents = commonReportStudents.await(),
                        )
                    }

                    "TEACHER" -> {
                        val students = async { ApiClient.api.students().students }
                        val periods = async { ApiClient.api.periods().periods }
                        val progress = async { ApiClient.api.progress().entries }
                        val leaves = async { ApiClient.api.leaves().requests }
                        val notes = async { ApiClient.api.notes().notes }
                        val tests = async { ApiClient.api.monthlyTests().tests }
                        DashboardPayload(
                            students = students.await(),
                            periods = periods.await(),
                            progress = progress.await(),
                            leaves = leaves.await(),
                            notes = notes.await(),
                            tests = tests.await(),
                            home = commonHome.await(),
                            library = commonLibrary.await(),
                            media = commonMedia.await(),
                            reportStudents = commonReportStudents.await(),
                        )
                    }

                    "STUDENT" -> {
                        val progress = async { ApiClient.api.progress().entries }
                        val leaves = async { ApiClient.api.leaves().requests }
                        val notifications = async { ApiClient.api.notifications() }
                        val notificationData = notifications.await()
                        DashboardPayload(
                            progress = progress.await(),
                            leaves = leaves.await(),
                            notifications = notificationData.notifications,
                            unreadCount = notificationData.unreadCount,
                            home = commonHome.await(),
                            library = commonLibrary.await(),
                            media = commonMedia.await(),
                            reportStudents = commonReportStudents.await(),
                        )
                    }

                    "PARENT" -> {
                        val children = async { ApiClient.api.children().children }
                        val progress = async { ApiClient.api.progress().entries }
                        DashboardPayload(
                            children = children.await(),
                            progress = progress.await(),
                            home = commonHome.await(),
                            library = commonLibrary.await(),
                            media = commonMedia.await(),
                            reportStudents = commonReportStudents.await(),
                        )
                    }

                    else -> DashboardPayload(
                        home = commonHome.await(),
                        library = commonLibrary.await(),
                        media = commonMedia.await(),
                        reportStudents = commonReportStudents.await(),
                    )
                }
            }.onSuccess { payload ->
                _state.value = _state.value.copy(
                    loading = false,
                    users = payload.users,
                    halaqahs = payload.halaqahs,
                    teachers = payload.teachers,
                    students = payload.students,
                    children = payload.children,
                    parentLinks = payload.parentLinks,
                    periods = payload.periods,
                    progress = payload.progress,
                    leaves = payload.leaves,
                    notes = payload.notes,
                    tests = payload.tests,
                    notifications = payload.notifications,
                    unreadCount = payload.unreadCount,
                    library = payload.library,
                    media = payload.media,
                    home = payload.home,
                    reportStudents = payload.reportStudents,
                    aiStatus = payload.aiStatus,
                    aiPeople = payload.aiPeople,
                )
            }.onFailure {
                _state.value = _state.value.copy(
                    loading = false,
                    error = ApiClient.friendlyError(it, "تعذر تحميل بيانات لوحة التحكم"),
                )
            }
        }
    }

    private fun mutate(fallback: String, action: suspend () -> String) {
        _state.value = _state.value.copy(loading = true, error = null, message = null)
        viewModelScope.launch {
            runCatching { action() }
                .onSuccess { message ->
                    _state.value = _state.value.copy(loading = false, message = message)
                    loadDashboard()
                }
                .onFailure {
                    _state.value = _state.value.copy(
                        loading = false,
                        error = ApiClient.friendlyError(it, fallback),
                    )
                }
        }
    }

    // Users
    fun createUser(request: CreateUserRequest) = mutate("تعذر إنشاء الحساب") {
        ApiClient.api.createUser(request).message
    }

    fun updateUser(id: String, request: UpdateUserRequest) = mutate("تعذر تحديث الحساب") {
        ApiClient.api.updateUser(id, request).message
    }

    fun deleteUser(id: String) = mutate("تعذر حذف الحساب") {
        ApiClient.api.deleteUser(id).message
    }

    fun revealCredential(id: String) {
        viewModelScope.launch {
            runCatching { ApiClient.api.credential(id) }
                .onSuccess { _state.value = _state.value.copy(credentialReveal = it, error = null) }
                .onFailure { _state.value = _state.value.copy(error = ApiClient.friendlyError(it, "تعذر عرض بيانات الدخول")) }
        }
    }

    fun resetPassword(id: String, password: String) = mutate("تعذر إعادة تعيين كلمة المرور") {
        ApiClient.api.resetPassword(id, PasswordResetRequest(password)).message
    }

    // Halaqahs
    fun createHalaqah(request: CreateHalaqahRequest) = mutate("تعذر إنشاء الحلقة") {
        ApiClient.api.createHalaqah(request).message ?: "تم إنشاء الحلقة"
    }

    fun updateHalaqah(id: String, request: UpdateHalaqahRequest) = mutate("تعذر تحديث الحلقة") {
        ApiClient.api.updateHalaqah(id, request).message ?: "تم تحديث الحلقة"
    }

    fun deleteHalaqah(id: String) = mutate("تعذر حذف الحلقة") {
        ApiClient.api.deleteHalaqah(id).message
    }

    // Parent links
    fun createParentLink(request: ParentLinkRequest) = mutate("تعذر ربط ولي الأمر") {
        ApiClient.api.createParentLink(request).message
    }

    fun deleteParentLink(id: String) = mutate("تعذر حذف الربط") {
        ApiClient.api.deleteParentLink(id).message
    }

    // Schedule
    fun createPeriod(request: PeriodRequest) = mutate("تعذر إضافة الفترة") {
        ApiClient.api.createPeriod(request).message
    }

    fun updatePeriod(id: String, request: PeriodRequest) = mutate("تعذر تحديث الفترة") {
        ApiClient.api.updatePeriod(id, request).message
    }

    fun deletePeriod(id: String) = mutate("تعذر حذف الفترة") {
        ApiClient.api.deletePeriod(id).message
    }

    // Progress
    fun createProgress(request: CreateProgressRequest) = mutate("تعذر حفظ المتابعة") {
        ApiClient.api.createProgress(request).message
    }

    fun updateProgress(id: String, request: CreateProgressRequest) = mutate("تعذر تحديث المتابعة") {
        ApiClient.api.updateProgress(id, request).message
    }

    fun deleteProgress(id: String) = mutate("تعذر حذف سجل المتابعة") {
        ApiClient.api.deleteProgress(id).message
    }

    // Leaves
    fun createLeave(request: CreateLeaveRequest) = mutate("تعذر إرسال طلب الإجازة") {
        ApiClient.api.createLeave(request).message
    }

    fun reviewLeave(id: String, request: LeaveReviewRequest) = mutate("تعذر مراجعة الطلب") {
        ApiClient.api.reviewLeave(id, request).message
    }

    // Notes / tests
    fun createNote(request: CreateNoteRequest) = mutate("تعذر حفظ الملاحظة") {
        ApiClient.api.createNote(request).message
    }

    fun createMonthlyTest(request: CreateMonthlyTestRequest) = mutate("تعذر حفظ الاختبار") {
        ApiClient.api.createMonthlyTest(request).message
    }

    // Notifications
    fun createNotification(request: CreateNotificationRequest) = mutate("تعذر إرسال الإشعار") {
        ApiClient.api.createNotification(request).message
    }

    fun markNotificationRead(id: String) = mutate("تعذر تحديث الإشعار") {
        ApiClient.api.markNotificationRead(id).message
    }

    fun markAllNotificationsRead() = mutate("تعذر تحديث الإشعارات") {
        ApiClient.api.markAllNotificationsRead().message
    }

    // Home / content
    fun updateHome(request: HomeContentDto) = mutate("تعذر تحديث الصفحة الرئيسية") {
        ApiClient.api.updateHome(request).message ?: "تم تحديث الصفحة الرئيسية"
    }

    fun createLibraryItem(request: LibraryItemRequest) = mutate("تعذر إضافة مادة المكتبة") {
        ApiClient.api.createLibraryItem(request).message
    }

    fun updateLibraryItem(id: String, request: LibraryItemRequest) = mutate("تعذر تحديث مادة المكتبة") {
        ApiClient.api.updateLibraryItem(id, request).message
    }

    fun deleteLibraryItem(id: String) = mutate("تعذر حذف مادة المكتبة") {
        ApiClient.api.deleteLibraryItem(id).message
    }

    fun uploadAndCreateLibraryItem(
        bytes: ByteArray,
        mimeType: String,
        fileName: String,
        title: String,
        description: String?,
        published: Boolean,
    ) = mutate("تعذر رفع ملف المكتبة") {
        val upload = ApiClient.api.uploadLibraryFile(
            mimeType,
            ApiClient.encodedFileName(fileName),
            ApiClient.requestBody(bytes, mimeType),
        )
        ApiClient.api.createLibraryItem(
            LibraryItemRequest(
                title = title,
                description = description,
                type = upload.file.type,
                url = upload.file.url,
                published = published,
            ),
        ).message
    }

    fun createActivity(request: ActivityRequest) = mutate("تعذر إضافة المحتوى الإعلامي") {
        ApiClient.api.createActivity(request).message
    }

    fun createActivityWithAsset(
        request: ActivityRequest,
        bytes: ByteArray,
        mimeType: String,
        fileName: String,
    ) = mutate("تعذر إضافة المحتوى الإعلامي") {
        val created = ApiClient.api.createActivity(request)
        val activityId = created.activity?.id ?: return@mutate created.message
        ApiClient.api.uploadActivityAsset(
            activityId,
            mimeType,
            ApiClient.encodedFileName(fileName),
            ApiClient.requestBody(bytes, mimeType),
        )
        created.message
    }

    fun updateActivity(id: String, request: ActivityRequest) = mutate("تعذر تحديث المحتوى الإعلامي") {
        ApiClient.api.updateActivity(id, request).message
    }

    fun deleteActivity(id: String) = mutate("تعذر حذف المحتوى الإعلامي") {
        ApiClient.api.deleteActivity(id).message
    }

    fun uploadActivityAsset(
        activityId: String,
        bytes: ByteArray,
        mimeType: String,
        fileName: String,
    ) = mutate("تعذر رفع الملف") {
        ApiClient.api.uploadActivityAsset(
            activityId,
            mimeType,
            ApiClient.encodedFileName(fileName),
            ApiClient.requestBody(bytes, mimeType),
        ).message
    }

    fun deleteActivityAsset(activityId: String, assetId: String) = mutate("تعذر حذف الملف") {
        ApiClient.api.deleteActivityAsset(activityId, assetId).message
    }

    // Reports
    fun loadStudentReport(studentId: String, from: String?, to: String?) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { ApiClient.api.studentReport(studentId, from, to).report }
                .onSuccess { _state.value = _state.value.copy(loading = false, selectedReport = it) }
                .onFailure {
                    _state.value = _state.value.copy(
                        loading = false,
                        error = ApiClient.friendlyError(it, "تعذر تحميل التقرير"),
                    )
                }
        }
    }

    fun loadHalaqahReport(halaqahId: String) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { ApiClient.api.halaqahReport(halaqahId).report }
                .onSuccess { _state.value = _state.value.copy(loading = false, halaqahReport = it) }
                .onFailure {
                    _state.value = _state.value.copy(
                        loading = false,
                        error = ApiClient.friendlyError(it, "تعذر تحميل تقرير الحلقة"),
                    )
                }
        }
    }

    // Admin local AI
    fun analyzePerson(request: AiAnalyzeRequest) {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching { ApiClient.api.analyzePerson(request) }
                .onSuccess { result ->
                    _state.value = _state.value.copy(
                        loading = false,
                        aiResult = result,
                        aiHistory = (_state.value.aiHistory + result).takeLast(6),
                    )
                }
                .onFailure {
                    _state.value = _state.value.copy(
                        loading = false,
                        error = ApiClient.friendlyError(it, "تعذر تشغيل المساعد الذكي"),
                    )
                }
        }
    }

    fun clearAiConversation() {
        _state.value = _state.value.copy(aiResult = null, aiHistory = emptyList())
    }

    private fun saveUser(user: UserDto) {
        prefs.edit()
            .putString("user_id", user.id)
            .putString("login_id", user.loginId)
            .putString("full_name", user.fullName)
            .putString("role", user.role)
            .apply()
    }

    private fun clearSession(keepServer: Boolean) {
        ApiClient.setToken(null)
        val server = prefs.getString("server_url", ApiClient.baseUrl())
        prefs.edit().clear().apply()
        if (keepServer && server != null) prefs.edit().putString("server_url", server).apply()
    }
}

private data class DashboardPayload(
    val users: List<ManagedUserDto> = emptyList(),
    val halaqahs: List<HalaqahDto> = emptyList(),
    val teachers: List<TeacherDto> = emptyList(),
    val students: List<StudentDto> = emptyList(),
    val children: List<StudentDto> = emptyList(),
    val parentLinks: List<ParentLinkDto> = emptyList(),
    val periods: List<PeriodDto> = emptyList(),
    val progress: List<ProgressEntryDto> = emptyList(),
    val leaves: List<LeaveRequestDto> = emptyList(),
    val notes: List<NoteViolationDto> = emptyList(),
    val tests: List<MonthlyTestDto> = emptyList(),
    val notifications: List<NotificationDto> = emptyList(),
    val unreadCount: Int = 0,
    val library: List<LibraryItemDto> = emptyList(),
    val media: List<ActivityDto> = emptyList(),
    val home: HomeContentDto? = null,
    val reportStudents: List<ReportStudentDto> = emptyList(),
    val aiStatus: AiStatusResponse? = null,
    val aiPeople: List<AiPersonDto> = emptyList(),
)
