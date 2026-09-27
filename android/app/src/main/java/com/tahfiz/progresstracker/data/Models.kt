package com.tahfiz.progresstracker.data

// ---------- Authentication / users ----------

data class UserDto(
    val id: String,
    val loginId: String,
    val fullName: String,
    val role: String,
)

data class LoginRequest(val loginId: String, val password: String)
data class LoginResponse(val token: String, val user: UserDto, val dashboardReady: Boolean = true)
data class MeResponse(val user: UserDto, val dashboardReady: Boolean = true)

data class ManagedStudentProfileDto(
    val halaqah: HalaqahSummaryDto? = null,
    val dormitory: DormitoryDto? = null,
    val memorizedAmount: String? = null,
)

data class ManagedUserDto(
    val id: String,
    val loginId: String,
    val fullName: String,
    val role: String,
    val email: String? = null,
    val mobile: String? = null,
    val address: String? = null,
    val age: Int? = null,
    val joinedAt: String? = null,
    val isActive: Boolean = true,
    val createdAt: String? = null,
    val passwordAvailable: Boolean = false,
    val studentProfile: ManagedStudentProfileDto? = null,
)

data class UsersResponse(val users: List<ManagedUserDto>)

data class CreateUserRequest(
    val loginNumber: String,
    val fullName: String,
    val password: String,
    val role: String,
    val halaqahId: String? = null,
    val building: String? = null,
    val room: String? = null,
    val email: String? = null,
    val mobile: String? = null,
    val address: String? = null,
    val age: Int? = null,
    val joinedAt: String? = null,
    val memorizedAmount: String? = null,
)

data class CreateUserResponse(
    val user: ManagedUserDto? = null,
    val message: String,
)

data class UpdateUserRequest(
    val fullName: String? = null,
    val isActive: Boolean? = null,
    val halaqahId: String? = null,
    val building: String? = null,
    val room: String? = null,
    val email: String? = null,
    val mobile: String? = null,
    val address: String? = null,
    val age: Int? = null,
    val joinedAt: String? = null,
    val memorizedAmount: String? = null,
)

data class CredentialResponse(val loginId: String, val password: String)
data class PasswordResetRequest(val password: String)
data class MessageResponse(val message: String)

// ---------- Halaqahs / assignments ----------

data class TeacherDto(
    val id: String,
    val loginId: String? = null,
    val fullName: String,
    val taughtHalaqahs: List<HalaqahSummaryDto> = emptyList(),
)

data class TeachersResponse(val teachers: List<TeacherDto>)

data class HalaqahSummaryDto(
    val id: String,
    val name: String,
)

data class CountDto(val students: Int = 0)

data class HalaqahDto(
    val id: String,
    val name: String,
    val teacherId: String? = null,
    val teacher: TeacherDto? = null,
    val _count: CountDto? = null,
)

data class HalaqahsResponse(val halaqahs: List<HalaqahDto>)
data class CreateHalaqahRequest(val name: String, val teacherId: String? = null)
data class HalaqahMutationResponse(val halaqah: HalaqahDto? = null, val message: String? = null)
data class UpdateHalaqahRequest(val name: String? = null, val teacherId: String? = null)

data class DormitoryDto(val building: String, val room: String)

data class StudentUserDto(
    val id: String,
    val loginId: String,
    val fullName: String,
    val isActive: Boolean = true,
)

data class StudentDto(
    val id: String,
    val memorizedAmount: String? = null,
    val user: StudentUserDto,
    val halaqah: HalaqahDto,
    val dormitory: DormitoryDto? = null,
)

data class StudentsResponse(val students: List<StudentDto>)
data class ChildrenResponse(val children: List<StudentDto>)

data class ParentLinkDto(
    val id: String,
    val createdAt: String? = null,
    val parent: StudentUserDto,
    val student: StudentDto,
)

data class ParentLinksResponse(val links: List<ParentLinkDto>)
data class ParentLinkRequest(val parentUserId: String, val studentUserId: String)
data class ParentLinkMutationResponse(val link: IdDto? = null, val message: String)
data class IdDto(val id: String)

