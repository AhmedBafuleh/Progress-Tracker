package com.tahfiz.progresstracker

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.Collections
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Login
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tahfiz.progresstracker.data.ActivityDto
import com.tahfiz.progresstracker.data.LibraryItemDto

enum class PublicPage(val label: String) {
    HOME("الرئيسية"),
    LIBRARY("المكتبة"),
    MEDIA("الإعلام والأنشطة"),
    LOGIN("تسجيل الدخول"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PublicSiteApp(
    state: TahfizUiState,
    viewModel: TahfizViewModel,
    page: PublicPage,
    onPageChange: (PublicPage) -> Unit,
    onOpenDashboard: () -> Unit,
    snackbarHostState: SnackbarHostState,
) {
    val user = state.user

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(9.dp),
                    ) {
                        Image(
                            painter = painterResource(R.drawable.dar_al_nur_logo),
                            contentDescription = "شعار دار النور",
                            modifier = Modifier.size(38.dp),
                            contentScale = ContentScale.Fit,
                        )
                        Column {
                            Text("دار النور", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
                            Text("تعليم القرآن الكريم", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                        }
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::refreshPublic) {
                        Icon(Icons.Outlined.Refresh, contentDescription = "تحديث")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = page == PublicPage.HOME,
                    onClick = { onPageChange(PublicPage.HOME) },
                    icon = { Icon(Icons.Outlined.Home, contentDescription = null) },
                    label = { Text("الرئيسية") },
                )
                NavigationBarItem(
                    selected = page == PublicPage.LIBRARY,
                    onClick = { onPageChange(PublicPage.LIBRARY) },
                    icon = { Icon(Icons.Outlined.Book, contentDescription = null) },
                    label = { Text("المكتبة") },
                )
                NavigationBarItem(
                    selected = page == PublicPage.MEDIA,
                    onClick = { onPageChange(PublicPage.MEDIA) },
                    icon = { Icon(Icons.Outlined.Collections, contentDescription = null) },
                    label = { Text("الأنشطة") },
                )
                if (user == null) {
                    NavigationBarItem(
                        selected = page == PublicPage.LOGIN,
                        onClick = { onPageChange(PublicPage.LOGIN) },
                        icon = { Icon(Icons.Outlined.Login, contentDescription = null) },
                        label = { Text("دخول") },
                    )
                } else {
                    NavigationBarItem(
                        selected = false,
                        onClick = onOpenDashboard,
                        icon = { Icon(Icons.Outlined.Dashboard, contentDescription = null) },
                        label = { Text("لوحتي") },
                    )
                }
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (page) {
                PublicPage.HOME -> PublicHomeScreen(
                    state = state,
                    onOpenLibrary = { onPageChange(PublicPage.LIBRARY) },
                    onOpenMedia = { onPageChange(PublicPage.MEDIA) },
                    onOpenLogin = { onPageChange(PublicPage.LOGIN) },
                    onOpenDashboard = onOpenDashboard,
                )
                PublicPage.LIBRARY -> PublicLibraryScreen(state.publicLibrary)
                PublicPage.MEDIA -> PublicMediaScreen(state.publicMedia)
                PublicPage.LOGIN -> {
                    if (user == null) {
                        PublicLoginContent(state, viewModel)
                    } else {
                        PublicHomeScreen(
                            state = state,
                            onOpenLibrary = { onPageChange(PublicPage.LIBRARY) },
                            onOpenMedia = { onPageChange(PublicPage.MEDIA) },
                            onOpenLogin = {},
                            onOpenDashboard = onOpenDashboard,
                        )
                    }
                }
            }

            if (state.loading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 18.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                            Text("جارٍ التحميل...")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PublicHomeScreen(
    state: TahfizUiState,
    onOpenLibrary: () -> Unit,
    onOpenMedia: () -> Unit,
    onOpenLogin: () -> Unit,
    onOpenDashboard: () -> Unit,
) {
    val home = state.home

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 18.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            ) {
                Column(
                    Modifier.padding(22.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        home?.eyebrow ?: "متابعة منظمة • إدارة أسهل • معلومات أوضح",
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                    )
                    Text(
                        home?.heroTitle ?: "منصة رقمية لمتابعة رحلة حفظ القرآن الكريم",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 26.sp,
                        lineHeight = 34.sp,
                    )
                    Text(
                        home?.heroBody ?: "نظام موحد لإدارة مركز التحفيظ ومتابعة تقدم الطلاب بصورة واضحة ومنظمة.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 22.sp,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = onOpenLibrary, modifier = Modifier.weight(1f)) {
                            Text("استعراض المكتبة")
                        }
                        OutlinedButton(onClick = onOpenMedia, modifier = Modifier.weight(1f)) {
                            Text("الأنشطة")
                        }
                    }
                    if (state.user == null) {
                        TextButton(onClick = onOpenLogin, modifier = Modifier.fillMaxWidth()) {
                            Text("تسجيل الدخول للحسابات الداخلية")
                        }
                    } else {
                        TextButton(onClick = onOpenDashboard, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Outlined.Dashboard, contentDescription = null)
                            Text("العودة إلى لوحة التحكم")
                        }
                    }
                }
            }
        }

        item {
            ScreenHeader(
                "عن النظام",
                home?.aboutTitle ?: "لماذا تم تطوير هذه المنصة؟",
                home?.aboutBody ?: "منصة تجمع الإدارة والمتابعة الأكاديمية والتواصل مع الطالب وولي الأمر في مكان واحد.",
            )
        }

        item {
            PublicFeatureCard(
                "01",
                home?.feature1Title ?: "إدارة مركزية",
                home?.feature1Body ?: "تنظيم المستخدمين والحلقات والسكن من خلال نظام موحد.",
            )
        }
        item {
            PublicFeatureCard(
                "02",
                home?.feature2Title ?: "متابعة التقدم",
                home?.feature2Body ?: "توثيق تقدم الحفظ اليومي حسب السورة والآيات والصفحات والفترة.",
            )
        }
        item {
            PublicFeatureCard(
                "03",
                home?.feature3Title ?: "وصول واضح",
                home?.feature3Body ?: "بوابات مخصصة للمدير والمشرف والمعلم والطالب وولي الأمر.",
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
            ) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(home?.calloutTitle ?: "رحلة حفظ أوضح للجميع", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(
                        home?.calloutBody ?: "بيانات موحدة وتقارير مختصرة تساعد المركز على متابعة الطالب واتخاذ القرار بسرعة.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 21.sp,
                    )
                }
            }
        }

