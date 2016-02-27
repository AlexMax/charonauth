{#
 # Returns a URL with the gravatar hash and combination of d and f to
 # reflect the user's desired gravatar style.
 #}
{% macro gravatar(hash, override, def, size) %}//www.gravatar.com/avatar/{% if override %}{{ hash }}?d={{ override }}&f=y&s={{ size }}{% else %}{{ hash }}?d={{ def }}&s={{ size }}{% endif %}{% endmacro %}

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
{% macro paginator(pinfo) %}
<ul class="pagination">
	{% if pinfo.page > 1 %}
	<li><a href="?{{ pinfo.baseQuery|qs({ p: 1 }) }}">&laquo;</a></li>
	<li><a href="?{{ pinfo.baseQuery|qs({ p: pinfo.page - 1 }) }}">&lsaquo;</a></li>
	{% else %}
	<li class="disabled"><a href="#">&laquo;</a></li>
	<li class="disabled"><a href="#">&lsaquo;</a></li>
	{% endif %}
	{% for index in range(pinfo.minPage, pinfo.maxPage + 1) %}
	<li class="{% if index == pinfo.page %}active{% endif %}"><a href="?{{ pinfo.baseQuery|qs({ p: index }) }}">{{ index }}</a></li>
	{% endfor %}
	{% if pinfo.page < pinfo.totalPages %}
	<li><a href="?{{ pinfo.baseQuery|qs({ p: pinfo.page + 1 }) }}">&rsaquo;</a></li>
	<li><a href="?{{ pinfo.baseQuery|qs({ p: pinfo.totalPages }) }}">&raquo;</a></li>
	{% else %}
	<li class="disabled"><a href="#">&rsaquo;</a></li>
	<li class="disabled"><a href="#">&raquo;</a></li>
	{% endif %}
</ul>
{% endmacro %}
