package com.tahfiz.progresstracker

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch

@Composable
fun TahfizApp(viewModel: TahfizViewModel = viewModel()) {
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var publicMode by remember { mutableStateOf(false) }
    var publicPage by remember { mutableStateOf(PublicPage.HOME) }

    LaunchedEffect(state.error, state.message) {
        val text = state.error ?: state.message
        if (!text.isNullOrBlank()) {
            snackbarHostState.showSnackbar(text)
            viewModel.clearFeedback()
        }
    }

    LaunchedEffect(state.user?.id) {
        if (state.user != null && publicPage == PublicPage.LOGIN) {
            publicMode = false
            publicPage = PublicPage.HOME
        }
        if (state.user == null) {
            publicMode = false
            if (publicPage != PublicPage.LOGIN) publicPage = PublicPage.HOME
        }
    }

    MaterialTheme(colorScheme = TahfizColors) {
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                if (state.user == null || publicMode) {
                    PublicSiteApp(
                        state = state,
                        viewModel = viewModel,
                        page = publicPage,
                        onPageChange = { publicPage = it },
                        onOpenDashboard = {
                            if (state.user != null) {
                                publicMode = false
                                publicPage = PublicPage.HOME
                            }
                        },
                        snackbarHostState = snackbarHostState,
                    )
                } else {
                    AuthenticatedApp(
                        state = state,
                        viewModel = viewModel,
                        snackbarHostState = snackbarHostState,
                        onOpenPublicSite = {
                            publicPage = PublicPage.HOME
                            publicMode = true
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun LoginScreen(
    state: TahfizUiState,
    snackbarHostState: SnackbarHostState,
    onLogin: (String, String) -> Unit,
    onServerUrlChanged: (String) -> Unit,
) {
    var loginId by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var showServer by remember { mutableStateOf(false) }
    var serverUrl by remember(state.serverUrl) { mutableStateOf(state.serverUrl) }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 22.dp, vertical = 28.dp),
            contentAlignment = Alignment.Center,
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(30.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 5.dp),
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 28.dp),
                    verticalArrangement = Arrangement.spacedBy(15.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box(
                        modifier = Modifier
                            .size(86.dp)
                            .clip(CircleShape)
                            .background(Color.Transparent),
                        contentAlignment = Alignment.Center,
                    ) {
                        Image(
                            painter = painterResource(R.drawable.dar_al_nur_logo),
                            contentDescription = "شعار دار النور",
                            modifier = Modifier.size(82.dp),
                            contentScale = ContentScale.Fit,
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("دار النور لتعليم القرآن الكريم", fontSize = 23.sp, fontWeight = FontWeight.ExtraBold)
                        Text(
                            "نظام المتابعة والإدارة",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp,
                        )
                    }

                    Spacer(Modifier.height(2.dp))

                    OutlinedTextField(
                        value = loginId,
                        onValueChange = { loginId = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("معرف المستخدم") },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                    )

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
                                    contentDescription = if (showPassword) "إخفاء كلمة المرور" else "إظهار كلمة المرور",
                                )
                            }
                        },
                    )

                    Button(
                        onClick = { onLogin(loginId, password) },
                        enabled = !state.loading,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        if (state.loading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        } else {
                            Text("تسجيل الدخول", fontWeight = FontWeight.Bold)
                        }
                    }

                    TextButton(onClick = { showServer = !showServer }) {
                        Icon(Icons.Outlined.Settings, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.size(6.dp))
                        Text(if (showServer) "إخفاء إعدادات الخادم" else "إعدادات الخادم")
                    }

                    if (showServer) {
                        Divider()
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(9.dp),
                        ) {
                            Text(
                                "عنوان خادم النظام",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                            )
                            OutlinedTextField(
                                value = serverUrl,
                                onValueChange = { serverUrl = it },
                                modifier = Modifier.fillMaxWidth(),
                                placeholder = { Text("http://192.168.1.10:4000") },
                                singleLine = true,
                                shape = RoundedCornerShape(14.dp),
                            )
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                OutlinedButton(
                                    onClick = { onServerUrlChanged(serverUrl) },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(14.dp),
                                ) { Text("حفظ") }
                                Text(
                                    "المحاكي: 10.0.2.2",
                                    modifier = Modifier.align(Alignment.CenterVertically),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontSize = 11.sp,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AuthenticatedApp(
    state: TahfizUiState,
    viewModel: TahfizViewModel,
    snackbarHostState: SnackbarHostState,
    onOpenPublicSite: () -> Unit,
) {
    val user = state.user ?: return
    val sections = remember(user.role) { sectionsForRole(user.role) }
    var selected by remember(user.role) { mutableStateOf(sections.first()) }
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = true,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = BrandPurpleDeep,
                drawerContentColor = Color.White,
                modifier = Modifier.fillMaxHeight(),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 22.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                onOpenPublicSite()
                                scope.launch { drawerState.close() }
                            },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Image(
                            painter = painterResource(R.drawable.dar_al_nur_logo),
                            contentDescription = null,
                            modifier = Modifier.size(54.dp),
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text("دار النور", fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
                            Text("نظام المتابعة", color = Color.White.copy(alpha = .72f), fontSize = 12.sp)
                        }
                        IconButton(onClick = { scope.launch { drawerState.close() } }) {
                            Icon(Icons.Outlined.Close, contentDescription = "إغلاق", tint = Color.White)
                        }
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = .08f)),
                        shape = RoundedCornerShape(18.dp),
                    ) {
                        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(user.fullName, fontWeight = FontWeight.Bold)
                            Text(roleLabel(user.role), color = Color.White.copy(alpha = .72f), fontSize = 12.sp)
                            Text(user.loginId, color = BrandGold, fontSize = 11.sp)
                        }
                    }

                    Spacer(Modifier.height(4.dp))

                    NavigationDrawerItem(
                        label = { Text("الموقع العام", fontWeight = FontWeight.SemiBold) },
                        icon = { Icon(Icons.Outlined.Home, contentDescription = null) },
                        selected = false,
                        onClick = {
                            onOpenPublicSite()
                            scope.launch { drawerState.close() }
                        },
                        colors = NavigationDrawerItemDefaults.colors(
                            unselectedContainerColor = Color.White.copy(alpha = .06f),
                            unselectedIconColor = BrandGold,
                            unselectedTextColor = Color.White,
                        ),
                        shape = RoundedCornerShape(14.dp),
                    )

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        contentPadding = PaddingValues(vertical = 4.dp),
                    ) {
                        items(sections, key = { it.name }) { section ->
                            NavigationDrawerItem(
                                label = { Text(section.label, fontWeight = if (selected == section) FontWeight.Bold else FontWeight.Medium) },
                                icon = { Icon(section.icon, contentDescription = null) },
                                selected = selected == section,
                                onClick = {
                                    selected = section
                                    scope.launch { drawerState.close() }
                                },
                                colors = NavigationDrawerItemDefaults.colors(
                                    selectedContainerColor = BrandPurple.copy(alpha = .9f),
                                    selectedIconColor = Color.White,
                                    selectedTextColor = Color.White,
                                    unselectedContainerColor = Color.Transparent,
                                    unselectedIconColor = Color.White.copy(alpha = .72f),
                                    unselectedTextColor = Color.White.copy(alpha = .82f),
                                ),
                                shape = RoundedCornerShape(14.dp),
                            )
                        }
                    }

                    Divider(color = Color.White.copy(alpha = .12f))
                    NavigationDrawerItem(
                        label = { Text("تسجيل الخروج") },
                        icon = { Icon(Icons.Outlined.Logout, contentDescription = null) },
                        selected = false,
                        onClick = viewModel::logout,
                        colors = NavigationDrawerItemDefaults.colors(
                            unselectedContainerColor = Color.Transparent,
                            unselectedIconColor = Color.White,
                            unselectedTextColor = Color.White,
                        ),
                    )
                }
            }
        },
    ) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Outlined.Menu, contentDescription = "القائمة")
                        }
                    },
                    title = {
                        Column {
                            Text(selected.label, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                user.fullName,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 11.sp,
                            )
                        }
                    },
                    actions = {
                        if (user.role == "STUDENT" && state.unreadCount > 0) {
                            BadgedBox(
                                badge = { Badge { Text(if (state.unreadCount > 99) "99+" else state.unreadCount.toString()) } },
                            ) {
                                IconButton(onClick = { selected = MobileSection.NOTIFICATIONS }) {
                                    Icon(MobileSection.NOTIFICATIONS.icon, contentDescription = "الإشعارات")
                                }
                            }
                        }
                        IconButton(onClick = viewModel::refresh) {
                            Icon(Icons.Outlined.Refresh, contentDescription = "تحديث")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                )
            },
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                SectionContent(section = selected, state = state, viewModel = viewModel)
                if (state.loading) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.background.copy(alpha = .62f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 5.dp),
                        ) {
                            Row(
                                Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                                Text("جارٍ تحميل البيانات...")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionContent(
    section: MobileSection,
    state: TahfizUiState,
    viewModel: TahfizViewModel,
) {
    when (section) {
        MobileSection.OVERVIEW -> OverviewScreen(state)
        MobileSection.USERS -> UsersScreen(state, viewModel)
        MobileSection.HALAQAHS -> HalaqahsScreen(state, viewModel)
        MobileSection.PARENT_LINKS -> ParentLinksScreen(state, viewModel)
        MobileSection.RECORD -> ProgressRecorderScreen(state, viewModel)
        MobileSection.STUDENTS -> StudentsScreen(state)
        MobileSection.HISTORY -> ProgressHistoryScreen(state, viewModel)
        MobileSection.TESTS -> MonthlyTestsScreen(state, viewModel)
        MobileSection.NOTES -> NotesScreen(state, viewModel)
        MobileSection.LEAVES -> LeavesScreen(state, viewModel)
        MobileSection.NOTIFICATIONS -> NotificationsScreen(state, viewModel)
        MobileSection.LIBRARY -> LibraryScreen(state, viewModel)
        MobileSection.MEDIA -> MediaScreen(state, viewModel)
        MobileSection.HOME_EDITOR -> HomeEditorScreen(state, viewModel)
        MobileSection.PERIODS -> PeriodsScreen(state, viewModel)
        MobileSection.REPORTS -> ReportsScreen(state, viewModel)
        MobileSection.AI -> AiAssistantScreen(state, viewModel)
        MobileSection.CHILDREN -> ChildrenScreen(state)
    }
}