// ---------- Schedule periods ----------

data class PeriodDto(
    val id: String,
    val number: Int,
    val name: String,
    val startTime: String,
    val endTime: String,
)

data class PeriodsResponse(val periods: List<PeriodDto>)
data class PeriodRequest(val number: Int, val name: String, val startTime: String, val endTime: String)
data class PeriodMutationResponse(val period: PeriodDto? = null, val message: String)

// ---------- Progress ----------

data class ProgressStudentDto(
    val id: String,
    val user: StudentUserDto,
    val halaqah: HalaqahDto,
)

data class ProgressTeacherDto(
    val id: String,
    val fullName: String,
    val loginId: String? = null,
)

data class ProgressEntryDto(
    val id: String,
    val attended: Boolean = true,
    val recordType: String? = null,
    val surah: String? = null,
    val verseFrom: Int? = null,
    val endSurah: String? = null,
    val verseTo: Int? = null,
    val matnName: String? = null,
    val matnFrom: String? = null,
    val matnTo: String? = null,
    val pages: Double = 0.0,
    val rating: Int? = null,
    val recordDate: String,
    val note: String? = null,
    val createdAt: String? = null,
    val student: ProgressStudentDto,
    val teacher: ProgressTeacherDto,
    val period: PeriodDto,
)

data class ProgressResponse(val entries: List<ProgressEntryDto>)

data class CreateProgressRequest(
    val studentId: String,
    val periodId: String,
    val attended: Boolean,
    val recordType: String? = null,
    val surah: String? = null,
    val verseFrom: Int? = null,
    val endSurah: String? = null,
    val verseTo: Int? = null,
    val matnName: String? = null,
    val matnFrom: String? = null,
    val matnTo: String? = null,
    val pages: Double = 0.0,
    val rating: Int? = null,
    val recordDate: String,
    val note: String? = null,
)

data class ProgressMutationResponse(
    val entry: ProgressEntryDto? = null,
    val message: String,
)

// ---------- Leaves ----------

data class LeaveRequestDto(
    val id: String,
    val type: String,
    val fromDate: String,
    val toDate: String? = null,
    val reason: String? = null,
    val status: String,
    val reviewNote: String? = null,
    val createdAt: String,
    val requester: UserDto,
    val reviewer: BasicPersonDto? = null,
)

data class BasicPersonDto(
    val id: String,
    val fullName: String,
    val loginId: String? = null,
    val role: String? = null,
)

data class LeavesResponse(val requests: List<LeaveRequestDto>)
data class CreateLeaveRequest(val type: String, val fromDate: String, val toDate: String? = null, val reason: String? = null)
data class LeaveReviewRequest(val status: String, val reviewNote: String? = null)
data class LeaveMutationResponse(val request: LeaveRequestDto? = null, val message: String)

// ---------- Notes / violations ----------

data class NoteViolationDto(
    val id: String,
    val kind: String,
    val context: String,
    val content: String,
    val createdAt: String,
    val subject: UserDto,
    val author: UserDto,
    val halaqah: HalaqahSummaryDto? = null,
)

data class NotesResponse(val notes: List<NoteViolationDto>)
data class CreateNoteRequest(val subjectUserId: String, val kind: String, val content: String)
data class NoteMutationResponse(val note: NoteViolationDto? = null, val message: String)

// ---------- Monthly tests ----------

data class MonthlyTestQuestionDto(
    val id: String? = null,
    val questionNumber: Int,
    val correct: Boolean,
    val surah: String? = null,
    val ayah: Int? = null,
    val referenceText: String? = null,
)

data class TestStudentDto(val id: String, val user: StudentUserDto)

data class MonthlyTestDto(
    val id: String,
    val type: String,
    val matnName: String? = null,
    val score: Int,
    val note: String? = null,
    val testDate: String,
    val createdAt: String? = null,
    val student: TestStudentDto,
    val examiner: BasicPersonDto,
    val halaqah: HalaqahSummaryDto,
    val questions: List<MonthlyTestQuestionDto> = emptyList(),
)

