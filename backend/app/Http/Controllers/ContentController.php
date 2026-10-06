<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityAsset;
use App\Models\HomePageContent;
use App\Models\LibraryItem;
use App\Support\ApiPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ContentController extends Controller
{
    public function home(): JsonResponse
    {
        $home = HomePageContent::query()->find('home');

        return response()->json(['home' => $home ? $this->homeData($home) : null]);
    }

    public function publicLibrary(): JsonResponse
    {
        $items = LibraryItem::query()->where('published', true)->latest()->get();
        return response()->json(['items' => $items->map(fn ($item) => ApiPresenter::library($item))->values()]);
    }

    public function publicMedia(): JsonResponse
    {
        $activities = Activity::query()->where('published', true)->with(['author', 'assets'])->latest()->get();
        return response()->json(['activities' => $activities->map(fn ($a) => ApiPresenter::activity($a))->values()]);
    }

    public function managedLibrary(): JsonResponse
    {
        $items = LibraryItem::query()->latest()->get();
        return response()->json(['items' => $items->map(fn ($item) => ApiPresenter::library($item))->values()]);
    }

    public function managedMedia(): JsonResponse
    {
        $activities = Activity::query()->with(['author', 'assets'])->latest()->get();
        return response()->json(['activities' => $activities->map(fn ($a) => ApiPresenter::activity($a))->values()]);
    }

    public function updateHome(Request $request): JsonResponse
    {
        $data = $request->validate([
            'eyebrow' => ['required','string','max:255'],
            'heroTitle' => ['required','string','max:255'],
            'heroBody' => ['required','string','max:5000'],
            'aboutTitle' => ['required','string','max:255'],
            'aboutBody' => ['required','string','max:5000'],
            'feature1Title' => ['required','string','max:255'],
            'feature1Body' => ['required','string','max:5000'],
            'feature2Title' => ['required','string','max:255'],
            'feature2Body' => ['required','string','max:5000'],
            'feature3Title' => ['required','string','max:255'],
            'feature3Body' => ['required','string','max:5000'],
            'calloutTitle' => ['required','string','max:255'],
            'calloutBody' => ['required','string','max:5000'],
            'footerPhone' => ['nullable','string','max:100'],
            'footerEmail' => ['nullable','email','max:191'],
            'footerInstagram' => ['nullable','string','max:255'],
            'footerFacebook' => ['nullable','string','max:255'],
        ]);

        $home = HomePageContent::query()->updateOrCreate(['id' => 'home'], [
            'eyebrow' => $data['eyebrow'],
            'hero_title' => $data['heroTitle'],
            'hero_body' => $data['heroBody'],
            'about_title' => $data['aboutTitle'],
            'about_body' => $data['aboutBody'],
            'feature1_title' => $data['feature1Title'],
            'feature1_body' => $data['feature1Body'],
            'feature2_title' => $data['feature2Title'],
            'feature2_body' => $data['feature2Body'],
            'feature3_title' => $data['feature3Title'],
            'feature3_body' => $data['feature3Body'],
            'callout_title' => $data['calloutTitle'],
            'callout_body' => $data['calloutBody'],
            'footer_phone' => $data['footerPhone'] ?? null,
            'footer_email' => $data['footerEmail'] ?? null,
            'footer_instagram' => $data['footerInstagram'] ?? null,
            'footer_facebook' => $data['footerFacebook'] ?? null,
        ]);

        return response()->json(['home' => $this->homeData($home), 'message' => 'تم تحديث الصفحة الرئيسية']);
    }

    public function uploadLibrary(Request $request): JsonResponse
    {
        $file = $this->storeRawUpload($request, 'library', 25 * 1024 * 1024, [
            'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        ]);

        $type = $file['mimeType'] === 'application/pdf' ? 'PDF' : 'IMAGE';

        return response()->json(['file' => $file + ['type' => $type], 'message' => 'تم رفع الملف'], 201);
    }

    public function storeLibrary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required','string','max:191'],
            'description' => ['nullable','string','max:5000'],
            'type' => ['nullable','string','max:32'],
            'url' => ['required','string','max:500'],
            'coverUrl' => ['nullable','string','max:500'],
            'published' => ['sometimes','boolean'],
        ]);

        $item = LibraryItem::query()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'] ?? 'PDF',
            'url' => $data['url'],
            'cover_url' => $data['coverUrl'] ?? null,
            'published' => $data['published'] ?? true,
        ]);

        return response()->json(['item' => ApiPresenter::library($item), 'message' => 'تمت إضافة مادة المكتبة'], 201);
    }

    public function updateLibrary(Request $request, LibraryItem $item): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes','string','max:191'],
            'description' => ['sometimes','nullable','string','max:5000'],
            'type' => ['sometimes','string','max:32'],
            'url' => ['sometimes','string','max:500'],
            'coverUrl' => ['sometimes','nullable','string','max:500'],
            'published' => ['sometimes','boolean'],
        ]);

        $item->fill([
            'title' => $data['title'] ?? $item->title,
            'description' => array_key_exists('description', $data) ? $data['description'] : $item->description,
            'type' => $data['type'] ?? $item->type,
            'url' => $data['url'] ?? $item->url,
            'cover_url' => array_key_exists('coverUrl', $data) ? $data['coverUrl'] : $item->cover_url,
            'published' => array_key_exists('published', $data) ? $data['published'] : $item->published,
        ])->save();

        return response()->json(['item' => ApiPresenter::library($item->fresh()), 'message' => 'تم تحديث مادة المكتبة']);
    }

    public function destroyLibrary(LibraryItem $item): JsonResponse
    {
        $this->deletePublicUrl($item->url);
        if ($item->cover_url) $this->deletePublicUrl($item->cover_url);
        $item->delete();

        return response()->json(['message' => 'تم حذف مادة المكتبة']);
    }

    public function storeActivity(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required','string','max:191'],
            'content' => ['required','string','max:10000'],
            'category' => ['nullable','string','max:100'],
            'imageUrl' => ['nullable','string','max:500'],
            'published' => ['sometimes','boolean'],
        ]);

        $activity = Activity::query()->create([
            'title' => $data['title'],
            'content' => $data['content'],
            'category' => $data['category'] ?? 'نشاط',
            'image_url' => $data['imageUrl'] ?? null,
            'author_id' => $request->user()->id,
            'published' => $data['published'] ?? true,
        ])->load(['author','assets']);

        return response()->json(['activity' => ApiPresenter::activity($activity), 'message' => 'تم إنشاء المنشور'], 201);
    }

    public function updateActivity(Request $request, Activity $activity): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes','string','max:191'],
            'content' => ['sometimes','string','max:10000'],
            'category' => ['sometimes','string','max:100'],
            'imageUrl' => ['sometimes','nullable','string','max:500'],
            'published' => ['sometimes','boolean'],
        ]);

        $activity->fill([
            'title' => $data['title'] ?? $activity->title,
            'content' => $data['content'] ?? $activity->content,
            'category' => $data['category'] ?? $activity->category,
            'image_url' => array_key_exists('imageUrl', $data) ? $data['imageUrl'] : $activity->image_url,
            'published' => array_key_exists('published', $data) ? $data['published'] : $activity->published,
        ])->save();

        return response()->json([
            'activity' => ApiPresenter::activity($activity->fresh()->load(['author','assets'])),
            'message' => 'تم تحديث المنشور',
        ]);
    }

    public function uploadActivityAsset(Request $request, Activity $activity): JsonResponse
    {
        $file = $this->storeRawUpload($request, 'media', 100 * 1024 * 1024, [
            'image/jpeg','image/png','image/webp','image/gif',
            'video/mp4','video/webm','video/quicktime',
        ]);

        $asset = ActivityAsset::query()->create([
            'activity_id' => $activity->id,
            'kind' => str_starts_with($file['mimeType'], 'video/') ? 'VIDEO' : 'IMAGE',
            'mime_type' => $file['mimeType'],
            'file_name' => $file['fileName'],
            'url' => $file['url'],
            'sort_order' => ((int) $activity->assets()->max('sort_order')) + 1,
        ]);

        return response()->json(['asset' => ApiPresenter::asset($asset), 'message' => 'تم رفع الملف'], 201);
    }

    public function destroyActivityAsset(Activity $activity, ActivityAsset $asset): JsonResponse
    {
        abort_unless($asset->activity_id === $activity->id, 404);
        $this->deletePublicUrl($asset->url);
        $asset->delete();

        return response()->json(['message' => 'تم حذف الملف']);
    }

    public function destroyActivity(Activity $activity): JsonResponse
    {
        $activity->load('assets');
        foreach ($activity->assets as $asset) $this->deletePublicUrl($asset->url);
        $activity->delete();

        return response()->json(['message' => 'تم حذف المنشور']);
    }

    private function storeRawUpload(Request $request, string $folder, int $maxBytes, array $allowedMime): array
    {
        $bytes = $request->getContent();
        if ($bytes === '' || strlen($bytes) > $maxBytes) {
            throw ValidationException::withMessages(['file' => 'حجم الملف غير صالح']);
        }

        $original = rawurldecode((string) $request->header('X-File-Name', 'file'));
        $original = basename(str_replace('\\', '/', $original));
        $extension = strtolower(pathinfo($original, PATHINFO_EXTENSION));

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->buffer($bytes) ?: 'application/octet-stream';

        if (! in_array($mime, $allowedMime, true)) {
            throw ValidationException::withMessages(['file' => 'نوع الملف غير مدعوم']);
        }

        $name = (string) Str::ulid().($extension ? '.'.$extension : '');
        $path = $folder.'/'.$name;
        Storage::disk('public')->put($path, $bytes);

        return [
            'url' => Storage::disk('public')->url($path),
            'fileName' => $original,
            'mimeType' => $mime,
        ];
    }

    private function deletePublicUrl(string $url): void
    {
        $prefix = '/storage/';
        $position = strpos($url, $prefix);
        if ($position !== false) {
            Storage::disk('public')->delete(substr($url, $position + strlen($prefix)));
        }
    }

    private function homeData(HomePageContent $home): array
    {
        return [
            'id' => $home->id,
            'eyebrow' => $home->eyebrow,
            'heroTitle' => $home->hero_title,
            'heroBody' => $home->hero_body,
            'aboutTitle' => $home->about_title,
            'aboutBody' => $home->about_body,
            'feature1Title' => $home->feature1_title,
            'feature1Body' => $home->feature1_body,
            'feature2Title' => $home->feature2_title,
            'feature2Body' => $home->feature2_body,
            'feature3Title' => $home->feature3_title,
            'feature3Body' => $home->feature3_body,
            'calloutTitle' => $home->callout_title,
            'calloutBody' => $home->callout_body,
            'footerPhone' => $home->footer_phone,
            'footerEmail' => $home->footer_email,
            'footerInstagram' => $home->footer_instagram,
            'footerFacebook' => $home->footer_facebook,
        ];
    }
}
