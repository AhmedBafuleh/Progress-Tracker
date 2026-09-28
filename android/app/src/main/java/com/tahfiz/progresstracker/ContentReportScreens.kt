package com.tahfiz.progresstracker

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.OpenableColumns
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.AttachFile
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.UploadFile
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tahfiz.progresstracker.data.*
import java.util.Locale

private data class PickedFile(val bytes: ByteArray, val mimeType: String, val fileName: String)

private fun readPickedFile(context: Context, uri: Uri): PickedFile? {
    val resolver = context.contentResolver
    val mime = resolver.getType(uri) ?: "application/octet-stream"
    var name = "file"
    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index >= 0 && cursor.moveToFirst()) name = cursor.getString(index)
    }
    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    return PickedFile(bytes, mime, name)
}

private fun resolveServerUrl(url: String): String {
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    val base = ApiClient.baseUrl().substringBefore("/api/")
    return base.trimEnd('/') + if (url.startsWith("/")) url else "/$url"
}

private fun openUrl(context: Context, url: String) {
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(resolveServerUrl(url))))
    }
}

@Composable
fun LibraryScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val context = LocalContext.current
    val canEdit = state.user?.role == "ADMIN" || state.user?.role == "MANAGER"
    var showCreateUrl by remember { mutableStateOf(false) }
    var pendingFile by remember { mutableStateOf<PickedFile?>(null) }
    var editItem by remember { mutableStateOf<LibraryItemDto?>(null) }

    val filePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri != null) pendingFile = readPickedFile(context, uri)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenHeader(
                "المصادر التعليمية",
                "المكتبة",
                if (canEdit) "إضافة الروابط أو رفع الملفات مباشرة من الهاتف." else "مراجع ومواد المركز المنشورة.",
            )
        }

        if (canEdit) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { showCreateUrl = true }, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Outlined.Add, contentDescription = null)
                        Text("رابط")
                    }
                    OutlinedButton(
                        onClick = { filePicker.launch(arrayOf("application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/*")) },
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Outlined.UploadFile, contentDescription = null)
                        Text("رفع ملف")
                    }
                }
            }
        }

        items(state.library, key = { it.id }) { item ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(item.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text(item.type, color = MaterialTheme.colorScheme.primary, fontSize = 11.sp)
                        }
                        if (!item.published) StatusChip("غير منشور", null)
                    }
                    item.description?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 20.sp) }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedButton(onClick = { openUrl(context, item.url) }) {
                            Icon(Icons.Outlined.OpenInNew, contentDescription = null)
                            Text("فتح")
                        }
                        if (canEdit) {
                            IconButton(onClick = { editItem = item }) { Icon(Icons.Outlined.Edit, contentDescription = "تعديل") }
                            IconButton(onClick = { viewModel.deleteLibraryItem(item.id) }) { Icon(Icons.Outlined.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
        }
        if (state.library.isEmpty()) item { EmptyState("لا توجد مواد في المكتبة") }
    }

    if (showCreateUrl) {
        LibraryItemDialog(
            initial = null,
            onDismiss = { showCreateUrl = false },
            onSubmit = {
                viewModel.createLibraryItem(it)
                showCreateUrl = false
            },
        )
    }

    editItem?.let { item ->
        LibraryItemDialog(
            initial = item,
            onDismiss = { editItem = null },
            onSubmit = {
                viewModel.updateLibraryItem(item.id, it)
                editItem = null
            },
        )
    }

    pendingFile?.let { file ->
        var title by remember(file) { mutableStateOf(file.fileName.substringBeforeLast('.')) }
        var description by remember(file) { mutableStateOf("") }
        var published by remember(file) { mutableStateOf(true) }
        AlertDialog(
            onDismissRequest = { pendingFile = null },
            title = { Text("إضافة الملف إلى المكتبة") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(file.fileName, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    OutlinedTextField(title, { title = it }, Modifier.fillMaxWidth(), label = { Text("العنوان") })
                    OutlinedTextField(description, { description = it }, Modifier.fillMaxWidth(), label = { Text("الوصف") }, minLines = 2)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("منشور", modifier = Modifier.padding(top = 8.dp))
                        Switch(published, { published = it })
                    }
                }
            },
            confirmButton = {
                TextButton(
                    enabled = title.length >= 2,
                    onClick = {
                        viewModel.uploadAndCreateLibraryItem(
                            file.bytes,
                            file.mimeType,
                            file.fileName,
                            title.trim(),
                            description.ifBlank { null },
                            published,
                        )
                        pendingFile = null
                    },
                ) { Text("رفع وحفظ") }
            },
            dismissButton = { TextButton(onClick = { pendingFile = null }) { Text("إلغاء") } },
        )
    }
}

