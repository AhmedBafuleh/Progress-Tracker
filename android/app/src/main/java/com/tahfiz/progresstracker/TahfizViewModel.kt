package com.tahfiz.progresstracker

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tahfiz.progresstracker.data.ApiClient
import com.tahfiz.progresstracker.data.CreateProgressRequest
import com.tahfiz.progresstracker.data.ManagedUserDto
import com.tahfiz.progresstracker.data.PeriodDto
import com.tahfiz.progresstracker.data.ProgressEntryDto
import com.tahfiz.progresstracker.data.StudentDto
import com.tahfiz.progresstracker.data.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch


data class TahfizUiState(
    val loading: Boolean = false,
    val user: UserDto? = null,
    val error: String? = null,
    val message: String? = null,
    val users: List<ManagedUserDto> = emptyList(),
    val students: List<StudentDto> = emptyList(),
    val children: List<StudentDto> = emptyList(),
    val periods: List<PeriodDto> = emptyList(),
    val progress: List<ProgressEntryDto> = emptyList(),
)

class TahfizViewModel(application: Application) : AndroidViewModel(application) {
    private val prefs = application.getSharedPreferences("progress_tracker_session", 0)
    private val _state = MutableStateFlow(TahfizUiState())
    val state: StateFlow<TahfizUiState> = _state.asStateFlow()

    init {
        restoreSession()
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
                    clearSession()
                    _state.value = TahfizUiState(error = "انتهت جلسة الدخول. سجل الدخول مرة أخرى.")
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
            runCatching { ApiClient.api.login(com.tahfiz.progresstracker.data.LoginRequest(loginId.trim(), password)) }
                .onSuccess { response ->
                    ApiClient.setToken(response.token)
                    prefs.edit().putString("token", response.token).apply()
                    saveUser(response.user)
                    _state.value = _state.value.copy(user = response.user, loading = false, error = null)
                    loadDashboard()
                }
                .onFailure {
                    _state.value = _state.value.copy(loading = false, error = "تعذر تسجيل الدخول. تحقق من البيانات واتصال الخادم.")
                }
        }
    }

    fun logout() {
        clearSession()
        _state.value = TahfizUiState()
    }

    fun refresh() = loadDashboard()

    fun clearFeedback() {
        _state.value = _state.value.copy(error = null, message = null)
    }

    fun createProgress(request: CreateProgressRequest) {
        _state.value = _state.value.copy(loading = true, error = null, message = null)
        viewModelScope.launch {
            runCatching { ApiClient.api.createProgress(request) }
                .onSuccess { result ->
                    _state.value = _state.value.copy(loading = false, message = result.message)
                    loadDashboard()
                }
                .onFailure {
                    _state.value = _state.value.copy(loading = false, error = "تعذر حفظ المتابعة. تحقق من البيانات والمحاولة مرة أخرى.")
                }
        }
    }

    private fun loadDashboard() {
        val user = _state.value.user ?: return
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            runCatching {
                when (user.role) {
                    "ADMIN", "MANAGER" -> {
                        val users = ApiClient.api.users().users
                        val progress = ApiClient.api.progress().entries
                        DashboardPayload(users = users, progress = progress)
                    }
                    "TEACHER" -> {
                        val students = ApiClient.api.students().students
                        val periods = ApiClient.api.periods().periods
                        val progress = ApiClient.api.progress().entries
                        DashboardPayload(students = students, periods = periods, progress = progress)
                    }
                    "STUDENT" -> DashboardPayload(progress = ApiClient.api.progress().entries)
                    "PARENT" -> {
                        val children = ApiClient.api.children().children
                        val progress = ApiClient.api.progress().entries
                        DashboardPayload(children = children, progress = progress)
                    }
                    else -> DashboardPayload()
                }
            }.onSuccess { payload ->
                _state.value = _state.value.copy(
                    loading = false,
                    users = payload.users,
                    students = payload.students,
                    children = payload.children,
                    periods = payload.periods,
                    progress = payload.progress,
                )
            }.onFailure {
                _state.value = _state.value.copy(loading = false, error = "تعذر تحميل بيانات لوحة التحكم")
            }
        }
    }

    private fun saveUser(user: UserDto) {
        prefs.edit()
            .putString("user_id", user.id)
            .putString("login_id", user.loginId)
            .putString("full_name", user.fullName)
            .putString("role", user.role)
            .apply()
    }

    private fun clearSession() {
        ApiClient.setToken(null)
        prefs.edit().clear().apply()
    }
}

private data class DashboardPayload(
    val users: List<ManagedUserDto> = emptyList(),
    val students: List<StudentDto> = emptyList(),
    val children: List<StudentDto> = emptyList(),
    val periods: List<PeriodDto> = emptyList(),
    val progress: List<ProgressEntryDto> = emptyList(),
)
