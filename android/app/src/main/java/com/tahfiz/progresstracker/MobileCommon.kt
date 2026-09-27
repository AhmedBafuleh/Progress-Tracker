package com.tahfiz.progresstracker

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ChildCare
import androidx.compose.material.icons.outlined.Collections
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.FactCheck
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.NoteAlt
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Summarize
import androidx.compose.material.icons.outlined.VideoLibrary
import androidx.compose.material.icons.outlined.WorkHistory
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

val BrandPurple = Color(0xFF741064)
val BrandPurpleDeep = Color(0xFF3A1734)
val BrandGold = Color(0xFFC9964B)
val BrandGreen = Color(0xFF0F4A2F)
val BrandBackground = Color(0xFFF8F6F8)
val BrandSurfaceAlt = Color(0xFFF3EEF2)
val BrandText = Color(0xFF251D23)
val BrandMuted = Color(0xFF766D74)

val TahfizColors = lightColorScheme(
    primary = BrandPurple,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFF1DDEE),
    onPrimaryContainer = BrandPurpleDeep,
    secondary = BrandGreen,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE3F0E8),
    onSecondaryContainer = Color(0xFF123A29),
    tertiary = BrandGold,
    onTertiary = Color(0xFF3B2B16),
    background = BrandBackground,
    onBackground = BrandText,
    surface = Color.White,
    onSurface = BrandText,
    surfaceVariant = BrandSurfaceAlt,
    onSurfaceVariant = BrandMuted,
    outline = Color(0xFFDDD4DA),
    error = Color(0xFFB42318),
)

enum class MobileSection(val label: String, val icon: ImageVector) {
    OVERVIEW("نظرة عامة", Icons.Outlined.Dashboard),
    USERS("إدارة المستخدمين", Icons.Outlined.People),
    HALAQAHS("الحلقات", Icons.Outlined.School),
    PARENT_LINKS("ربط أولياء الأمور", Icons.Outlined.Link),
    RECORD("تسجيل المتابعة", Icons.Outlined.EditNote),
    STUDENTS("الطلاب", Icons.Outlined.Groups),
    HISTORY("سجل المتابعة", Icons.Outlined.History),
    TESTS("الاختبارات الشهرية", Icons.Outlined.FactCheck),
    NOTES("الملاحظات والمخالفات", Icons.Outlined.NoteAlt),
    LEAVES("الإجازات", Icons.Outlined.CalendarMonth),
    NOTIFICATIONS("الإشعارات", Icons.Outlined.Notifications),
    LIBRARY("المكتبة", Icons.Outlined.Book),
    MEDIA("الإعلام والأنشطة", Icons.Outlined.Collections),
    HOME_EDITOR("تحرير الرئيسية", Icons.Outlined.Home),
    PERIODS("الفترات", Icons.Outlined.Schedule),
    REPORTS("التقارير", Icons.Outlined.Summarize),
    AI("المساعد الذكي", Icons.Outlined.AutoAwesome),
    CHILDREN("الأبناء", Icons.Outlined.ChildCare),
}

fun sectionsForRole(role: String): List<MobileSection> = when (role) {
    "ADMIN" -> listOf(
        MobileSection.OVERVIEW,
        MobileSection.USERS,
        MobileSection.HALAQAHS,
        MobileSection.PARENT_LINKS,
        MobileSection.RECORD,
        MobileSection.TESTS,
        MobileSection.NOTES,
        MobileSection.LEAVES,
        MobileSection.NOTIFICATIONS,
        MobileSection.LIBRARY,
        MobileSection.MEDIA,
        MobileSection.HOME_EDITOR,
        MobileSection.PERIODS,
        MobileSection.REPORTS,
        MobileSection.AI,
    )

    "MANAGER" -> listOf(
        MobileSection.OVERVIEW,
        MobileSection.USERS,
        MobileSection.PARENT_LINKS,
        MobileSection.NOTES,
        MobileSection.LEAVES,
        MobileSection.NOTIFICATIONS,
        MobileSection.LIBRARY,
        MobileSection.MEDIA,
        MobileSection.PERIODS,
        MobileSection.REPORTS,
    )

    "TEACHER" -> listOf(
        MobileSection.OVERVIEW,
        MobileSection.RECORD,
        MobileSection.STUDENTS,
        MobileSection.HISTORY,
        MobileSection.REPORTS,
        MobileSection.TESTS,
        MobileSection.NOTES,
        MobileSection.LEAVES,
        MobileSection.LIBRARY,
        MobileSection.MEDIA,
    )

    "STUDENT" -> listOf(
        MobileSection.OVERVIEW,
        MobileSection.HISTORY,
        MobileSection.REPORTS,
        MobileSection.NOTIFICATIONS,
        MobileSection.LEAVES,
        MobileSection.LIBRARY,
        MobileSection.MEDIA,
    )

    "PARENT" -> listOf(
        MobileSection.OVERVIEW,
        MobileSection.CHILDREN,
        MobileSection.HISTORY,
        MobileSection.REPORTS,
        MobileSection.LIBRARY,
        MobileSection.MEDIA,
    )

    else -> listOf(MobileSection.OVERVIEW)
}