        if (!home?.footerPhone.isNullOrBlank() || !home?.footerEmail.isNullOrBlank()) {
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text("التواصل", fontWeight = FontWeight.Bold)
                        home?.footerPhone?.takeIf { it.isNotBlank() }?.let { Text(it) }
                        home?.footerEmail?.takeIf { it.isNotBlank() }?.let { Text(it) }
                    }
                }
            }
        }
    }
}

@Composable
private fun PublicFeatureCard(number: String, title: String, body: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
    ) {
        Row(
            Modifier.padding(17.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Text(number, color = BrandGold, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(body, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 20.sp)
            }
        }
    }
}

@Composable
private fun PublicLibraryScreen(items: List<LibraryItemDto>) {
    val context = LocalContext.current
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("المكتبة", "مراجع ومواد تعليمية", "المواد المرجعية المعتمدة والمتاحة لزوار المركز.") }
        items(items, key = { it.id }) { item ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text(item.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    item.description?.let {
                        Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 20.sp)
                    }
                    Text(item.type, color = MaterialTheme.colorScheme.primary, fontSize = 11.sp)
                    OutlinedButton(
                        onClick = { openPublicUrl(context, item.url) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Outlined.OpenInNew, contentDescription = null)
                        Text("فتح المادة")
                    }
                }
            }
        }
        if (items.isEmpty()) item { EmptyState("لا توجد مواد منشورة حاليًا") }
    }
}