data class MonthlyTestsResponse(val tests: List<MonthlyTestDto>)

data class CreateMonthlyTestRequest(
    val halaqahId: String,
    val studentId: String,
    val type: String,
    val matnName: String? = null,
    val testDate: String,
    val note: String? = null,
    val questions: List<MonthlyTestQuestionDto>,
)

data class MonthlyTestMutationResponse(val test: MonthlyTestDto? = null, val message: String)

// ---------- Notifications ----------

data class NotificationDto(
    val id: String,
    val recipientId: String? = null,
    val senderId: String? = null,
    val title: String,
    val message: String,
    val type: String,
    val eventAt: String? = null,
    val isRead: Boolean = false,
    val createdAt: String,
    val sender: UserDto? = null,
    val recipient: UserDto? = null,
)

data class NotificationsResponse(val notifications: List<NotificationDto>, val unreadCount: Int = 0)
data class CreateNotificationRequest(
    val recipientUserId: String,
    val title: String,
    val message: String,
    val type: String = "TASK",
    val eventAt: String? = null,
)
data class NotificationMutationResponse(val notification: NotificationDto? = null, val message: String)

// ---------- Library / media / home ----------

data class HomeContentDto(
    val id: String? = null,
    val eyebrow: String,
    val heroTitle: String,
    val heroBody: String,
    val aboutTitle: String,
    val aboutBody: String,
    val feature1Title: String,
    val feature1Body: String,
    val feature2Title: String,
    val feature2Body: String,
    val feature3Title: String,
    val feature3Body: String,
    val calloutTitle: String,
    val calloutBody: String,
    val footerPhone: String? = null,
    val footerEmail: String? = null,
    val footerInstagram: String? = null,
    val footerFacebook: String? = null,
)

data class HomeResponse(val home: HomeContentDto, val message: String? = null)