fun roleLabel(role: String): String = when (role) {
    "ADMIN" -> "المدير"
    "MANAGER" -> "المشرف"
    "TEACHER" -> "المعلم"
    "STUDENT" -> "الطالب"
    "PARENT" -> "ولي الأمر"
    else -> role
}

fun recordTypeLabel(type: String?): String = when (type) {
    "HIFZ" -> "حفظ"
    "NEAR_REVIEW" -> "مراجعة قريب"
    "FAR_REVIEW" -> "مراجعة بعيد"
    "MATN" -> "متن"
    else -> "متابعة"
}

fun trendLabel(value: String): String = when (value) {
    "IMPROVING" -> "يتحسن"
    "STABLE" -> "مستقر"
    "DECLINING" -> "يحتاج متابعة"
    "NEW_DATA" -> "بيانات جديدة"
    "NO_DATA", "INSUFFICIENT_DATA" -> "بيانات غير كافية"
    "NOT_APPLICABLE" -> "غير منطبق"
    else -> value
}

fun statusLabel(value: String): String = when (value) {
    "PENDING" -> "قيد المراجعة"
    "APPROVED" -> "مقبول"
    "REJECTED" -> "مرفوض"
    "VACATION" -> "إجازة"
    "DAY_OFF" -> "يوم إجازة"
    "NOTE" -> "ملاحظة"
    "VIOLATION" -> "مخالفة"
    "TASK" -> "مهمة"
    "ACTIVITY" -> "نشاط"
    "REMINDER" -> "تذكير"
    else -> value
}

fun formatDate(value: String?): String {
    if (value.isNullOrBlank()) return "—"
    val raw = value.take(10)
    return runCatching {
        LocalDate.parse(raw).format(DateTimeFormatter.ofPattern("dd-MM-yyyy", Locale.ENGLISH))
    }.getOrDefault(raw)
}

fun todayIso(): String = LocalDate.now().toString()
fun daysAgoIso(days: Long): String = LocalDate.now().minusDays(days).toString()

@Composable
fun ScreenHeader(
    eyebrow: String,
    title: String,
    subtitle: String? = null,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            eyebrow,
            color = MaterialTheme.colorScheme.primary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(title, fontSize = 25.sp, fontWeight = FontWeight.Bold)
        subtitle?.let {
            Text(
                it,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 13.sp,
                lineHeight = 20.sp,
            )
        }
    }
}

@Composable
fun MetricCard(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    accent: Color = MaterialTheme.colorScheme.primary,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            Modifier.padding(horizontal = 16.dp, vertical = 15.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            Text(value, color = accent, fontWeight = FontWeight.ExtraBold, fontSize = 22.sp)
        }
    }
}

@Composable
fun EmptyState(title: String, body: String? = null) {
    OutlinedCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .7f)),
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, fontWeight = FontWeight.Bold)
            body?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp) }
        }
    }
}

@Composable
fun StatusChip(text: String, positive: Boolean? = null) {
    val color = when (positive) {
        true -> BrandGreen
        false -> MaterialTheme.colorScheme.error
        null -> BrandGold
    }
    AssistChip(
        onClick = {},
        enabled = false,
        label = { Text(text, color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
        border = BorderStroke(1.dp, color.copy(alpha = .25f)),
    )
}

@Composable
fun SelectionField(
    label: String,
    selectedText: String,
    options: List<Pair<String, String>>,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        OutlinedCard(
            modifier = Modifier.fillMaxWidth().clickable(enabled = options.isNotEmpty()) { expanded = true },
            shape = RoundedCornerShape(14.dp),
        ) {
            Text(
                selectedText.ifBlank { if (options.isEmpty()) "لا توجد خيارات" else "اختر" },
                modifier = Modifier.padding(15.dp),
                color = if (selectedText.isBlank()) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            )
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
fun LabeledValue(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
        Text(value.ifBlank { "—" }, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    }
}

fun averageRatingText(entries: List<com.tahfiz.progresstracker.data.ProgressEntryDto>): String {
    val values = entries.mapNotNull { it.rating }
    if (values.isEmpty()) return "0.0 / 5"
    return String.format(Locale.ENGLISH, "%.1f / 5", values.average())
}
