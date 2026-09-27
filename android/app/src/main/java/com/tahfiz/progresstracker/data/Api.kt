package com.tahfiz.progresstracker.data

import com.tahfiz.progresstracker.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ProgressTrackerApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("auth/me")
    suspend fun me(): MeResponse

    @GET("admin/users")
    suspend fun users(): UsersResponse

    @GET("progress/students")
    suspend fun students(): StudentsResponse

    @GET("progress/children")
    suspend fun children(): ChildrenResponse

    @GET("management/periods")
    suspend fun periods(): PeriodsResponse

    @GET("progress")
    suspend fun progress(): ProgressResponse

    @POST("progress")
    suspend fun createProgress(@Body request: CreateProgressRequest): ProgressMutationResponse
}

object ApiClient {
    @Volatile
    private var token: String? = null

    fun setToken(value: String?) {
        token = value
    }

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
        .build()

    val api: ProgressTrackerApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ProgressTrackerApi::class.java)
}
