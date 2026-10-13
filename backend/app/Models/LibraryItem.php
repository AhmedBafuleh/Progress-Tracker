<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class LibraryItem extends Model
{
    use HasUlids;

    protected $fillable = ['title','description','type','url','cover_url','published'];

    protected function casts(): array { return ['published' => 'boolean']; }
}
