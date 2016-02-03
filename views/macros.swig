{#
 # Returns a URL with the gravatar hash and combination of d and f to
 # reflect the user's desired gravatar style.
 #}
{% macro gravatar(hash, override, def) %}//www.gravatar.com/avatar/{% if override %}{{ hash }}?d={{ override }}&f=y{% else %}{{ hash }}?d={{ def }}{% endif %}{% endmacro %}

{#
 # Returns an alert box
 #}
{% macro alert(type, message) %}
<div class="alert alert-{{ type }}" role="alert">
	{{ message }}
</div>
{% endmacro %}

{#
 # Display a tab navigation for the user page
 #}
{% macro usernav(username, tab, tab_perms) %}
{% if tab_perms.edit or tab_perms.actions %}
<ul class="nav nav-tabs" role="tablist">
	<li class="{% if tab == 'view' %}active{% endif %}">
		<a href="/users/{{ username }}">View Profile</a>
	</li>
	{% if tab_perms.edit %}
	<li class="{% if tab == 'edit' %}active{% endif %}">
		<a href="/users/{{ username }}/edit">Edit Profile</a>
	</li>
	<li class="{% if tab == 'settings' %}active{% endif %}">
		<a href="/users/{{ username }}/settings">Settings</a>
	</li>
	{% endif %}
	{% if tab_perms.actions %}
	<li class="{% if tab == 'actions' %}active{% endif %}">
		<a href="/users/{{ username }}/actions">Actions</a>
	</li>
	{% endif %}
</ul>
{% endif %}
{% endmacro %}

{#
 # Display a paginator
 #}
{% macro paginator(page, limit, total) %}
{% set totalPages = 2 %}
<ul class="pagination">
	{% if page > 1 %}
	<li><a href="#">&laquo;</a></li>
	{% endif %}
	<li><a href="#">{{ page }}</a></li>
	<li><a href="#">{{ total }}</a></li>
	<li><a href="#">{{ limit }}</a></li>
	{% if page < totalPages %}
	<li><a href="#">&raquo;</a></li>
	{% endif %}
</ul>
{% endmacro %}