@Composable
private fun PublicMediaScreen(items: List<ActivityDto>) {
    val context = LocalContext.current
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { ScreenHeader("الإعلام والأنشطة", "آخر أخبار المركز وأنشطته", "الإعلانات والفعاليات والأنشطة المنشورة للزوار.") }
        items(items, key = { it.id }) { activity ->
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp)) {
                Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(activity.category, color = MaterialTheme.colorScheme.primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text(activity.title, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    Text(activity.content, lineHeight = 21.sp)
                    val assets = if (activity.assets.isNotEmpty()) {
                        activity.assets
                    } else {
                        emptyList()
                    }
                    assets.forEach { asset ->
                        OutlinedButton(
                            onClick = { openPublicUrl(context, asset.url) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Icon(Icons.Outlined.OpenInNew, contentDescription = null)
                            Text(if (asset.kind == "VIDEO") "فتح الفيديو" else "فتح الصورة")
                        }
                    }
                    activity.imageUrl?.takeIf { assets.isEmpty() }?.let { legacy ->
                        OutlinedButton(
                            onClick = { openPublicUrl(context, legacy) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Icon(Icons.Outlined.OpenInNew, contentDescription = null)
                            Text("فتح الصورة")
                        }
                    }
                    Text(formatDate(activity.createdAt), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                }
            }
        }
        if (items.isEmpty()) item { EmptyState("لا توجد منشورات حاليًا") }
    }
}

@Composable
private fun PublicLoginContent(state: TahfizUiState, viewModel: TahfizViewModel) {
    var loginId by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var showServer by remember { mutableStateOf(false) }
    var serverUrl by remember(state.serverUrl) { mutableStateOf(state.serverUrl) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 26.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Image(
                painter = painterResource(R.drawable.dar_al_nur_logo),
                contentDescription = "شعار دار النور",
                modifier = Modifier.size(86.dp),
            )
        }
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("تسجيل الدخول", fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    "أدخل معرف المستخدم وكلمة المرور للوصول إلى لوحة التحكم المخصصة لدورك.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp,
                    lineHeight = 20.sp,
                )
            }
        }
        item {
            OutlinedTextField(
                value = loginId,
                onValueChange = { loginId = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("معرف المستخدم") },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
            )
        }
        item {
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("كلمة المرور") },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { showPassword = !showPassword }) {
                        Icon(
                            imageVector = if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                            contentDescription = null,
                        )
                    }
                },
            )
        }
        item {
            Button(
                onClick = { viewModel.login(loginId, password) },
                enabled = !state.loading && loginId.isNotBlank() && password.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
            ) {
                Text("دخول", fontWeight = FontWeight.Bold)
            }
        }
        item {
            TextButton(onClick = { showServer = !showServer }) {
                Icon(Icons.Outlined.Settings, contentDescription = null)
                Text(if (showServer) "إخفاء إعدادات الخادم" else "إعدادات الخادم")
            }
        }
        if (showServer) {
            item {
                Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("عنوان خادم النظام", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        OutlinedTextField(
                            value = serverUrl,
                            onValueChange = { serverUrl = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("http://10.0.2.2:4000") },
                            singleLine = true,
                        )
                        OutlinedButton(
                            onClick = { viewModel.setServerUrl(serverUrl) },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("حفظ الخادم") }
                    }
                }
            }
        }
    }
}

private fun resolvePublicUrl(url: String): String {
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    val base = com.tahfiz.progresstracker.data.ApiClient.baseUrl().substringBefore("/api/")
    return base.trimEnd('/') + if (url.startsWith("/")) url else "/$url"
}

private fun openPublicUrl(context: Context, url: String) {
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(resolvePublicUrl(url))))
    }
}
