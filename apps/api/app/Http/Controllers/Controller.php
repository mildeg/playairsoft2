<?php

namespace App\Http\Controllers;

use Illuminate\Support\Str;

abstract class Controller
{
    protected function makeUniqueSlug(string $modelClass, string $value, string $column = 'slug'): string
    {
        $base = Str::slug($value);
        $base = $base === '' ? 'item' : $base;

        $slug = $base;
        $index = 2;

        while ($modelClass::query()->where($column, $slug)->exists()) {
            $slug = $base.'-'.$index;
            $index++;
        }

        return $slug;
    }
}
