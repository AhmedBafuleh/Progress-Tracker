package com.tahfiz.progresstracker

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.DoneAll
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
fun ProgressRecorderScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    var studentId by remember(state.students) { mutableStateOf(state.students.firstOrNull()?.id.orEmpty()) }
    var periodId by remember(state.periods) { mutableStateOf(state.periods.firstOrNull()?.id.orEmpty()) }
    var attended by remember { mutableStateOf(true) }
    var recordType by remember { mutableStateOf("HIFZ") }
    var surah by remember { mutableStateOf("الفاتحة") }
    var verseFrom by remember { mutableStateOf("1") }
    var endSurah by remember { mutableStateOf("الفاتحة") }
    var verseTo by remember { mutableStateOf("1") }
    var matnName by remember { mutableStateOf("") }
    var matnFrom by remember { mutableStateOf("") }
    var matnTo by remember { mutableStateOf("") }
    var pages by remember { mutableStateOf("1") }
    var rating by remember { mutableStateOf("5") }
    var date by remember { mutableStateOf(todayIso()) }
    var note by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(13.dp),
    ) {
        item {
            ScreenHeader(
                "المتابعة اليومية",
                "تسجيل متابعة الطالب",
                "حفظ، مراجعة قريبة، مراجعة بعيدة، متن، أو غياب.",
            )
        }

        item {
            SelectionField(
                "الطالب",
                state.students.firstOrNull { it.id == studentId }?.user?.fullName.orEmpty(),
                state.students.map { it.id to "${it.user.fullName} — ${it.halaqah.name}" },
                { studentId = it },
            )
        }
        item {
            SelectionField(
                "الفترة",
                state.periods.firstOrNull { it.id == periodId }?.name.orEmpty(),
                state.periods.map { it.id to "${it.name} (${it.startTime})" },
                { periodId = it },
            )
        }
        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Row(
                    Modifier.fillMaxWidth().padding(15.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column {
                        Text("الحضور", fontWeight = FontWeight.Bold)
                        Text(if (attended) "الطالب حاضر" else "الطالب غائب", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    }
                    Switch(checked = attended, onCheckedChange = { attended = it })
                }
            }
        }

        if (attended) {
            item {
                SelectionField(
                    "نوع المتابعة",
                    recordTypeLabel(recordType),
                    listOf(
                        "HIFZ" to "حفظ",
                        "NEAR_REVIEW" to "مراجعة قريب",
                        "FAR_REVIEW" to "مراجعة بعيد",
                        "MATN" to "متن",
                    ),
                    { recordType = it },
                )
            }

            if (recordType == "MATN") {
                item { OutlinedTextField(matnName, { matnName = it }, Modifier.fillMaxWidth(), label = { Text("اسم المتن") }) }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(matnFrom, { matnFrom = it }, Modifier.weight(1f), label = { Text("من") })
                        OutlinedTextField(matnTo, { matnTo = it }, Modifier.weight(1f), label = { Text("إلى") })
                    }
                }
            } else {
                item {
                    val maxAyah = ayahCountForSurah(surah)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SelectionField(
                            "السورة",
                            surah,
                            quranSurahOptions(),
                            {
                                surah = it
                                val max = ayahCountForSurah(it)
                                verseFrom = (verseFrom.toIntOrNull() ?: 1).coerceIn(1, max).toString()
                            },
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            verseFrom,
                            { value ->
                                val digits = value.filter(Char::isDigit)
                                verseFrom = if (digits.isBlank()) "" else (digits.toIntOrNull() ?: 1).coerceIn(1, maxAyah).toString()
                            },
                            Modifier.weight(1f),
                            label = { Text("من آية (1-$maxAyah)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        )
                    }
                }
                item {
                    val maxAyah = ayahCountForSurah(endSurah)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SelectionField(
                            "السورة إلى",
                            endSurah,
                            quranSurahOptions(),
                            {
                                endSurah = it
                                val max = ayahCountForSurah(it)
                                verseTo = (verseTo.toIntOrNull() ?: 1).coerceIn(1, max).toString()
                            },
                            modifier = Modifier.weight(1f),
                        )
                        OutlinedTextField(
                            verseTo,
                            { value ->
                                val digits = value.filter(Char::isDigit)
                                verseTo = if (digits.isBlank()) "" else (digits.toIntOrNull() ?: 1).coerceIn(1, maxAyah).toString()
                            },
                            Modifier.weight(1f),
                            label = { Text("إلى آية (1-$maxAyah)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        )
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(pages, { pages = it }, Modifier.weight(1f), label = { Text("الصفحات") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                    OutlinedTextField(rating, { rating = it.filter(Char::isDigit).take(1) }, Modifier.weight(1f), label = { Text("التقييم /5") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                }
            }
        }

        item { OutlinedTextField(date, { date = it }, Modifier.fillMaxWidth(), label = { Text("التاريخ YYYY-MM-DD") }, singleLine = true) }
        item { OutlinedTextField(note, { note = it }, Modifier.fillMaxWidth(), label = { Text("ملاحظة") }, minLines = 2) }
        item {
            Button(
                onClick = {
                    viewModel.createProgress(
                        CreateProgressRequest(
                            studentId = studentId,
                            periodId = periodId,
                            attended = attended,
                            recordType = recordType.takeIf { attended },
                            surah = surah.trim().takeIf { attended && recordType != "MATN" && it.isNotBlank() },
                            verseFrom = verseFrom.toIntOrNull().takeIf { attended && recordType != "MATN" },
                            endSurah = endSurah.trim().takeIf { attended && recordType != "MATN" && it.isNotBlank() },
                            verseTo = verseTo.toIntOrNull().takeIf { attended && recordType != "MATN" },
                            matnName = matnName.trim().takeIf { attended && recordType == "MATN" && it.isNotBlank() },
                            matnFrom = matnFrom.trim().takeIf { attended && recordType == "MATN" && it.isNotBlank() },
                            matnTo = matnTo.trim().takeIf { attended && recordType == "MATN" && it.isNotBlank() },
                            pages = if (attended) pages.toDoubleOrNull() ?: 0.0 else 0.0,
                            rating = if (attended) rating.toIntOrNull()?.coerceIn(1, 5) else null,
                            recordDate = date,
                            note = note.ifBlank { null },
                        ),
                    )
                },
                enabled = studentId.isNotBlank() && periodId.isNotBlank() &&
                    (!attended || (recordType == "MATN" && matnName.isNotBlank()) || (recordType != "MATN" && surah.isNotBlank())),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
            ) {
                Icon(Icons.Outlined.Check, contentDescription = null)
                Text("حفظ المتابعة")
            }
        }
    }

    if (state.students.isEmpty()) {
        // The form naturally disables when the server returns no authorized students.
    }
}

@Composable
fun ProgressHistoryScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val canDelete = state.user?.role == "ADMIN" || state.user?.role == "TEACHER"
    var studentFilter by remember { mutableStateOf("") }

    val options = when (state.user?.role) {
        "PARENT" -> state.children.map { it.id to it.user.fullName }
        "TEACHER", "ADMIN", "MANAGER" -> state.students.map { it.id to it.user.fullName }
        else -> emptyList()
    }
    val filtered = if (studentFilter.isBlank()) state.progress else state.progress.filter { it.student.id == studentFilter }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("السجل الأكاديمي", "سجل المتابعة", "عرض الحفظ والمراجعة والمتن والغياب المسجل في النظام.") }
        if (options.size > 1) {
            item {
                SelectionField(
                    "تصفية الطالب",
                    options.firstOrNull { it.first == studentFilter }?.second ?: "جميع الطلاب",
                    listOf("" to "جميع الطلاب") + options,
                    { studentFilter = it },
                )
            }
        }

        items(filtered, key = { it.id }) { entry ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(entry.student.user.fullName, fontWeight = FontWeight.Bold)
                            Text(formatDate(entry.recordDate), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                        StatusChip(if (entry.attended) recordTypeLabel(entry.recordType) else "غياب", entry.attended)
                    }
                    if (entry.attended) {
                        val detail = if (entry.recordType == "MATN") {
                            listOfNotNull(entry.matnName, entry.matnFrom?.let { "من $it" }, entry.matnTo?.let { "إلى $it" }).joinToString(" • ")
                        } else {
                            "${entry.surah ?: "—"} ${entry.verseFrom ?: ""} ← ${entry.endSurah ?: entry.surah ?: ""} ${entry.verseTo ?: ""}"
                        }
                        Text(detail)
                        Text(
                            "${String.format(Locale.ENGLISH, "%.1f", entry.pages)} صفحة • ${entry.rating?.let { "$it/5" } ?: "—"} • ${entry.period.name}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 12.sp,
                        )
                    }
                    entry.note?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                    if (canDelete) {
                        OutlinedButton(onClick = { viewModel.deleteProgress(entry.id) }) {
                            Icon(Icons.Outlined.Delete, contentDescription = null)
                            Text("حذف السجل")
                        }
                    }
                }
            }
        }
        if (filtered.isEmpty()) item { EmptyState("لا توجد سجلات متابعة") }
    }
}

@Composable
fun MonthlyTestsScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    var showCreate by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("التقييم الدوري", "الاختبارات الشهرية", "إنشاء اختبارات حفظ أو مراجعة أو متن مع احتساب الدرجة تلقائيًا.") }
        item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("إضافة اختبار")
            }
        }
        items(state.tests, key = { it.id }) { test ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(test.student.user.fullName, fontWeight = FontWeight.Bold)
                        StatusChip("${test.score}/100", test.score >= 70)
                    }
                    Text(
                        when (test.type) {
                            "HIFZ" -> "حفظ"
                            "REVIEW" -> "مراجعة"
                            else -> "متن ${test.matnName ?: ""}"
                        },
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text("${formatDate(test.testDate)} • ${test.questions.size} سؤال", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    test.note?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                }
            }
        }
        if (state.tests.isEmpty()) item { EmptyState("لا توجد اختبارات مسجلة") }
    }

    if (showCreate) {
        MonthlyTestDialog(
            state = state,
            onDismiss = { showCreate = false },
            onSubmit = {
                viewModel.createMonthlyTest(it)
                showCreate = false
            },
        )
    }
}

