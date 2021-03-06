---
layout: compress

# The list to be cached by PWA
# Chirpy v2.2
# https://github.com/cotes2020/jekyll-theme-chirpy
# © 2020 Cotes Chung
# MIT Licensed
---

const include = [

  /*--- CSS ---*/

  '{{ "/assets/css/home.css" | relative_url }}',
  '{{ "/assets/css/categories.css" | relative_url }}',
  '{{ "/assets/css/tags.css" | relative_url }}',
  '{{ "/assets/css/archives.css" | relative_url }}',
  '{{ "/assets/css/page.css" | relative_url }}',
  '{{ "/assets/css/post.css" | relative_url }}',
  '{{ "/assets/css/category-tag.css" | relative_url }}',
  '{{ "/assets/css/lib/bootstrap-toc.min.css" | relative_url }}',

  /*--- Javascripts ---*/

  '{{ "/assets/js/home.min.js" | relative_url }}',
  '{{ "/assets/js/page.min.js" | relative_url }}',
  '{{ "/assets/js/post.min.js" | relative_url }}',
  '{{ "/assets/js/categories.min.js" | relative_url }}',

  /*--- HTML ---*/

  /* Tabs */
  {% for tab in site.tabs %}
    '{{ tab.url }}',
  {% endfor %}

  /*--- Icons ---*/

  {%- capture icon_url -%}
    {{ "/assets/img/favicons" | relative_url }}
  {%- endcapture -%}
  '{{ icon_url }}/favicon.ico',
  '{{ icon_url }}/apple-icon.png',
  '{{ icon_url }}/apple-icon-precomposed.png',
  '{{ icon_url }}/android-icon-192x192.png',
  '{{ icon_url }}/ms-icon-150x150.png',
  '{{ icon_url }}/manifest.json',
  '{{ icon_url }}/browserconfig.xml',

  /*--- Others ---*/

  '{{ "/assets/js/data/search.json" | relative_url }}',
  '{{ "/404.html" | relative_url }}',

  '{{ "/app.js" | relative_url }}',
  '{{ "/sw.js" | relative_url }}'
];

const exclude = [
  {%- if site.google_analytics.pv.proxy_url and site.google_analytics.pv.enabled -%}
    '{{ site.google_analytics.pv.proxy_url }}',
  {%- endif -%}
  '/assets/js/data/pageviews.json',
  '/img.shields.io/'
];