@Composable
private fun LibraryItemDialog(
    initial: LibraryItemDto?,
    onDismiss: () -> Unit,
    onSubmit: (LibraryItemRequest) -> Unit,
) {
    var title by remember { mutableStateOf(initial?.title.orEmpty()) }
    var description by remember { mutableStateOf(initial?.description.orEmpty()) }
    var type by remember { mutableStateOf(initial?.type ?: "PDF") }
    var url by remember { mutableStateOf(initial?.url.orEmpty()) }
    var published by remember { mutableStateOf(initial?.published ?: true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "إضافة رابط للمكتبة" else "تعديل المادة") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(title, { title = it }, Modifier.fillMaxWidth(), label = { Text("العنوان") })
                OutlinedTextField(description, { description = it }, Modifier.fillMaxWidth(), label = { Text("الوصف") }, minLines = 2)
                OutlinedTextField(type, { type = it }, Modifier.fillMaxWidth(), label = { Text("النوع") })
                OutlinedTextField(url, { url = it }, Modifier.fillMaxWidth(), label = { Text("الرابط") })
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("منشور", modifier = Modifier.padding(top = 8.dp))
                    Switch(published, { published = it })
                }
            }
        },
        confirmButton = {
            TextButton(enabled = title.length >= 2 && url.isNotBlank(), onClick = {
                onSubmit(LibraryItemRequest(title.trim(), description.ifBlank { null }, type.trim(), url.trim(), published))
            }) { Text("حفظ") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
fun MediaScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val context = LocalContext.current
    val canEdit = state.user?.role == "ADMIN" || state.user?.role == "MANAGER"
    var showCreate by remember { mutableStateOf(false) }
    var pendingAsset by remember { mutableStateOf<PickedFile?>(null) }
    var editActivity by remember { mutableStateOf<ActivityDto?>(null) }
    var uploadTargetActivityId by remember { mutableStateOf<String?>(null) }

    val mediaPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            val file = readPickedFile(context, uri)
            val targetId = uploadTargetActivityId
            if (file != null && targetId != null) {
                viewModel.uploadActivityAsset(targetId, file.bytes, file.mimeType, file.fileName)
                uploadTargetActivityId = null
            } else {
                pendingAsset = file
            }
        } else {
            uploadTargetActivityId = null
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("المركز", "الإعلام والأنشطة", if (canEdit) "إدارة المنشورات ورفع الصور والفيديو." else "آخر أخبار وأنشطة المركز.") }
        if (canEdit) item {
            Button(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text("منشور جديد")
            }
        }

        items(state.media, key = { it.id }) { activity ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(activity.title, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                            Text(activity.category, color = MaterialTheme.colorScheme.primary, fontSize = 11.sp)
                        }
                        if (!activity.published) StatusChip("غير منشور", null)
                    }
                    Text(activity.content, lineHeight = 21.sp)
                    activity.assets.forEach { asset ->
                        OutlinedButton(onClick = { openUrl(context, asset.url) }, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Outlined.AttachFile, contentDescription = null)
                            Text("${asset.kind}: ${asset.fileName}", modifier = Modifier.weight(1f))
                            Icon(Icons.Outlined.OpenInNew, contentDescription = null)
                        }
                        if (canEdit) {
                            TextButton(onClick = { viewModel.deleteActivityAsset(activity.id, asset.id) }) {
                                Text("حذف الملف", color = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                    if (canEdit) {
                        Row {
                            IconButton(onClick = {
                                uploadTargetActivityId = activity.id
                                mediaPicker.launch(arrayOf("image/*", "video/*"))
                            }) { Icon(Icons.Outlined.AttachFile, contentDescription = "إضافة صورة أو فيديو") }
                            IconButton(onClick = { editActivity = activity }) { Icon(Icons.Outlined.Edit, contentDescription = "تعديل") }
                            IconButton(onClick = { viewModel.deleteActivity(activity.id) }) { Icon(Icons.Outlined.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
        }
        if (state.media.isEmpty()) item { EmptyState("لا توجد أنشطة منشورة") }
    }

    if (showCreate) {
        ActivityDialog(
            initial = null,
            selectedAsset = pendingAsset,
            onPickAsset = { mediaPicker.launch(arrayOf("image/*", "video/*")) },
            onClearAsset = { pendingAsset = null },
            onDismiss = { showCreate = false; pendingAsset = null },
            onSubmit = { request ->
                val file = pendingAsset
                if (file == null) viewModel.createActivity(request)
                else viewModel.createActivityWithAsset(request, file.bytes, file.mimeType, file.fileName)
                showCreate = false
                pendingAsset = null
            },
        )
    }

    editActivity?.let { activity ->
        ActivityDialog(
            initial = activity,
            selectedAsset = null,
            onPickAsset = {},
            onClearAsset = {},
            onDismiss = { editActivity = null },
            onSubmit = {
                viewModel.updateActivity(activity.id, it)
                editActivity = null
            },
        )
    }
}

@Composable
private fun ActivityDialog(
    initial: ActivityDto?,
    selectedAsset: PickedFile?,
    onPickAsset: () -> Unit,
    onClearAsset: () -> Unit,
    onDismiss: () -> Unit,
    onSubmit: (ActivityRequest) -> Unit,
) {
    var title by remember { mutableStateOf(initial?.title.orEmpty()) }
    var content by remember { mutableStateOf(initial?.content.orEmpty()) }
    var category by remember { mutableStateOf(initial?.category ?: "نشاط") }
    var imageUrl by remember { mutableStateOf(initial?.imageUrl.orEmpty()) }
    var published by remember { mutableStateOf(initial?.published ?: true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "منشور جديد" else "تعديل المنشور") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { OutlinedTextField(title, { title = it }, Modifier.fillMaxWidth(), label = { Text("العنوان") }) }
                item { OutlinedTextField(content, { content = it }, Modifier.fillMaxWidth(), label = { Text("المحتوى") }, minLines = 4) }
                item { OutlinedTextField(category, { category = it }, Modifier.fillMaxWidth(), label = { Text("التصنيف") }) }
                item { OutlinedTextField(imageUrl, { imageUrl = it }, Modifier.fillMaxWidth(), label = { Text("رابط صورة اختياري") }) }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("منشور", modifier = Modifier.padding(top = 8.dp))
                        Switch(published, { published = it })
                    }
                }
                if (initial == null) item {
                    OutlinedButton(onClick = onPickAsset, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Outlined.AttachFile, contentDescription = null)
                        Text(selectedAsset?.fileName ?: "إرفاق صورة أو فيديو")
                    }
                }
                if (selectedAsset != null) item {
                    TextButton(onClick = onClearAsset) { Text("إزالة المرفق") }
                }
            }
        },
        confirmButton = {
            TextButton(enabled = title.length >= 2 && content.length >= 5, onClick = {
                onSubmit(ActivityRequest(title.trim(), content.trim(), category.trim(), imageUrl.ifBlank { null }, published))
            }) { Text("حفظ") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
fun HomeEditorScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val home = state.home
    if (home == null) {
        EmptyState("تعذر تحميل محتوى الصفحة الرئيسية")
        return
    }

    var draft by remember(home) { mutableStateOf(home) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item { ScreenHeader("الموقع العام", "تحرير الصفحة الرئيسية", "نفس المحتوى المستخدم في واجهة الويب العامة.") }
        item { HomeField("الشريط التعريفي", draft.eyebrow) { draft = draft.copy(eyebrow = it) } }
        item { HomeField("عنوان الواجهة", draft.heroTitle) { draft = draft.copy(heroTitle = it) } }
        item { HomeField("نص الواجهة", draft.heroBody, true) { draft = draft.copy(heroBody = it) } }
        item { HomeField("عنوان عن النظام", draft.aboutTitle) { draft = draft.copy(aboutTitle = it) } }
        item { HomeField("نص عن النظام", draft.aboutBody, true) { draft = draft.copy(aboutBody = it) } }
        item { HomeField("عنوان الميزة 1", draft.feature1Title) { draft = draft.copy(feature1Title = it) } }
        item { HomeField("نص الميزة 1", draft.feature1Body, true) { draft = draft.copy(feature1Body = it) } }
        item { HomeField("عنوان الميزة 2", draft.feature2Title) { draft = draft.copy(feature2Title = it) } }
        item { HomeField("نص الميزة 2", draft.feature2Body, true) { draft = draft.copy(feature2Body = it) } }
        item { HomeField("عنوان الميزة 3", draft.feature3Title) { draft = draft.copy(feature3Title = it) } }
        item { HomeField("نص الميزة 3", draft.feature3Body, true) { draft = draft.copy(feature3Body = it) } }
        item { HomeField("عنوان البطاقة", draft.calloutTitle) { draft = draft.copy(calloutTitle = it) } }
        item { HomeField("نص البطاقة", draft.calloutBody, true) { draft = draft.copy(calloutBody = it) } }
        item { HomeField("الهاتف", draft.footerPhone.orEmpty()) { draft = draft.copy(footerPhone = it.ifBlank { null }) } }
        item { HomeField("البريد", draft.footerEmail.orEmpty()) { draft = draft.copy(footerEmail = it.ifBlank { null }) } }
        item { HomeField("Instagram", draft.footerInstagram.orEmpty()) { draft = draft.copy(footerInstagram = it.ifBlank { null }) } }
        item { HomeField("Facebook", draft.footerFacebook.orEmpty()) { draft = draft.copy(footerFacebook = it.ifBlank { null }) } }
        item {
            Button(onClick = { viewModel.updateHome(draft) }, modifier = Modifier.fillMaxWidth()) { Text("حفظ الصفحة الرئيسية") }
        }
    }
}

@Composable
private fun HomeField(label: String, value: String, multiline: Boolean = false, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        minLines = if (multiline) 3 else 1,
    )
}

@Composable
fun ReportsScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val context = LocalContext.current
    var studentId by remember(state.reportStudents) { mutableStateOf(state.reportStudents.firstOrNull()?.id.orEmpty()) }
    var from by remember { mutableStateOf(daysAgoIso(29)) }
    var to by remember { mutableStateOf(todayIso()) }
    var halaqahId by remember(state.halaqahs) { mutableStateOf(state.halaqahs.firstOrNull()?.id.orEmpty()) }
    val report = state.selectedReport
    val halaqahReport = state.halaqahReport

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenHeader(
                "تقارير نظامية بدون ذكاء اصطناعي",
                when (state.user?.role) {
                    "STUDENT" -> "تقريري"
                    "PARENT" -> "تقارير الأبناء"
                    "TEACHER" -> "تقارير طلابي"
                    else -> "تقارير الطلاب"
                },
                "تعتمد مباشرة على السجلات المحفوظة وتلتزم بصلاحية الحساب.",
            )
        }

        if (state.reportStudents.isNotEmpty()) {
            item {
                SelectionField(
                    "الطالب",
                    state.reportStudents.firstOrNull { it.id == studentId }?.user?.fullName.orEmpty(),
                    state.reportStudents.map { it.id to "${it.user.fullName} — ${it.halaqah.name}" },
                    { studentId = it },
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(from, { from = it }, Modifier.weight(1f), label = { Text("من") })
                    OutlinedTextField(to, { to = it }, Modifier.weight(1f), label = { Text("إلى") })
                }
            }
            item {
                Button(
                    onClick = { viewModel.loadStudentReport(studentId, from, to) },
                    enabled = studentId.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("إنشاء التقرير") }
            }
        } else {
            item { EmptyState("لا يوجد طلاب متاحون حسب صلاحيات هذا الحساب") }
        }

        if (report != null && report.student.id == studentId) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MetricCard("الحضور", "${report.summary.attendanceRate.toInt()}%", Modifier.weight(1f), BrandGreen)
                    MetricCard("التقييم", String.format(Locale.ENGLISH, "%.1f/5", report.summary.averageRating), Modifier.weight(1f))
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MetricCard("الصفحات", String.format(Locale.ENGLISH, "%.1f", report.summary.totalPages), Modifier.weight(1f))
                    MetricCard("الاختبارات", String.format(Locale.ENGLISH, "%.1f/100", report.summary.averageTestScore), Modifier.weight(1f), BrandGold)
                }
            }
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("تفصيل الأداء", fontWeight = FontWeight.Bold)
                        listOf("HIFZ", "NEAR_REVIEW", "FAR_REVIEW", "MATN").forEach { type ->
                            val metric = report.summary.recordTypes[type] ?: RecordTypeSummaryDto()
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(recordTypeLabel(type))
                                Text("${metric.count} سجل • ${String.format(Locale.ENGLISH, "%.1f", metric.averageRating)}/5")
                            }
                        }
                    }
                }
            }
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("الاتجاه مقارنة بالفترة السابقة", fontWeight = FontWeight.Bold)
                        LabeledValue("التقييم", "${trendLabel(report.trend.rating.direction)} • ${String.format(Locale.ENGLISH, "%.1f", report.trend.rating.previous)} ← ${String.format(Locale.ENGLISH, "%.1f", report.trend.rating.current)}")
                        LabeledValue("الاختبارات", "${trendLabel(report.trend.tests.direction)} • ${String.format(Locale.ENGLISH, "%.1f", report.trend.tests.previous)} ← ${String.format(Locale.ENGLISH, "%.1f", report.trend.tests.current)}")
                    }
                }
            }
            item {
                OutlinedButton(
                    onClick = { printStudentReport(context, report) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Outlined.Print, contentDescription = null)
                    Text("طباعة / حفظ PDF")
                }
            }
        }

        if (state.user?.role == "ADMIN" && state.halaqahs.isNotEmpty()) {
            item {
                Spacer(Modifier.height(8.dp))
                ScreenHeader(
                    "تقرير إداري شامل",
                    "تقرير الحلقة",
                    "ملخص سريع لأداء جميع طلاب الحلقة والاختبارات المسجلة.",
                )
            }
            item {
                SelectionField(
                    "الحلقة",
                    state.halaqahs.firstOrNull { it.id == halaqahId }?.name.orEmpty(),
                    state.halaqahs.map { it.id to it.name },
                    { halaqahId = it },
                )
            }
            item {
                OutlinedButton(
                    onClick = { viewModel.loadHalaqahReport(halaqahId) },
                    enabled = halaqahId.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("تحميل تقرير الحلقة") }
            }

            if (halaqahReport != null && halaqahReport.halaqah.id == halaqahId) {
                item {
                    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                        Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                            Text(halaqahReport.halaqah.name, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            LabeledValue("المعلم", halaqahReport.halaqah.teacher?.fullName ?: "غير معيّن")
                            LabeledValue("عدد الطلاب", halaqahReport.summary.students.toString())
                            LabeledValue("سجلات المتابعة", halaqahReport.summary.progressRecords.toString())
                            LabeledValue("الحضور / الغياب", "${halaqahReport.summary.attended} / ${halaqahReport.summary.absent}")
                            LabeledValue("متوسط التقييم", String.format(Locale.ENGLISH, "%.1f / 5", halaqahReport.summary.averageRating))
                            LabeledValue("الاختبارات الشهرية", halaqahReport.summary.monthlyTests.toString())
                            LabeledValue("متوسط الاختبارات", String.format(Locale.ENGLISH, "%.1f / 100", halaqahReport.summary.averageTestScore))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AiAssistantScreen(state: TahfizUiState, viewModel: TahfizViewModel) {
    val context = LocalContext.current
    var roleFilter by remember { mutableStateOf("STUDENT") }
    val people = state.aiPeople.filter { roleFilter == "ALL" || it.role == roleFilter }
    var userId by remember(people) { mutableStateOf(people.firstOrNull()?.id.orEmpty()) }
    var from by remember { mutableStateOf(daysAgoIso(29)) }
    var to by remember { mutableStateOf(todayIso()) }
    var audience by remember { mutableStateOf("ADMIN") }
    var question by remember { mutableStateOf("") }
    val result = state.aiResult

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ScreenHeader(
                "خاص بالمدير فقط",
                "المساعد الذكي المؤسسي",
                "تحليل خاص يعمل عبر نموذج الذكاء الاصطناعي المستضاف على خادم المؤسسة.",
            )
        }

        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("حالة النموذج المحلي", fontWeight = FontWeight.Bold)
                        StatusChip(if (state.aiStatus?.configured == true) "جاهز" else "غير جاهز", state.aiStatus?.configured)
                    }
                    Text(state.aiStatus?.model ?: "غير محدد", color = MaterialTheme.colorScheme.primary)
                    Text(
                        if (state.aiStatus?.connected == true) "متصل بخادم الذكاء الاصطناعي المحلي" else "تحقق من Ollama/خادم النموذج",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                    )
                }
            }
        }

        item {
            SelectionField(
                "نوع الحساب",
                if (roleFilter == "ALL") "جميع الحسابات" else roleLabel(roleFilter),
                listOf("STUDENT" to "طالب", "TEACHER" to "معلم", "MANAGER" to "مشرف", "PARENT" to "ولي أمر", "ADMIN" to "مدير", "ALL" to "جميع الحسابات"),
                {
                    roleFilter = it
                    userId = state.aiPeople.firstOrNull { person -> it == "ALL" || person.role == it }?.id.orEmpty()
                    viewModel.clearAiConversation()
                },
            )
        }
        item {
            SelectionField(
                "الشخص",
                people.firstOrNull { it.id == userId }?.fullName.orEmpty(),
                people.map { it.id to "${it.fullName} — ${roleLabel(it.role)}" },
                {
                    userId = it
                    viewModel.clearAiConversation()
                },
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(from, { from = it }, Modifier.weight(1f), label = { Text("من") })
                OutlinedTextField(to, { to = it }, Modifier.weight(1f), label = { Text("إلى") })
            }
        }
        item {
            SelectionField(
                "نوع التقرير",
                when (audience) {
                    "STUDENT" -> "موجه للطالب"
                    "PARENT" -> "موجه لولي الأمر"
                    "TEACHER" -> "موجه للمعلم"
                    "MANAGER" -> "موجه للمشرف"
                    else -> "داخلي للإدارة"
                },
                listOf("ADMIN" to "داخلي للإدارة", "STUDENT" to "موجه للطالب", "PARENT" to "موجه لولي الأمر", "TEACHER" to "موجه للمعلم", "MANAGER" to "موجه للمشرف"),
                { audience = it },
            )
        }
        item {
            Button(
                onClick = {
                    viewModel.analyzePerson(
                        AiAnalyzeRequest(
                            userId = userId,
                            from = from,
                            to = to,
                            audience = audience,
                            previousAnswers = state.aiHistory.takeLast(4).map { it.analysis.answer.ifBlank { it.analysis.summary } },
                        ),
                    )
                },
                enabled = state.aiStatus?.configured == true && userId.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Outlined.AutoAwesome, contentDescription = null)
                Text("إنشاء تحليل شامل")
            }
        }

        if (result != null && result.subject.id == userId) {
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                    Column(Modifier.padding(17.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(result.analysis.title, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
                        Text(result.analysis.summary, lineHeight = 22.sp)
                        StatusChip("الاتجاه: ${trendLabel(result.analysis.trajectory.label)}", null)
                        Text(result.analysis.trajectory.explanation, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 21.sp)
                    }
                }
            }

            if (result.analysis.recommendations.isNotEmpty()) {
                item { Text("التوصيات", fontWeight = FontWeight.Bold, fontSize = 18.sp) }
                items(result.analysis.recommendations) { recommendation ->
                    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(recommendation.title, fontWeight = FontWeight.Bold)
                                StatusChip(
                                    when (recommendation.priority) { "HIGH" -> "عالية"; "LOW" -> "منخفضة"; else -> "متوسطة" },
                                    null,
                                )
                            }
                            Text(recommendation.reason, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 20.sp)
                        }
                    }
                }
            }

            if (result.analysis.evidence.isNotEmpty()) {
                item {
                    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text("الأدلة من السجلات", fontWeight = FontWeight.Bold)
                            result.analysis.evidence.forEach { Text("• $it", lineHeight = 20.sp) }
                        }
                    }
                }
            }

            item {
                OutlinedTextField(
                    question,
                    { question = it },
                    Modifier.fillMaxWidth(),
                    label = { Text("اسأل المساعد عن هذا الشخص") },
                    minLines = 3,
                    placeholder = { Text("مثال: ما أكثر جانب يحتاج إلى تحسين؟") },
                )
            }
            item {
                Button(
                    onClick = {
                        viewModel.analyzePerson(
                            AiAnalyzeRequest(
                                userId = userId,
                                from = from,
                                to = to,
                                audience = audience,
                                question = question.trim(),
                                previousAnswers = state.aiHistory.takeLast(4).map { it.analysis.answer.ifBlank { it.analysis.summary } },
                            ),
                        )
                        question = ""
                    },
                    enabled = question.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("إرسال السؤال") }
            }
            item {
                OutlinedButton(onClick = { printAiReport(context, result) }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Outlined.Print, contentDescription = null)
                    Text("طباعة / حفظ PDF")
                }
            }
        }
    }
}

