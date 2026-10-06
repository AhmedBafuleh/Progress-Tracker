package com.tahfiz.progresstracker

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.LockReset
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tahfiz.progresstracker.data.*
import java.util.Locale

@Composable
fun OverviewScreen(state: TahfizUiState) {
    val role = state.user?.role.orEmpty()
    val title = when (role) {
        "ADMIN" -> "لوحة الإدارة"
        "MANAGER" -> "لوحة المشرف"
        "TEACHER" -> "لوحة المعلم"
        "STUDENT" -> "تقدمي"
        "PARENT" -> "متابعة الأبناء"
        else -> "الرئيسية"
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            ScreenHeader(
                eyebrow = "دار النور لتعليم القرآن الكريم",
                title = title,
                subtitle = state.home?.calloutBody ?: "متابعة منظمة وواضحة من مكان واحد.",
            )
        }

        item {
            val values = when (role) {
                "ADMIN", "MANAGER" -> listOf(
                    "الحسابات النشطة" to state.users.count { it.isActive }.toString(),
                    "الطلاب" to state.users.count { it.role == "STUDENT" }.toString(),
                    "الحلقات" to state.halaqahs.size.toString(),
                    "سجلات المتابعة" to state.progress.size.toString(),
                )
                "TEACHER" -> listOf(
                    "الطلاب" to state.students.size.toString(),
                    "سجلات المتابعة" to state.progress.size.toString(),
                    "إجمالي الصفحات" to String.format(Locale.ENGLISH, "%.1f", state.progress.sumOf { it.pages }),
                    "متوسط التقييم" to averageRatingText(state.progress),
                )
                "STUDENT" -> listOf(
                    "الجلسات" to state.progress.size.toString(),
                    "الحضور" to state.progress.count { it.attended }.toString(),
                    "إجمالي الصفحات" to String.format(Locale.ENGLISH, "%.1f", state.progress.sumOf { it.pages }),
                    "متوسط التقييم" to averageRatingText(state.progress),
                )
                "PARENT" -> listOf(
                    "الأبناء" to state.children.size.toString(),
                    "الجلسات" to state.progress.size.toString(),
                    "إجمالي الصفحات" to String.format(Locale.ENGLISH, "%.1f", state.progress.sumOf { it.pages }),
                    "متوسط التقييم" to averageRatingText(state.progress),
                )
                else -> emptyList()
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                values.chunked(2).forEach { pair ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        pair.forEachIndexed { index, metric ->
                            MetricCard(
                                metric.first,
                                metric.second,
                                modifier = Modifier.weight(1f),
                                accent = if (index % 2 == 0) BrandPurple else BrandGreen,
                            )
                        }
                        if (pair.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }

        if (state.progress.isNotEmpty()) {
            item { ScreenHeader("آخر المتابعات", "النشاط الأكاديمي الأخير") }
            items(state.progress.take(6), key = { it.id }) { entry -> ProgressCompactCard(entry) }
        }

        state.home?.let { home ->
            item {
                Card(
                    shape = RoundedCornerShape(22.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(home.calloutTitle, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text(home.calloutBody, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 21.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProgressCompactCard(entry: ProgressEntryDto) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
        Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(entry.student.user.fullName, fontWeight = FontWeight.Bold)
                StatusChip(if (entry.attended) recordTypeLabel(entry.recordType) else "غائب", entry.attended)
            }
            val detail = if (!entry.attended) {
                "لم يحضر"
            } else if (entry.recordType == "MATN") {
                listOfNotNull(entry.matnName, entry.matnFrom?.let { "من $it" }, entry.matnTo?.let { "إلى $it" }).joinToString(" • ")
            } else {
                "${entry.surah ?: "—"} ${entry.verseFrom ?: ""} ← ${entry.endSurah ?: entry.surah ?: ""} ${entry.verseTo ?: ""}"
            }
            Text(detail, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            Text(
                "${formatDate(entry.recordDate)} • ${entry.rating?.let { "$it/5" } ?: "بدون تقييم"}",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp,
            )
        }
    }
}

@Composable
fun UsersScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    var showCreate by remember { mutableStateOf(false) }
    var editUser by remember { mutableStateOf<ManagedUserDto?>(null) }
    var resetUser by remember { mutableStateOf<ManagedUserDto?>(null) }
    var deleteUser by remember { mutableStateOf<ManagedUserDto?>(null) }
    val isAdmin = state.user?.role == "ADMIN"

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("إدارة الحسابات", "المستخدمون", "إنشاء الحسابات وتعديل بياناتها وإدارة كلمات المرور من الهاتف.") }
        item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("إضافة حساب")
            }
        }

        items(state.users, key = { it.id }) { account ->
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(19.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(account.fullName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text(
                                "${roleLabel(account.role)} • ${account.loginId}",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 12.sp,
                            )
                        }
                        StatusChip(if (account.isActive) "نشط" else "موقوف", account.isActive)
                    }
                    account.email?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                    account.studentProfile?.halaqah?.let { Text("الحلقة: ${it.name}", fontSize = 12.sp) }

                    if (account.role != "ADMIN" && (isAdmin || account.role != "MANAGER")) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(onClick = { editUser = account }) { Icon(Icons.Outlined.Edit, contentDescription = "تعديل") }
                            IconButton(onClick = { resetUser = account }) { Icon(Icons.Outlined.LockReset, contentDescription = "إعادة تعيين كلمة المرور") }
                            IconButton(onClick = { deleteUser = account }) { Icon(Icons.Outlined.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
        }
        if (state.users.isEmpty()) item { EmptyState("لا توجد حسابات") }
    }

    if (showCreate) {
        CreateUserDialog(
            state = state,
            allowManager = isAdmin,
            onDismiss = { showCreate = false },
            onSubmit = { viewModel.createUser(it); showCreate = false },
        )
    }

    editUser?.let { account ->
        EditUserDialog(
            state = state,
            account = account,
            onDismiss = { editUser = null },
            onSubmit = { viewModel.updateUser(account.id, it); editUser = null },
        )
    }

    resetUser?.let { account ->
        ResetPasswordDialog(
            name = account.fullName,
            onDismiss = { resetUser = null },
            onSubmit = { viewModel.resetPassword(account.id, it); resetUser = null },
        )
    }

    deleteUser?.let { account ->
        AlertDialog(
            onDismissRequest = { deleteUser = null },
            title = { Text("حذف الحساب") },
            text = { Text("هل تريد حذف حساب ${account.fullName}؟ سيُمنع تسجيل الدخول مع الاحتفاظ بالسجل الأكاديمي المرتبط به.") },
            confirmButton = {
                TextButton(onClick = { viewModel.deleteUser(account.id); deleteUser = null }) {
                    Text("حذف", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { deleteUser = null }) { Text("إلغاء") } },
        )
    }

}

@Composable
private fun CreateUserDialog(
    state: TahfizUiState,
    allowManager: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (CreateUserRequest) -> Unit,
) {
    var role by remember { mutableStateOf("STUDENT") }
    var loginNumber by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var age by remember { mutableStateOf("") }
    var joinedAt by remember { mutableStateOf(todayIso()) }
    var memorized by remember { mutableStateOf("") }
    var halaqahId by remember { mutableStateOf(state.halaqahs.firstOrNull()?.id.orEmpty()) }
    var building by remember { mutableStateOf("") }
    var room by remember { mutableStateOf("") }

    val roleOptions = buildList {
        if (allowManager) add("MANAGER" to "مشرف")
        add("TEACHER" to "معلم")
        add("STUDENT" to "طالب")
        add("PARENT" to "ولي أمر")
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("إضافة حساب جديد") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { SelectionField("نوع الحساب", roleLabel(role), roleOptions, onSelected = { role = it }) }
                item { OutlinedTextField(loginNumber, { loginNumber = it.filter(Char::isDigit) }, Modifier.fillMaxWidth(), label = { Text("رقم الحساب") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true) }
                item { OutlinedTextField(fullName, { fullName = it }, Modifier.fillMaxWidth(), label = { Text("الاسم الكامل") }) }
                item { OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("كلمة المرور") }, singleLine = true) }
                item { OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), label = { Text("البريد الإلكتروني") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), singleLine = true) }
                item { OutlinedTextField(mobile, { mobile = it }, Modifier.fillMaxWidth(), label = { Text("رقم الجوال") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), singleLine = true) }
                item { OutlinedTextField(address, { address = it }, Modifier.fillMaxWidth(), label = { Text("العنوان") }) }
                if (role == "STUDENT") {
                    item { OutlinedTextField(age, { age = it.filter(Char::isDigit) }, Modifier.fillMaxWidth(), label = { Text("العمر") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true) }
                    item { SelectionField("الحلقة", state.halaqahs.firstOrNull { it.id == halaqahId }?.name.orEmpty(), state.halaqahs.map { it.id to it.name }, onSelected = { halaqahId = it }) }
                    item { OutlinedTextField(memorized, { memorized = it }, Modifier.fillMaxWidth(), label = { Text("مقدار الحفظ") }) }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(building, { building = it }, Modifier.weight(1f), label = { Text("المبنى") })
                            OutlinedTextField(room, { room = it }, Modifier.weight(1f), label = { Text("الغرفة") })
                        }
                    }
                }
                if (role != "PARENT") {
                    item { OutlinedTextField(joinedAt, { joinedAt = it }, Modifier.fillMaxWidth(), label = { Text("تاريخ الانضمام YYYY-MM-DD") }, singleLine = true) }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = loginNumber.isNotBlank() && fullName.length >= 3 && password.length >= 8,
                onClick = {
                    onSubmit(
                        CreateUserRequest(
                            loginNumber = loginNumber,
                            fullName = fullName.trim(),
                            password = password,
                            role = role,
                            halaqahId = halaqahId.takeIf { role == "STUDENT" && it.isNotBlank() },
                            building = building.takeIf { role == "STUDENT" && it.isNotBlank() },
                            room = room.takeIf { role == "STUDENT" && it.isNotBlank() },
                            email = email.ifBlank { null },
                            mobile = mobile.ifBlank { null },
                            address = address.ifBlank { null },
                            age = age.toIntOrNull(),
                            joinedAt = joinedAt.takeIf { role != "PARENT" && it.isNotBlank() },
                            memorizedAmount = memorized.takeIf { role == "STUDENT" && it.isNotBlank() },
                        ),
                    )
                },
            ) { Text("إنشاء") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
private fun EditUserDialog(
    state: TahfizUiState,
    account: ManagedUserDto,
    onDismiss: () -> Unit,
    onSubmit: (UpdateUserRequest) -> Unit,
) {
    var fullName by remember { mutableStateOf(account.fullName) }
    var email by remember { mutableStateOf(account.email.orEmpty()) }
    var mobile by remember { mutableStateOf(account.mobile.orEmpty()) }
    var address by remember { mutableStateOf(account.address.orEmpty()) }
    var age by remember { mutableStateOf(account.age?.toString().orEmpty()) }
    var joinedAt by remember { mutableStateOf(account.joinedAt?.take(10).orEmpty()) }
    var active by remember { mutableStateOf(account.isActive) }
    var memorized by remember { mutableStateOf(account.studentProfile?.memorizedAmount.orEmpty()) }
    var halaqahId by remember { mutableStateOf(account.studentProfile?.halaqah?.id.orEmpty()) }
    var building by remember { mutableStateOf(account.studentProfile?.dormitory?.building.orEmpty()) }
    var room by remember { mutableStateOf(account.studentProfile?.dormitory?.room.orEmpty()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تعديل ${account.fullName}") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { OutlinedTextField(fullName, { fullName = it }, Modifier.fillMaxWidth(), label = { Text("الاسم") }) }
                item { OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), label = { Text("البريد الإلكتروني") }) }
                item { OutlinedTextField(mobile, { mobile = it }, Modifier.fillMaxWidth(), label = { Text("الجوال") }) }
                item { OutlinedTextField(address, { address = it }, Modifier.fillMaxWidth(), label = { Text("العنوان") }) }
                if (account.role != "PARENT") item { OutlinedTextField(joinedAt, { joinedAt = it }, Modifier.fillMaxWidth(), label = { Text("تاريخ الانضمام") }) }
                if (account.role == "STUDENT") {
                    item { OutlinedTextField(age, { age = it.filter(Char::isDigit) }, Modifier.fillMaxWidth(), label = { Text("العمر") }) }
                    item { SelectionField("الحلقة", state.halaqahs.firstOrNull { it.id == halaqahId }?.name.orEmpty(), state.halaqahs.map { it.id to it.name }, onSelected = { halaqahId = it }) }
                    item { OutlinedTextField(memorized, { memorized = it }, Modifier.fillMaxWidth(), label = { Text("مقدار الحفظ") }) }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(building, { building = it }, Modifier.weight(1f), label = { Text("المبنى") })
                            OutlinedTextField(room, { room = it }, Modifier.weight(1f), label = { Text("الغرفة") })
                        }
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("الحساب نشط", modifier = Modifier.padding(top = 8.dp))
                        Switch(checked = active, onCheckedChange = { active = it })
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSubmit(
                    UpdateUserRequest(
                        fullName = fullName.trim(),
                        isActive = active,
                        halaqahId = halaqahId.takeIf { account.role == "STUDENT" && it.isNotBlank() },
                        building = building.takeIf { account.role == "STUDENT" && it.isNotBlank() },
                        room = room.takeIf { account.role == "STUDENT" && it.isNotBlank() },
                        email = email.ifBlank { null },
                        mobile = mobile.ifBlank { null },
                        address = address.ifBlank { null },
                        age = age.toIntOrNull(),
                        joinedAt = joinedAt.ifBlank { null },
                        memorizedAmount = memorized.takeIf { account.role == "STUDENT" },
                    ),
                )
            }) { Text("حفظ") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
private fun ResetPasswordDialog(name: String, onDismiss: () -> Unit, onSubmit: (String) -> Unit) {
    var password by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("إعادة تعيين كلمة المرور") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(name)
                OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("كلمة المرور الجديدة") }, singleLine = true)
                Text("8 أحرف على الأقل.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            }
        },
        confirmButton = { TextButton(enabled = password.length >= 8, onClick = { onSubmit(password) }) { Text("تحديث") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
fun HalaqahsScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    var showCreate by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<HalaqahDto?>(null) }
    val isAdmin = state.user?.role == "ADMIN"

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("إدارة أكاديمية", "الحلقات", "تعيين المعلمين ومتابعة أعداد الطلاب في كل حلقة.") }
        if (isAdmin) item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("إضافة حلقة")
            }
        }
        items(state.halaqahs, key = { it.id }) { halaqah ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text(halaqah.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("المعلم: ${halaqah.teacher?.fullName ?: "غير معيّن"}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        }
                        StatusChip("${halaqah._count?.students ?: 0} طالب", null)
                    }
                    if (isAdmin) {
                        Row {
                            IconButton(onClick = { editing = halaqah }) { Icon(Icons.Outlined.Edit, contentDescription = "تعديل") }
                            IconButton(onClick = { viewModel.deleteHalaqah(halaqah.id) }) { Icon(Icons.Outlined.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
        }
        if (state.halaqahs.isEmpty()) item { EmptyState("لا توجد حلقات") }
    }

    if (showCreate) {
        HalaqahDialog(
            title = "إضافة حلقة",
            initialName = "",
            initialTeacher = "",
            teachers = state.teachers,
            onDismiss = { showCreate = false },
            onSubmit = { name, teacher ->
                viewModel.createHalaqah(CreateHalaqahRequest(name, teacher.ifBlank { null }))
                showCreate = false
            },
        )
    }
    editing?.let { item ->
        HalaqahDialog(
            title = "تعديل الحلقة",
            initialName = item.name,
            initialTeacher = item.teacher?.id.orEmpty(),
            teachers = state.teachers,
            onDismiss = { editing = null },
            onSubmit = { name, teacher ->
                viewModel.updateHalaqah(item.id, UpdateHalaqahRequest(name, teacher.ifBlank { null }))
                editing = null
            },
        )
    }
}

@Composable
private fun HalaqahDialog(
    title: String,
    initialName: String,
    initialTeacher: String,
    teachers: List<TeacherDto>,
    onDismiss: () -> Unit,
    onSubmit: (String, String) -> Unit,
) {
    var name by remember { mutableStateOf(initialName) }
    var teacherId by remember { mutableStateOf(initialTeacher) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text("اسم الحلقة") })
                SelectionField(
                    "المعلم",
                    teachers.firstOrNull { it.id == teacherId }?.fullName ?: "بدون معلم",
                    listOf("" to "بدون معلم") + teachers.map { it.id to it.fullName },
                    onSelected = { teacherId = it },
                )
            }
        },
        confirmButton = { TextButton(enabled = name.length >= 2, onClick = { onSubmit(name.trim(), teacherId) }) { Text("حفظ") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
fun ParentLinksScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    var showCreate by remember { mutableStateOf(false) }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("الأسرة والطالب", "ربط أولياء الأمور", "كل ولي أمر يرى فقط الطلاب المرتبطين بحسابه.") }
        item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("إضافة ربط")
            }
        }
        items(state.parentLinks, key = { it.id }) { link ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Row(Modifier.fillMaxWidth().padding(15.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(link.parent.fullName, fontWeight = FontWeight.Bold)
                        Text("الطالب: ${link.student.user.fullName}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(link.student.halaqah.name, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = { viewModel.deleteParentLink(link.id) }) {
                        Icon(Icons.Outlined.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
        if (state.parentLinks.isEmpty()) item { EmptyState("لا توجد روابط مسجلة") }
    }

    if (showCreate) {
        val parents = state.users.filter { it.role == "PARENT" && it.isActive }
        val students = state.users.filter { it.role == "STUDENT" && it.isActive }
        var parentId by remember { mutableStateOf(parents.firstOrNull()?.id.orEmpty()) }
        var studentUserId by remember { mutableStateOf(students.firstOrNull()?.id.orEmpty()) }
        AlertDialog(
            onDismissRequest = { showCreate = false },
            title = { Text("ربط ولي أمر بطالب") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SelectionField("ولي الأمر", parents.firstOrNull { it.id == parentId }?.fullName.orEmpty(), parents.map { it.id to it.fullName }, { parentId = it })
                    SelectionField("الطالب", students.firstOrNull { it.id == studentUserId }?.fullName.orEmpty(), students.map { it.id to it.fullName }, { studentUserId = it })
                }
            },
            confirmButton = {
                TextButton(
                    enabled = parentId.isNotBlank() && studentUserId.isNotBlank(),
                    onClick = { viewModel.createParentLink(ParentLinkRequest(parentId, studentUserId)); showCreate = false },
                ) { Text("ربط") }
            },
            dismissButton = { TextButton(onClick = { showCreate = false }) { Text("إلغاء") } },
        )
    }
}

@Composable
fun PeriodsScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val canEdit = state.user?.role == "ADMIN"
    var showCreate by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<PeriodDto?>(null) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("الجدول اليومي", "الفترات", if (canEdit) "تنظيم الفترات وأوقاتها." else "عرض الفترات المعتمدة في المركز.") }
        if (canEdit) item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("إضافة فترة")
            }
        }
        items(state.periods, key = { it.id }) { period ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(17.dp)) {
                Row(Modifier.fillMaxWidth().padding(15.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) {
                        Text("${period.number}. ${period.name}", fontWeight = FontWeight.Bold)
                        Text("${period.startTime} — ${period.endTime}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    }
                    if (canEdit) {
                        Row {
                            IconButton(onClick = { editing = period }) { Icon(Icons.Outlined.Edit, contentDescription = "تعديل") }
                            IconButton(onClick = { viewModel.deletePeriod(period.id) }) { Icon(Icons.Outlined.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
        }
        if (state.periods.isEmpty()) item { EmptyState("لا توجد فترات") }
    }

    if (showCreate) {
        PeriodDialog(null, { showCreate = false }) {
            viewModel.createPeriod(it)
            showCreate = false
        }
    }
    editing?.let { period ->
        PeriodDialog(period, { editing = null }) {
            viewModel.updatePeriod(period.id, it)
            editing = null
        }
    }
}

@Composable
private fun PeriodDialog(initial: PeriodDto?, onDismiss: () -> Unit, onSubmit: (PeriodRequest) -> Unit) {
    var number by remember { mutableStateOf(initial?.number?.toString().orEmpty()) }
    var name by remember { mutableStateOf(initial?.name.orEmpty()) }
    var start by remember { mutableStateOf(initial?.startTime ?: "08:00") }
    var end by remember { mutableStateOf(initial?.endTime ?: "09:00") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "إضافة فترة" else "تعديل الفترة") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(number, { number = it.filter(Char::isDigit) }, Modifier.fillMaxWidth(), label = { Text("رقم الفترة") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text("الاسم") })
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(start, { start = it }, Modifier.weight(1f), label = { Text("البداية HH:MM") })
                    OutlinedTextField(end, { end = it }, Modifier.weight(1f), label = { Text("النهاية HH:MM") })
                }
            }
        },
        confirmButton = {
            TextButton(enabled = number.toIntOrNull() != null && name.length >= 2, onClick = {
                onSubmit(PeriodRequest(number.toInt(), name.trim(), start.trim(), end.trim()))
            }) { Text("حفظ") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
fun StudentsScreen(state: TahfizUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("الحلقات المسندة", "طلابي", "يعرض التطبيق فقط الطلاب المسموح للمعلم بالوصول إليهم.") }
        items(state.students, key = { it.id }) { student ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(student.user.fullName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(student.halaqah.name, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp)
                    student.dormitory?.let { Text("مبنى ${it.building} • غرفة ${it.room}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                    student.memorizedAmount?.let { Text("مقدار الحفظ: $it", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                }
            }
        }
        if (state.students.isEmpty()) item { EmptyState("لا يوجد طلاب في حلقاتك") }
    }
}

@Composable
fun ChildrenScreen(state: TahfizUiState) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("الحسابات المرتبطة", "الأبناء", "يمكن لولي الأمر متابعة الطلاب المرتبطين بحسابه فقط.") }
        items(state.children, key = { it.id }) { child ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(child.user.fullName, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    Text(child.halaqah.name, color = MaterialTheme.colorScheme.primary)
                    Text("المعلم: ${child.halaqah.teacher?.fullName ?: "غير معيّن"}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        }
        if (state.children.isEmpty()) item { EmptyState("لا يوجد طالب مرتبط بحسابك") }
    }
}