private data class QuestionDraft(
    val correct: Boolean = true,
    val surah: String = "الفاتحة",
    val ayah: String = "1",
    val ayahTo: String = "1",
    val reference: String = "",
)

@Composable
private fun MonthlyTestDialog(
    state: TahfizUiState,
    onDismiss: () -> Unit,
    onSubmit: (CreateMonthlyTestRequest) -> Unit,
) {
    val testStudents = state.monthlyTestStudents
    val testHalaqahs = testStudents.map { it.halaqah }.distinctBy { it.id }
    var halaqahId by remember(testStudents) { mutableStateOf(testHalaqahs.firstOrNull()?.id.orEmpty()) }
    var studentId by remember(testStudents) { mutableStateOf(testStudents.firstOrNull { it.halaqah.id == halaqahId }?.id.orEmpty()) }
    val filteredStudents = testStudents.filter { it.halaqah.id == halaqahId }
    val selectedStudent = testStudents.firstOrNull { it.id == studentId }
    var type by remember { mutableStateOf("HIFZ") }
    var matnName by remember { mutableStateOf("") }
    var testDate by remember { mutableStateOf(todayIso()) }
    var note by remember { mutableStateOf("") }
    var questions by remember { mutableStateOf(listOf(QuestionDraft())) }

    val score = if (questions.isEmpty()) 0 else Math.round(questions.count { it.correct } * 100.0 / questions.size).toInt()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("اختبار شهري جديد") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    SelectionField(
                        "الحلقة",
                        testHalaqahs.firstOrNull { it.id == halaqahId }?.name.orEmpty(),
                        testHalaqahs.map { it.id to it.name },
                        { selectedHalaqahId ->
                            halaqahId = selectedHalaqahId
                            studentId = testStudents.firstOrNull { it.halaqah.id == selectedHalaqahId }?.id.orEmpty()
                        },
                    )
                }
                item {
                    SelectionField(
                        "الطالب",
                        selectedStudent?.user?.fullName.orEmpty(),
                        filteredStudents.map { it.id to it.user.fullName },
                        { studentId = it },
                    )
                }
                item {
                    SelectionField(
                        "نوع الاختبار",
                        when (type) { "HIFZ" -> "حفظ"; "REVIEW" -> "مراجعة"; else -> "متن" },
                        listOf("HIFZ" to "حفظ", "REVIEW" to "مراجعة", "MATN" to "متن"),
                        { type = it },
                    )
                }
                if (type == "MATN") item { OutlinedTextField(matnName, { matnName = it }, Modifier.fillMaxWidth(), label = { Text("اسم المتن") }) }
                item { OutlinedTextField(testDate, { testDate = it }, Modifier.fillMaxWidth(), label = { Text("التاريخ YYYY-MM-DD") }) }

                items(questions.size) { index ->
                    val q = questions[index]
                    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                            Text("السؤال ${index + 1}", fontWeight = FontWeight.Bold)
                            if (type == "MATN") {
                                OutlinedTextField(
                                    q.reference,
                                    { value -> questions = questions.toMutableList().also { it[index] = q.copy(reference = value) } },
                                    Modifier.fillMaxWidth(),
                                    label = { Text("المرجع أو المقطع") },
                                )
                                SelectionField(
                                    "الإجابة",
                                    if (q.correct) "صحيح" else "خطأ",
                                    listOf("TRUE" to "صحيح", "FALSE" to "خطأ"),
                                    { value -> questions = questions.toMutableList().also { it[index] = q.copy(correct = value == "TRUE") } },
                                )
                            } else {
                                val maxAyah = ayahCountForSurah(q.surah)
                                SelectionField(
                                    "السورة",
                                    q.surah,
                                    quranSurahOptions(),
                                    { value ->
                                        val max = ayahCountForSurah(value)
                                        questions = questions.toMutableList().also {
                                            it[index] = q.copy(
                                                surah = value,
                                                ayah = (q.ayah.toIntOrNull() ?: 1).coerceIn(1, max).toString(),
                                                ayahTo = (q.ayahTo.toIntOrNull() ?: 1).coerceIn(1, max).toString(),
                                            )
                                        }
                                    },
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(
                                        q.ayah,
                                        { value ->
                                            val digits = value.filter(Char::isDigit)
                                            val fromValue = if (digits.isBlank()) "" else (digits.toIntOrNull() ?: 1).coerceIn(1, maxAyah).toString()
                                            val fromInt = fromValue.toIntOrNull() ?: 1
                                            val toValue = (q.ayahTo.toIntOrNull() ?: fromInt).coerceIn(fromInt, maxAyah).toString()
                                            questions = questions.toMutableList().also { it[index] = q.copy(ayah = fromValue, ayahTo = toValue) }
                                        },
                                        Modifier.weight(1f),
                                        label = { Text("من آية (1-$maxAyah)") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    )
                                    OutlinedTextField(
                                        q.ayahTo,
                                        { value ->
                                            val digits = value.filter(Char::isDigit)
                                            val minimum = q.ayah.toIntOrNull() ?: 1
                                            val toValue = if (digits.isBlank()) "" else (digits.toIntOrNull() ?: minimum).coerceIn(minimum, maxAyah).toString()
                                            questions = questions.toMutableList().also { it[index] = q.copy(ayahTo = toValue) }
                                        },
                                        Modifier.weight(1f),
                                        label = { Text("إلى آية") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    )
                                }
                                SelectionField(
                                    "الإجابة",
                                    if (q.correct) "صحيح" else "خطأ",
                                    listOf("TRUE" to "صحيح", "FALSE" to "خطأ"),
                                    { value -> questions = questions.toMutableList().also { it[index] = q.copy(correct = value == "TRUE") } },
                                )
                            }
                        }
                    }
                }
                item {
                    OutlinedButton(onClick = { questions = questions + QuestionDraft() }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Outlined.Add, contentDescription = null)
                        Text("إضافة سؤال")
                    }
                }
                if (questions.size > 1) item {
                    TextButton(onClick = { questions = questions.dropLast(1) }) { Text("حذف آخر سؤال") }
                }
                item { OutlinedTextField(note, { note = it }, Modifier.fillMaxWidth(), label = { Text("ملاحظة عامة") }, minLines = 2) }
            }
        },
        confirmButton = {
            TextButton(
                enabled = studentId.isNotBlank() && selectedStudent != null &&
                    questions.isNotEmpty() &&
                    (if (type == "MATN") {
                        matnName.isNotBlank() && questions.all { it.reference.isNotBlank() }
                    } else {
                        questions.all {
                            val max = ayahCountForSurah(it.surah)
                            val fromValue = it.ayah.toIntOrNull()
                            val toValue = it.ayahTo.toIntOrNull()
                            max > 0 && fromValue != null && toValue != null && fromValue in 1..max && toValue in fromValue..max
                        }
                    }),
                onClick = {
                    val student = selectedStudent ?: return@TextButton
                    onSubmit(
                        CreateMonthlyTestRequest(
                            halaqahId = student.halaqah.id,
                            studentId = student.id,
                            type = type,
                            matnName = matnName.ifBlank { null },
                            score = score,
                            testDate = testDate,
                            note = note.ifBlank { null },
                            questions = questions.mapIndexed { index, q ->
                                MonthlyTestQuestionDto(
                                    questionNumber = index + 1,
                                    correct = q.correct,
                                    surah = q.surah.ifBlank { null },
                                    ayah = q.ayah.toIntOrNull(),
                                    ayahTo = q.ayahTo.toIntOrNull(),
                                    referenceText = q.reference.ifBlank { null },
                                )
                            },
                        ),
                    )
                },
            ) { Text("حفظ الاختبار — $score/100") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
fun NotesScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    var showCreate by remember { mutableStateOf(false) }
    val role = state.user?.role.orEmpty()

    val candidateOptions: List<Pair<String, String>> = when (role) {
        "ADMIN" -> state.users
            .filter { it.role == "MANAGER" || it.role == "TEACHER" }
            .map { it.id to it.fullName }
        "TEACHER" -> state.students.map { it.user.id to it.user.fullName }
        else -> state.users
            .filter { it.role == "STUDENT" }
            .map { it.id to it.fullName }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("السجل الإداري", if (role == "ADMIN") "ملاحظات الموظفين" else "ملاحظات الطلاب", "الملاحظات والمخالفات وفق صلاحية الحساب.") }
        item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("إضافة ملاحظة")
            }
        }
        items(state.notes, key = { it.id }) { note ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(note.subject.fullName, fontWeight = FontWeight.Bold)
                        StatusChip(statusLabel(note.kind), if (note.kind == "VIOLATION") false else null)
                    }
                    Text(note.content, lineHeight = 21.sp)
                    Text("بواسطة ${note.author.fullName} • ${formatDate(note.createdAt)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                }
            }
        }
        if (state.notes.isEmpty()) item { EmptyState("لا توجد ملاحظات") }
    }

    if (showCreate) {
        var subjectId by remember { mutableStateOf(candidateOptions.firstOrNull()?.first.orEmpty()) }
        var kind by remember { mutableStateOf("NOTE") }
        var content by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showCreate = false },
            title = { Text("إضافة ملاحظة") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SelectionField("الشخص", candidateOptions.firstOrNull { it.first == subjectId }?.second.orEmpty(), candidateOptions, { subjectId = it })
                    SelectionField("النوع", statusLabel(kind), listOf("NOTE" to "ملاحظة", "VIOLATION" to "مخالفة"), { kind = it })
                    OutlinedTextField(content, { content = it }, Modifier.fillMaxWidth(), label = { Text("التفاصيل") }, minLines = 4)
                }
            },
            confirmButton = {
                TextButton(
                    enabled = subjectId.isNotBlank() && content.trim().length >= 3,
                    onClick = {
                        viewModel.createNote(CreateNoteRequest(subjectId, kind, content.trim()))
                        showCreate = false
                    },
                ) { Text("حفظ") }
            },
            dismissButton = { TextButton(onClick = { showCreate = false }) { Text("إلغاء") } },
        )
    }
}

