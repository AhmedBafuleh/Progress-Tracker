package com.tahfiz.progresstracker

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ExitToApp
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tahfiz.progresstracker.data.CreateProgressRequest
import com.tahfiz.progresstracker.data.PeriodDto
import com.tahfiz.progresstracker.data.ProgressEntryDto
import com.tahfiz.progresstracker.data.StudentDto
import java.time.LocalDate

private val TahfizColors = lightColorScheme(
    primary = Color(0xFF234C35),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE6F0E8),
    onPrimaryContainer = Color(0xFF173625),
    background = Color(0xFFF5F7F5),
    surface = Color.White,
    surfaceVariant = Color(0xFFEEF3EF),
    onSurfaceVariant = Color(0xFF637068),
    error = Color(0xFFB42318),
)

@Composable
fun TahfizApp(viewModel: TahfizViewModel = viewModel()) {
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.error, state.message) {
        val text = state.error ?: state.message
        if (!text.isNullOrBlank()) {
            snackbarHostState.showSnackbar(text)
            viewModel.clearFeedback()
        }
    }

    MaterialTheme(colorScheme = TahfizColors) {
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            if (state.user == null) {
                LoginScreen(
                    loading = state.loading,
                    onLogin = viewModel::login,
                    snackbarHostState = snackbarHostState,
                )
            } else {
                DashboardScreen(
                    state = state,
                    snackbarHostState = snackbarHostState,
                    onLogout = viewModel::logout,
                    onRefresh = viewModel::refresh,
                    onCreateProgress = viewModel::createProgress,
                )
            }
        }
    }
}

