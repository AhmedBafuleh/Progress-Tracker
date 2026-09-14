package com.tahfiz.progresstracker.data

data class UserDto(
    val id: String,
    val loginId: String,
    val fullName: String,
    val role: String,
)

data class LoginRequest(val loginId: String, val password: String)
data class LoginResponse(val token: String, val user: UserDto, val dashboardReady: Boolean = true)
data class MeResponse(val user: UserDto, val dashboardReady: Boolean = true)

data class ManagedUserDto(
    val id: String,
    val loginId: String,
    val fullName: String,
    val role: String,
    val isActive: Boolean,
)

data class UsersResponse(val users: List<ManagedUserDto>)

data class TeacherDto(val id: String, val fullName: String)

data class HalaqahDto(
    val id: String,
    val name: String,
    val teacher: TeacherDto? = null,
)

data class StudentUserDto(
    val id: String,
    val loginId: String,
    val fullName: String,
)

data class DormitoryDto(val building: String, val room: String)

data class StudentDto(
    val id: String,
    val user: StudentUserDto,
    val halaqah: HalaqahDto,
    val dormitory: DormitoryDto? = null,
)

data class StudentsResponse(val students: List<StudentDto>)
data class ChildrenResponse(val children: List<StudentDto>)

data class PeriodDto(
    val id: String,
    val number: Int,
    val name: String,
    val startTime: String,
    val endTime: String,
)

data class PeriodsResponse(val periods: List<PeriodDto>)

data class ProgressStudentDto(
    val id: String,
    val user: StudentUserDto,
    val halaqah: HalaqahDto,
)

data class ProgressTeacherDto(
    val id: String,
    val fullName: String,
    val loginId: String,
)

data class ProgressEntryDto(
    val id: String,
    val surah: String,
    val verseFrom: Int,
    val verseTo: Int,
    val pages: Double,
    val rating: Int,
    val recordDate: String,
    val note: String? = null,
    val student: ProgressStudentDto,
    val teacher: ProgressTeacherDto,
    val period: PeriodDto,
)

data class ProgressResponse(val entries: List<ProgressEntryDto>)

data class CreateProgressRequest(
    val studentId: String,
    val periodId: String,
    val surah: String,
    val verseFrom: Int,
    val verseTo: Int,
    val pages: Double,
    val rating: Int,
    val recordDate: String,
    val note: String? = null,
)

data class ProgressMutationResponse(
    val entry: ProgressEntryDto? = null,
    val message: String,
)