@Composable
fun LeavesScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val isAdmin = state.user?.role == "ADMIN"
    var showCreate by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("الإجازات", if (isAdmin) "طلبات الإجازة" else "إجازاتي", if (isAdmin) "مراجعة طلبات جميع المستخدمين." else "إرسال ومتابعة طلباتك.") }
        item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("طلب جديد")
            }
        }
        items(state.leaves, key = { it.id }) { leave ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text(leave.requester.fullName, fontWeight = FontWeight.Bold)
                            Text(statusLabel(leave.type), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        }
                        StatusChip(
                            statusLabel(leave.status),
                            when (leave.status) { "APPROVED" -> true; "REJECTED" -> false; else -> null },
                        )
                    }
                    Text(if (leave.type == "DAY_OFF") formatDate(leave.fromDate) else "${formatDate(leave.fromDate)} — ${formatDate(leave.toDate ?: leave.fromDate)}")
                    leave.reason?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                    leave.reviewNote?.let { Text("ملاحظة الإدارة: $it", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                    if (isAdmin && leave.status == "PENDING") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { viewModel.reviewLeave(leave.id, LeaveReviewRequest("APPROVED")) }, modifier = Modifier.weight(1f)) { Text("موافقة") }
                            OutlinedButton(onClick = { viewModel.reviewLeave(leave.id, LeaveReviewRequest("REJECTED")) }, modifier = Modifier.weight(1f)) { Text("رفض") }
                        }
                    }
                }
            }
        }
        if (state.leaves.isEmpty()) item { EmptyState("لا توجد طلبات") }
    }

    if (showCreate) {
        var type by remember { mutableStateOf("DAY_OFF") }
        var from by remember { mutableStateOf(todayIso()) }
        var to by remember { mutableStateOf(tomorrowIso()) }
        var reason by remember { mutableStateOf("") }

        val fromValid = isDateOnOrAfter(from, todayIso())
        val toValid = type == "DAY_OFF" || (isDateOnOrAfter(to, tomorrowIso(from)) && to != from)
        val reasonValid = reason.trim().length >= 3

        AlertDialog(
            onDismissRequest = { showCreate = false },
            title = { Text("طلب إجازة") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SelectionField(
                        "النوع",
                        statusLabel(type),
                        listOf("DAY_OFF" to "يوم إجازة", "VACATION" to "إجازة"),
                        { selected ->
                            type = selected
                            to = if (selected == "VACATION") tomorrowIso(from) else from
                        },
                    )
                    OutlinedTextField(
                        from,
                        { value ->
                            from = value
                            if (type == "DAY_OFF") {
                                to = value
                            } else if (value.length == 10 && (!isDateOnOrAfter(to, tomorrowIso(value)) || to == value)) {
                                to = tomorrowIso(value)
                            }
                        },
                        Modifier.fillMaxWidth(),
                        label = { Text(if (type == "DAY_OFF") "التاريخ YYYY-MM-DD" else "من YYYY-MM-DD") },
                        supportingText = { Text("اليوم أو تاريخ لاحق فقط") },
                    )
                    if (type == "VACATION") {
                        OutlinedTextField(
                            to,
                            { to = it },
                            Modifier.fillMaxWidth(),
                            label = { Text("إلى YYYY-MM-DD") },
                            supportingText = { Text("اليوم التالي على الأقل: ${tomorrowIso(from)}") },
                        )
                    }
                    OutlinedTextField(
                        reason,
                        { reason = it },
                        Modifier.fillMaxWidth(),
                        label = { Text("السبب *") },
                        supportingText = { Text("السبب مطلوب") },
                        minLines = 3,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = fromValid && toValid && reasonValid,
                    onClick = {
                        viewModel.createLeave(
                            CreateLeaveRequest(
                                type = type,
                                fromDate = from,
                                toDate = if (type == "DAY_OFF") from else to,
                                reason = reason.trim(),
                            ),
                        )
                        showCreate = false
                    },
                ) { Text("إرسال") }
            },
            dismissButton = { TextButton(onClick = { showCreate = false }) { Text("إلغاء") } },
        )
    }
}

