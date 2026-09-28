package com.tahfiz.progresstracker.data

import com.google.gson.Gson
import com.tahfiz.progresstracker.BuildConfig
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.RequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.concurrent.TimeUnit

interface ProgressTrackerApi {
    // Authentication
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("auth/me")
    suspend fun me(): MeResponse

    // Users / Halaqahs
    @GET("admin/users")
    suspend fun users(): UsersResponse

    @POST("admin/users")
    suspend fun createUser(@Body request: CreateUserRequest): CreateUserResponse

    @PATCH("management/users/{id}")
    suspend fun updateUser(@Path("id") id: String, @Body request: UpdateUserRequest): MessageResponse

    @DELETE("admin/users/{id}")
    suspend fun deleteUser(@Path("id") id: String): MessageResponse

    @GET("admin/users/{id}/credential")
    suspend fun credential(@Path("id") id: String): CredentialResponse

    @PATCH("admin/users/{id}/password")
    suspend fun resetPassword(@Path("id") id: String, @Body request: PasswordResetRequest): MessageResponse

    @GET("admin/halaqahs")
    suspend fun halaqahs(): HalaqahsResponse

    @POST("admin/halaqahs")
    suspend fun createHalaqah(@Body request: CreateHalaqahRequest): HalaqahMutationResponse

    @PATCH("management/halaqahs/{id}")
    suspend fun updateHalaqah(@Path("id") id: String, @Body request: UpdateHalaqahRequest): HalaqahMutationResponse

    @DELETE("management/halaqahs/{id}")
    suspend fun deleteHalaqah(@Path("id") id: String): MessageResponse

    @GET("management/teachers")
    suspend fun teachers(): TeachersResponse

    // Parent links
    @GET("management/parent-links")
    suspend fun parentLinks(): ParentLinksResponse

    @POST("management/parent-links")
    suspend fun createParentLink(@Body request: ParentLinkRequest): ParentLinkMutationResponse

    @DELETE("management/parent-links/{id}")
    suspend fun deleteParentLink(@Path("id") id: String): MessageResponse

    // Periods
    @GET("management/periods")
    suspend fun periods(): PeriodsResponse

    @POST("management/periods")
    suspend fun createPeriod(@Body request: PeriodRequest): PeriodMutationResponse

    @PATCH("management/periods/{id}")
    suspend fun updatePeriod(@Path("id") id: String, @Body request: PeriodRequest): PeriodMutationResponse

    @DELETE("management/periods/{id}")
    suspend fun deletePeriod(@Path("id") id: String): MessageResponse

    // Progress
    @GET("progress/students")
    suspend fun students(): StudentsResponse

    @GET("progress/children")
    suspend fun children(): ChildrenResponse

    @GET("progress")
    suspend fun progress(): ProgressResponse

    @POST("progress")
    suspend fun createProgress(@Body request: CreateProgressRequest): ProgressMutationResponse

    @PATCH("progress/{id}")
    suspend fun updateProgress(@Path("id") id: String, @Body request: CreateProgressRequest): ProgressMutationResponse

    @DELETE("progress/{id}")
    suspend fun deleteProgress(@Path("id") id: String): MessageResponse

    // Leaves
    @GET("operations/leaves")
    suspend fun leaves(): LeavesResponse

    @POST("operations/leaves")
    suspend fun createLeave(@Body request: CreateLeaveRequest): LeaveMutationResponse

    @PATCH("operations/leaves/{id}/review")
    suspend fun reviewLeave(@Path("id") id: String, @Body request: LeaveReviewRequest): LeaveMutationResponse

    // Notes / violations
    @GET("operations/notes")
    suspend fun notes(): NotesResponse

    @POST("operations/notes")
    suspend fun createNote(@Body request: CreateNoteRequest): NoteMutationResponse

    // Monthly tests
    @GET("operations/monthly-tests")
    suspend fun monthlyTests(): MonthlyTestsResponse

    @POST("operations/monthly-tests")
    suspend fun createMonthlyTest(@Body request: CreateMonthlyTestRequest): MonthlyTestMutationResponse

    @GET("operations/halaqah-reports/{id}")
    suspend fun halaqahReport(@Path("id") id: String): HalaqahReportResponse

    // Notifications
    @GET("notifications")
    suspend fun notifications(): NotificationsResponse

    @POST("notifications")
    suspend fun createNotification(@Body request: CreateNotificationRequest): NotificationMutationResponse

