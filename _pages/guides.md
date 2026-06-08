---
layout: single
title: Guides
permalink: /guides/
---

<ul class="tool-list">
{% for g in site.guides %}
  <li><a href="{{ g.url | relative_url }}">{{ g.title }}</a>{% if g.description %} — {{ g.description }}{% endif %}</li>
{% endfor %}
</ul>
