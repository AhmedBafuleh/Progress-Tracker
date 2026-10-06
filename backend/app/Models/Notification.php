<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasUlids;

    const UPDATED_AT = null;

    protected $fillable = ['recipient_id','sender_id','title','message','type','event_at','is_read'];

    protected function casts(): array
    {
        return ['event_at'=>'datetime','is_read'=>'boolean'];
    }

    public function recipient(): BelongsTo { return $this->belongsTo(User::class, 'recipient_id')->withTrashed(); }
    public function sender(): BelongsTo { return $this->belongsTo(User::class, 'sender_id')->withTrashed(); }
}