@Composable
private fun LoginScreen(
    loading: Boolean,
    onLogin: (String, String) -> Unit,
    snackbarHostState: SnackbarHostState,
) {
    var loginId by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Box(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
            ) {
                Column(
                    modifier = Modifier.padding(28.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text("مركز التحفيظ", fontSize = 26.sp, fontWeight = FontWeight.Bold)
                    Text("تسجيل الدخول إلى نظام المتابعة", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(
                        value = loginId,
                        onValueChange = { loginId = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("معرف المستخدم") },
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("كلمة المرور") },
                        singleLine = true,
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { showPassword = !showPassword }) {
                                Icon(
                                    imageVector = if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                    contentDescription = if (showPassword) "إخفاء كلمة المرور" else "إظهار كلمة المرور",
                                )
                            }
                        },
                    )
                    Button(
                        onClick = { onLogin(loginId, password) },
                        enabled = !loading,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) {
                        if (loading) CircularProgressIndicator(modifier = Modifier.width(22.dp), strokeWidth = 2.dp)
                        else Text("دخول")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DashboardScreen(
    state: TahfizUiState,
    snackbarHostState: SnackbarHostState,
    onLogout: () -> Unit,
    onRefresh: () -> Unit,
    onCreateProgress: (CreateProgressRequest) -> Unit,
) {
    val user = state.user ?: return
    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(user.fullName, fontWeight = FontWeight.Bold)
                        Text(roleLabel(user.role), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh) { Icon(Icons.Outlined.Refresh, contentDescription = "تحديث") }
                    IconButton(onClick = onLogout) { Icon(Icons.Outlined.ExitToApp, contentDescription = "تسجيل الخروج") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (user.role) {
                "ADMIN", "MANAGER" -> ManagementMobileDashboard(state)
                "TEACHER" -> TeacherMobileDashboard(state, onCreateProgress)
                "STUDENT" -> StudentMobileDashboard(state)
                "PARENT" -> ParentMobileDashboard(state)
                else -> EmptyDashboard("هذا الدور غير مدعوم")
            }
            if (state.loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}

@Composable
private fun ManagementMobileDashboard(state: TahfizUiState) {
    val students = state.users.count { it.role == "STUDENT" }
    val teachers = state.users.count { it.role == "TEACHER" }
    val active = state.users.count { it.isActive }
    val pages = state.progress.sumOf { it.pages }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("ملخص الإدارة", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            SummaryGrid(
                listOf(
                    "الحسابات النشطة" to active.toString(),
                    "الطلاب" to students.toString(),
                    "المعلمون" to teachers.toString(),
                    "إجمالي الصفحات" to String.format("%.1f", pages),
                ),
            )
        }
        item { SectionTitle("الحسابات") }
        items(state.users.take(30), key = { it.id }) { account ->
            Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(account.fullName, fontWeight = FontWeight.Bold)
                    Text("${roleLabel(account.role)} • ${if (account.isActive) "نشط" else "موقوف"}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(account.loginId, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        if (state.users.isEmpty()) item { EmptyDashboard("لا توجد حسابات لعرضها") }
    }
}

@Composable
private fun TeacherMobileDashboard(
    state: TahfizUiState,
    onCreateProgress: (CreateProgressRequest) -> Unit,
) {
    var showForm by remember { mutableStateOf(false) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("لوحة المعلم", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            SummaryGrid(
                listOf(
                    "الطلاب" to state.students.size.toString(),
                    "الجلسات" to state.progress.size.toString(),
                    "الصفحات" to String.format("%.1f", state.progress.sumOf { it.pages }),
                    "متوسط التقييم" to averageRating(state.progress),
                ),
            )
        }
        item {
            Button(onClick = { showForm = !showForm }, modifier = Modifier.fillMaxWidth()) {
                Text(if (showForm) "إخفاء نموذج المتابعة" else "تسجيل متابعة جديدة")
            }
        }
        if (showForm) {
            item {
                ProgressEntryForm(
                    students = state.students,
                    periods = state.periods,
                    onSubmit = {
                        onCreateProgress(it)
                        showForm = false
                    },
                )
            }
        }
        item { SectionTitle("آخر المتابعات") }
        items(state.progress.take(30), key = { it.id }) { entry -> ProgressCard(entry) }
        if (state.progress.isEmpty()) item { EmptyDashboard("لا توجد سجلات متابعة حتى الآن") }
    }
}

@Composable
private fun StudentMobileDashboard(state: TahfizUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("تقدمي في الحفظ", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            SummaryGrid(
                listOf(
                    "الجلسات" to state.progress.size.toString(),
                    "الصفحات" to String.format("%.1f", state.progress.sumOf { it.pages }),
                    "متوسط التقييم" to averageRating(state.progress),
                    "آخر سورة" to (state.progress.firstOrNull()?.surah ?: "—"),
                ),
            )
        }
        item { SectionTitle("سجل الحفظ") }
        items(state.progress, key = { it.id }) { entry -> ProgressCard(entry) }
        if (state.progress.isEmpty()) item { EmptyDashboard("لا توجد سجلات متابعة بعد") }
    }
}

@Composable
private fun ParentMobileDashboard(state: TahfizUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text("متابعة الأبناء", fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(10.dp))
            SummaryGrid(
                listOf(
                    "الأبناء" to state.children.size.toString(),
                    "الجلسات" to state.progress.size.toString(),
                    "الصفحات" to String.format("%.1f", state.progress.sumOf { it.pages }),
                    "متوسط التقييم" to averageRating(state.progress),
                ),
            )
        }
        item { SectionTitle("الأبناء المرتبطون") }
        items(state.children, key = { it.id }) { child ->
            Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(child.user.fullName, fontWeight = FontWeight.Bold)
                    Text(child.halaqah.name, color = MaterialTheme.colorScheme.primary)
                    Text("المعلم: ${child.halaqah.teacher?.fullName ?: "غير معيّن"}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item { SectionTitle("آخر المتابعات") }
        items(state.progress.take(30), key = { it.id }) { entry -> ProgressCard(entry) }
        if (state.children.isEmpty()) item { EmptyDashboard("لا يوجد طالب مرتبط بهذا الحساب") }
    }
}

@Composable
private fun ProgressEntryForm(
    students: List<StudentDto>,
    periods: List<PeriodDto>,
    onSubmit: (CreateProgressRequest) -> Unit,
) {
    var studentId by remember(students) { mutableStateOf(students.firstOrNull()?.id.orEmpty()) }
    var periodId by remember(periods) { mutableStateOf(periods.firstOrNull()?.id.orEmpty()) }
    var surah by remember { mutableStateOf("") }
    var verseFrom by remember { mutableStateOf("1") }
    var verseTo by remember { mutableStateOf("1") }
    var pages by remember { mutableStateOf("1") }
    var rating by remember { mutableStateOf("5") }
    var note by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(LocalDate.now().toString()) }

    Card(shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("بيانات المتابعة", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            DropdownSelector(
                label = "الطالب",
                value = students.firstOrNull { it.id == studentId }?.user?.fullName ?: "اختر الطالب",
                options = students.map { it.id to "${it.user.fullName} - ${it.halaqah.name}" },
                onSelected = { studentId = it },
            )
            DropdownSelector(
                label = "الفترة",
                value = periods.firstOrNull { it.id == periodId }?.name ?: "اختر الفترة",
                options = periods.map { it.id to "${it.name} (${it.startTime})" },
                onSelected = { periodId = it },
            )
            OutlinedTextField(value = surah, onValueChange = { surah = it }, modifier = Modifier.fillMaxWidth(), label = { Text("السورة") }, singleLine = true)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = verseFrom, onValueChange = { verseFrom = it.filter(Char::isDigit) }, modifier = Modifier.weight(1f), label = { Text("من الآية") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true)
                OutlinedTextField(value = verseTo, onValueChange = { verseTo = it.filter(Char::isDigit) }, modifier = Modifier.weight(1f), label = { Text("إلى الآية") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = pages, onValueChange = { pages = it }, modifier = Modifier.weight(1f), label = { Text("الصفحات") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
                OutlinedTextField(value = rating, onValueChange = { rating = it.filter(Char::isDigit).take(1) }, modifier = Modifier.weight(1f), label = { Text("التقييم / 5") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true)
            }
            OutlinedTextField(value = date, onValueChange = { date = it }, modifier = Modifier.fillMaxWidth(), label = { Text("التاريخ YYYY-MM-DD") }, singleLine = true)
            OutlinedTextField(value = note, onValueChange = { note = it }, modifier = Modifier.fillMaxWidth(), label = { Text("ملاحظة") }, minLines = 2)
            Button(
                onClick = {
                    val from = verseFrom.toIntOrNull() ?: 1
                    val to = verseTo.toIntOrNull() ?: from
                    val pageCount = pages.toDoubleOrNull() ?: 0.0
                    val score = (rating.toIntOrNull() ?: 5).coerceIn(1, 5)
                    if (studentId.isNotBlank() && periodId.isNotBlank() && surah.isNotBlank()) {
                        onSubmit(CreateProgressRequest(studentId, periodId, surah.trim(), from, to, pageCount, score, date, note.ifBlank { null }))
                    }
                },
                enabled = students.isNotEmpty() && periods.isNotEmpty(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text("حفظ المتابعة") }
        }
    }
}

@Composable
private fun DropdownSelector(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    onSelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) { Text(value, modifier = Modifier.fillMaxWidth()) }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option.second) },
                        onClick = {
                            onSelected(option.first)
                            expanded = false
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun ProgressCard(entry: ProgressEntryDto) {
    Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(entry.student.user.fullName, fontWeight = FontWeight.Bold)
                Text("${entry.rating} / 5", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            }
            Text("سورة ${entry.surah} • الآيات ${entry.verseFrom} - ${entry.verseTo}")
            Text("${entry.pages} صفحة • ${entry.period.name}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            Text(entry.recordDate.take(10), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            entry.note?.takeIf { it.isNotBlank() }?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp) }
        }
    }
}

@Composable
private fun SummaryGrid(items: List<Pair<String, String>>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items.chunked(2).forEach { rowItems ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                rowItems.forEach { item -> SummaryCard(item.first, item.second, Modifier.weight(1f)) }
                if (rowItems.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun SummaryCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            Spacer(Modifier.height(8.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 21.sp)
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(top = 4.dp))
}

@Composable
private fun EmptyDashboard(text: String) {
    Card(shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
        Text(text, modifier = Modifier.padding(22.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun roleLabel(role: String): String = when (role) {
    "ADMIN" -> "المدير"
    "MANAGER" -> "المشرف"
    "TEACHER" -> "المعلم"
    "STUDENT" -> "الطالب"
    "PARENT" -> "ولي الأمر"
    else -> role
}

private fun averageRating(entries: List<ProgressEntryDto>): String {
    if (entries.isEmpty()) return "0.0 / 5"
    return String.format("%.1f / 5", entries.map { it.rating }.average())
}