@Composable
fun NotificationsScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val role = state.user?.role.orEmpty()
    val canSend = role == "ADMIN" || role == "MANAGER"
    var showCreate by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenHeader(
                "التواصل",
                if (canSend) "إشعارات الطلاب" else "الإشعارات",
                if (canSend) "إرسال مهام وأنشطة وتذكيرات للطلاب." else "إشعاراتك من الإدارة.",
            )
        }
        if (canSend) item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Send, contentDescription = null)
                Text("إرسال إشعار")
            }
        }
        if (role == "STUDENT" && state.unreadCount > 0) item {
            OutlinedButton(onClick = viewModel::markAllNotificationsRead, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.DoneAll, contentDescription = null)
                Text("تعليم الكل كمقروء")
            }
        }

        items(state.notifications, key = { it.id }) { notification ->
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
            ) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(notification.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        StatusChip(statusLabel(notification.type), null)
                    }
                    Text(notification.message, lineHeight = 21.sp)
                    Text(
                        if (canSend) "إلى: ${notification.recipient?.fullName ?: "—"}" else "من: ${notification.sender?.fullName ?: "الإدارة"}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 11.sp,
                    )
                    notification.eventAt?.let { Text("موعد: ${formatDate(it)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp) }
                    if (role == "STUDENT" && !notification.isRead) {
                        TextButton(onClick = { viewModel.markNotificationRead(notification.id) }) { Text("تعليم كمقروء") }
                    }
                }
            }
        }
        if (state.notifications.isEmpty()) item { EmptyState("لا توجد إشعارات") }
    }

    if (showCreate) {
        val students = state.students.filter { it.user.isActive }
        val halaqahs = students
            .map { it.halaqah }
            .distinctBy { it.id }
            .sortedBy { it.name }

        var targetType by remember { mutableStateOf("STUDENT") }
        var halaqahId by remember { mutableStateOf(halaqahs.firstOrNull()?.id.orEmpty()) }
        var recipientUserId by remember { mutableStateOf(students.firstOrNull()?.user?.id.orEmpty()) }
        var type by remember { mutableStateOf("TASK") }
        var title by remember { mutableStateOf("") }
        var message by remember { mutableStateOf("") }
        var eventAt by remember { mutableStateOf("") }

        val selectedHalaqah = halaqahs.firstOrNull { it.id == halaqahId }
        val selectedStudent = students.firstOrNull { it.user.id == recipientUserId }
        val recipientCount = when (targetType) {
            "ALL" -> students.size
            "HALAQAH" -> students.count { it.halaqah.id == halaqahId }
            else -> if (selectedStudent != null) 1 else 0
        }

        AlertDialog(
            onDismissRequest = { showCreate = false },
            title = { Text("إرسال إشعار") },
            text = {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    item {
                        SelectionField(
                            "الإرسال إلى",
                            when (targetType) {
                                "ALL" -> "جميع الطلاب"
                                "HALAQAH" -> "حلقة محددة"
                                else -> "طالب محدد"
                            },
                            listOf(
                                "ALL" to "جميع الطلاب",
                                "HALAQAH" to "حلقة محددة",
                                "STUDENT" to "طالب محدد",
                            ),
                            { targetType = it },
                        )
                    }

                    if (targetType == "HALAQAH") {
                        item {
                            SelectionField(
                                "الحلقة",
                                selectedHalaqah?.name.orEmpty(),
                                halaqahs.map { it.id to it.name },
                                { halaqahId = it },
                            )
                        }
                    }

                    if (targetType == "STUDENT") {
                        item {
                            SelectionField(
                                "الطالب",
                                selectedStudent?.let { "${it.user.fullName} — ${it.halaqah.name}" }.orEmpty(),
                                students.map { it.user.id to "${it.user.fullName} — ${it.halaqah.name}" },
                                { recipientUserId = it },
                            )
                        }
                    }

                    item {
                        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text("المستلمون", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                Text(
                                    "$recipientCount ${if (recipientCount == 1) "طالب" else "طلاب"}",
                                    fontWeight = FontWeight.Bold,
                                )
                                if (targetType == "HALAQAH" && selectedHalaqah != null) {
                                    Text(selectedHalaqah.name, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp)
                                }
                                if (targetType == "STUDENT" && selectedStudent != null) {
                                    Text(selectedStudent.user.fullName, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    item { SelectionField("النوع", statusLabel(type), listOf("TASK" to "مهمة", "ACTIVITY" to "نشاط", "REMINDER" to "تذكير"), { type = it }) }
                    item { OutlinedTextField(title, { title = it }, Modifier.fillMaxWidth(), label = { Text("العنوان") }) }
                    item { OutlinedTextField(message, { message = it }, Modifier.fillMaxWidth(), label = { Text("التفاصيل") }, minLines = 3) }
                    item { OutlinedTextField(eventAt, { eventAt = it }, Modifier.fillMaxWidth(), label = { Text("موعد اختياري ISO") }, placeholder = { Text("2026-09-30T18:00:00") }) }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = recipientCount > 0 && title.length >= 2 && message.length >= 3,
                    onClick = {
                        val normalizedEvent = eventAt.trim().let { value ->
                            when {
                                value.isBlank() -> null
                                value.endsWith("Z") -> value
                                value.length == 16 -> "${value}:00Z"
                                value.length == 19 -> "${value}Z"
                                else -> value
                            }
                        }
                        viewModel.createNotification(
                            CreateNotificationRequest(
                                targetType = targetType,
                                recipientUserId = recipientUserId.takeIf { targetType == "STUDENT" },
                                halaqahId = halaqahId.takeIf { targetType == "HALAQAH" },
                                title = title.trim(),
                                message = message.trim(),
                                type = type,
                                eventAt = normalizedEvent,
                            ),
                        )
                        showCreate = false
                    },
                ) { Text("إرسال") }
            },
            dismissButton = { TextButton(onClick = { showCreate = false }) { Text("إلغاء") } },
        )
    }
}