private fun htmlEscape(value: String): String = value
    .replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")

private fun printHtml(context: Context, jobName: String, html: String) {
    val webView = WebView(context)
    webView.settings.javaScriptEnabled = false
    webView.webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView, url: String?) {
            val printManager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
            val adapter = view.createPrintDocumentAdapter(jobName)
            printManager.print(
                jobName,
                adapter,
                PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .build(),
            )
        }
    }
    webView.loadDataWithBaseURL(null, html, "text/HTML", "UTF-8", null)
}

private fun printStudentReport(context: Context, report: StudentPerformanceReportDto) {
    val types = report.summary.recordTypes.entries.joinToString("") { entry ->
        "<tr><td>${htmlEscape(recordTypeLabel(entry.key))}</td><td>${entry.value.count}</td><td>${String.format(Locale.ENGLISH, "%.1f", entry.value.averageRating)}/5</td></tr>"
    }
    val html = """
        <html dir="rtl"><head><meta charset="utf-8"><style>
        body{font-family:sans-serif;padding:24px;color:#251d23}h1{color:#741064}table{width:100%;border-collapse:collapse;margin-top:16px}
        td,th{border:1px solid #ddd;padding:8px;text-align:right}.box{background:#f7f3f6;padding:14px;border-radius:10px;margin:10px 0}
        </style></head><body>
        <h1>دار النور لتعليم القرآن الكريم</h1>
        <h2>تقرير أداء الطالب</h2>
        <div class="box"><b>${htmlEscape(report.student.user.fullName)}</b><br>${htmlEscape(report.student.halaqah.name)}<br>
        الفترة: ${report.period.from} — ${report.period.to}</div>
        <p>الحضور: ${report.summary.attendanceRate.toInt()}%</p>
        <p>إجمالي الصفحات: ${String.format(Locale.ENGLISH, "%.1f", report.summary.totalPages)}</p>
        <p>متوسط التقييم: ${String.format(Locale.ENGLISH, "%.1f", report.summary.averageRating)}/5</p>
        <p>متوسط الاختبارات: ${String.format(Locale.ENGLISH, "%.1f", report.summary.averageTestScore)}/100</p>
        <table><tr><th>النوع</th><th>السجلات</th><th>متوسط التقييم</th></tr>$types</table>
        <p style="margin-top:24px;font-size:11px;color:#777">تقرير مباشر من سجلات النظام، وليس تقريرًا مولدًا بالذكاء الاصطناعي.</p>
        </body></html>
    """.trimIndent()
    printHtml(context, "student-report", html)
}