    @PATCH("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): NotificationMutationResponse

    @PATCH("notifications/read-all")
    suspend fun markAllNotificationsRead(): MessageResponse

    // Home / library / media
    @GET("content/home")
    suspend fun home(): HomeResponse

    @PUT("content/home")
    suspend fun updateHome(@Body request: HomeContentDto): HomeResponse

    @GET("content/library")
    suspend fun publicLibrary(): LibraryResponse

    @GET("content/library/manage")
    suspend fun managedLibrary(): LibraryResponse

    @POST("content/library")
    suspend fun createLibraryItem(@Body request: LibraryItemRequest): LibraryMutationResponse

    @PATCH("content/library/{id}")
    suspend fun updateLibraryItem(@Path("id") id: String, @Body request: LibraryItemRequest): LibraryMutationResponse

    @DELETE("content/library/{id}")
    suspend fun deleteLibraryItem(@Path("id") id: String): MessageResponse

    @POST("content/library/upload")
    suspend fun uploadLibraryFile(
        @Header("Content-Type") contentType: String,
        @Header("X-File-Name") fileName: String,
        @Body body: RequestBody,
    ): LibraryUploadResponse

    @GET("content/media")
    suspend fun publicMedia(): ActivitiesResponse

    @GET("content/media/manage")
    suspend fun managedMedia(): ActivitiesResponse

    @POST("content/media")
    suspend fun createActivity(@Body request: ActivityRequest): ActivityMutationResponse

    @PATCH("content/media/{id}")
    suspend fun updateActivity(@Path("id") id: String, @Body request: ActivityRequest): ActivityMutationResponse

    @DELETE("content/media/{id}")
    suspend fun deleteActivity(@Path("id") id: String): MessageResponse

    @POST("content/media/{id}/assets")
    suspend fun uploadActivityAsset(
        @Path("id") activityId: String,
        @Header("Content-Type") contentType: String,
        @Header("X-File-Name") fileName: String,
        @Body body: RequestBody,
    ): AssetUploadResponse

    @DELETE("content/media/{id}/assets/{assetId}")
    suspend fun deleteActivityAsset(@Path("id") activityId: String, @Path("assetId") assetId: String): MessageResponse

    // Standard reports
    @GET("reports/students")
    suspend fun reportStudents(): ReportStudentsResponse

    @GET("reports/students/{id}")
    suspend fun studentReport(
        @Path("id") id: String,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
    ): StudentReportResponse

    // Admin-only local AI
    @GET("ai/status")
    suspend fun aiStatus(): AiStatusResponse

    @GET("ai/people")
    suspend fun aiPeople(): AiPeopleResponse

    @POST("ai/analyze")
    suspend fun analyzePerson(@Body request: AiAnalyzeRequest): AiAnalysisResponse
}

object ApiClient {
    private val gson = Gson()

    @Volatile
    private var token: String? = null

    @Volatile
    private var configuredBaseUrl: String = normalizeBaseUrl(BuildConfig.API_BASE_URL)

    private val authInterceptor = Interceptor { chain ->
        val request = chain.request().newBuilder().apply {
            token?.let { header("Authorization", "Bearer $it") }
            header("Accept", "application/json")
        }.build()
        chain.proceed(request)
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
            },
        )
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(150, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    @Volatile
    private var service: ProgressTrackerApi = buildService(configuredBaseUrl)

    val api: ProgressTrackerApi
        get() = service

    fun setToken(value: String?) {
        token = value
    }

    @Synchronized
    fun configure(baseUrl: String) {
        val normalized = normalizeBaseUrl(baseUrl)
        if (normalized != configuredBaseUrl) {
            configuredBaseUrl = normalized
            service = buildService(normalized)
        }
    }

    fun baseUrl(): String = configuredBaseUrl

    fun requestBody(bytes: ByteArray, mimeType: String): RequestBody =
        RequestBody.create(mimeType.toMediaType(), bytes)

    fun encodedFileName(name: String): String =
        URLEncoder.encode(name, StandardCharsets.UTF_8.toString()).replace("+", "%20")

    fun friendlyError(throwable: Throwable, fallback: String): String {
        if (throwable is HttpException) {
            val body = throwable.response()?.errorBody()?.string()
            if (!body.isNullOrBlank()) {
                runCatching { gson.fromJson(body, ApiErrorEnvelope::class.java) }
                    .getOrNull()
                    ?.error
                    ?.message
                    ?.takeIf { it.isNotBlank() }
                    ?.let { return it }
            }
        }
        return throwable.message?.takeIf { it.isNotBlank() } ?: fallback
    }

    private fun buildService(baseUrl: String): ProgressTrackerApi =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(ProgressTrackerApi::class.java)

    private fun normalizeBaseUrl(value: String): String {
        var url = value.trim()
        if (url.isBlank()) url = BuildConfig.API_BASE_URL
        if (!url.startsWith("http://") && !url.startsWith("https://")) url = "http://$url"
        url = url.trimEnd('/')
        if (!url.endsWith("/api")) url += "/api"
        return "$url/"
    }
}
