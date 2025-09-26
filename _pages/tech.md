---
layout: category
permalink: /tech/
taxonomy: tech
---
{% assign posts = site.categories %}
{% for post in posts %}
  {% include archive-single.html %}
{% endfor %}