private fun printAiReport(context: Context, result: AiAnalysisResponse) {
    val recommendations = result.analysis.recommendations.joinToString("") {
        "<li><b>${htmlEscape(it.title)}</b> — ${htmlEscape(it.reason)}</li>"
    }
    val evidence = result.analysis.evidence.joinToString("") { "<li>${htmlEscape(it)}</li>" }
    val limitations = result.analysis.limitations.joinToString("") { "<li>${htmlEscape(it)}</li>" }
    val html = """
        <html dir="rtl"><head><meta charset="utf-8"><style>
        body{font-family:sans-serif;padding:24px;color:#251d23}h1,h2{color:#741064}.box{background:#f7f3f6;padding:14px;border-radius:10px;margin:10px 0}
        li{margin:7px 0;line-height:1.7}</style></head><body>
        <h1>دار النور لتعليم القرآن الكريم</h1>
        <h2>${htmlEscape(result.analysis.title)}</h2>
        <div class="box"><b>${htmlEscape(result.subject.fullName)}</b><br>الفترة: ${result.period.from} — ${result.period.to}</div>
        <h3>الملخص</h3><p>${htmlEscape(result.analysis.summary)}</p>
        <h3>الاتجاه التقديري: ${htmlEscape(trendLabel(result.analysis.trajectory.label))}</h3>
        <p>${htmlEscape(result.analysis.trajectory.explanation)}</p>
        <h3>التوصيات</h3><ul>$recommendations</ul>
        <h3>الأدلة من السجلات</h3><ul>$evidence</ul>
        <h3>الإجابة</h3><p>${htmlEscape(result.analysis.answer)}</p>
        <h3>حدود التحليل</h3><ul>$limitations</ul>
        <p style="margin-top:24px;font-size:11px;color:#777">تقرير مولد بمساعدة نموذج الذكاء الاصطناعي المحلي اعتمادًا على سجلات النظام. التوصيات مساعدة وليست قرارًا إداريًا تلقائيًا.</p>
        </body></html>
    """.trimIndent()
    printHtml(context, "ai-report", html)
}