data class LibraryItemDto(
    val id: String,
    val title: String,
    val description: String? = null,
    val type: String,
    val url: String,
    val published: Boolean = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

data class LibraryResponse(val items: List<LibraryItemDto>)
data class LibraryItemRequest(
    val title: String,
    val description: String? = null,
    val type: String = "PDF",
    val url: String,
    val published: Boolean = true,
)
data class LibraryMutationResponse(val item: LibraryItemDto? = null, val message: String)

data class UploadedFileDto(
    val url: String,
    val fileName: String,
    val mimeType: String,
    val type: String,
)
data class LibraryUploadResponse(val file: UploadedFileDto, val message: String)

data class MediaAssetDto(
    val id: String,
    val kind: String,
    val mimeType: String,
    val fileName: String,
    val url: String,
    val sortOrder: Int = 0,
    val createdAt: String? = null,
)

data class ActivityDto(
    val id: String,
    val title: String,
    val content: String,
    val category: String,
    val imageUrl: String? = null,
    val published: Boolean = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val author: BasicPersonDto? = null,
    val assets: List<MediaAssetDto> = emptyList(),
)

data class ActivitiesResponse(val activities: List<ActivityDto>)
data class ActivityRequest(
    val title: String,
    val content: String,
    val category: String = "نشاط",
    val imageUrl: String? = null,
    val published: Boolean = true,
)
data class ActivityMutationResponse(val activity: ActivityDto? = null, val message: String)
data class AssetUploadResponse(val asset: MediaAssetDto, val message: String)

// ---------- Standard reports ----------

data class ReportStudentUserDto(
    val id: String,
    val loginId: String,
    val fullName: String,
    val email: String? = null,
    val mobile: String? = null,
    val age: Int? = null,
    val joinedAt: String? = null,
    val isActive: Boolean = true,
)

data class ReportStudentDto(
    val id: String,
    val memorizedAmount: String? = null,
    val user: ReportStudentUserDto,
    val halaqah: HalaqahDto,
    val dormitory: DormitoryDto? = null,
)

data class ReportStudentsResponse(val students: List<ReportStudentDto>)

data class RecordTypeSummaryDto(
    val count: Int = 0,
    val averageRating: Double = 0.0,
    val pages: Double = 0.0,
)

data class ReportSummaryDto(
    val sessions: Int = 0,
    val attended: Int = 0,
    val absent: Int = 0,
    val attendanceRate: Double = 0.0,
    val totalPages: Double = 0.0,
    val averageRating: Double = 0.0,
    val tests: Int = 0,
    val averageTestScore: Double = 0.0,
    val latestTestScore: Int? = null,
    val recordTypes: Map<String, RecordTypeSummaryDto> = emptyMap(),
)

data class TrendMetricDto(
    val current: Double = 0.0,
    val previous: Double = 0.0,
    val direction: String = "NO_DATA",
)

data class ReportTrendDto(
    val rating: TrendMetricDto,
    val tests: TrendMetricDto,
)

data class ReportPeriodDto(
    val from: String,
    val to: String,
    val previousFrom: String? = null,
    val previousTo: String? = null,
)

data class StudentPerformanceReportDto(
    val student: ReportStudentDto,
    val period: ReportPeriodDto,
    val summary: ReportSummaryDto,
    val trend: ReportTrendDto,
    val progress: List<ProgressEntryDto> = emptyList(),
    val tests: List<MonthlyTestDto> = emptyList(),
)

data class StudentReportResponse(val report: StudentPerformanceReportDto)

// ---------- AI ----------

data class AiStatusResponse(
    val configured: Boolean,
    val connected: Boolean? = null,
    val model: String,
    val provider: String? = null,
    val baseUrl: String? = null,
)

data class AiStudentProfileDto(
    val id: String,
    val memorizedAmount: String? = null,
    val halaqah: HalaqahSummaryDto,
)

data class AiPersonDto(
    val id: String,
    val loginId: String,
    val fullName: String,
    val role: String,
    val studentProfile: AiStudentProfileDto? = null,
)

data class AiPeopleResponse(val people: List<AiPersonDto>)

data class AiTrajectoryDto(
    val label: String,
    val explanation: String,
)

data class AiRecommendationDto(
    val title: String,
    val reason: String,
    val priority: String,
)

data class AiAnalysisDto(
    val title: String,
    val summary: String,
    val trajectory: AiTrajectoryDto,
    val recommendations: List<AiRecommendationDto> = emptyList(),
    val evidence: List<String> = emptyList(),
    val limitations: List<String> = emptyList(),
    val answer: String = "",
)

data class AiAnalyzeRequest(
    val userId: String,
    val from: String? = null,
    val to: String? = null,
    val audience: String = "ADMIN",
    val question: String? = null,
    val previousAnswers: List<String> = emptyList(),
)

data class AiAnalysisResponse(
    val analysis: AiAnalysisDto,
    val subject: UserDto,
    val period: ReportPeriodDto,
    val audience: String,
    val model: String,
    val provider: String? = null,
)

// ---------- Admin Halaqah report ----------

data class HalaqahReportSummaryDto(
    val students: Int,
    val progressRecords: Int,
    val attended: Int,
    val absent: Int,
    val averageRating: Double,
    val monthlyTests: Int,
    val averageTestScore: Double,
)

data class HalaqahReportHalaqahDto(
    val id: String,
    val name: String,
    val teacher: BasicPersonDto? = null,
    val students: List<ReportStudentDto> = emptyList(),
)

data class HalaqahReportDto(
    val halaqah: HalaqahReportHalaqahDto,
    val summary: HalaqahReportSummaryDto,
    val progress: List<ProgressEntryDto> = emptyList(),
    val tests: List<MonthlyTestDto> = emptyList(),
)

data class HalaqahReportResponse(val report: HalaqahReportDto)

// Error envelope returned by the backend.
data class ApiErrorEnvelope(val error: ApiErrorBody? = null)
data class ApiErrorBody(val message: String? = null)
