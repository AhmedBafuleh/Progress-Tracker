<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomePageContent extends Model
{
    protected $table = 'home_page_contents';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id','eyebrow','hero_title','hero_body','about_title','about_body',
        'feature1_title','feature1_body','feature2_title','feature2_body',
        'feature3_title','feature3_body','callout_title','callout_body',
        'footer_phone','footer_email','footer_instagram','footer_facebook',
    ];
}
