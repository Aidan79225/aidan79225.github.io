---
layout: category
permalink: /food/
taxonomy: food
---
{% assign posts = site.categories %}
{% for post in posts %}
  {% include archive-single.html %}
{% endfor %}