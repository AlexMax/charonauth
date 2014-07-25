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
{% macro usernav(username, tab, force) %}
{% if username == session.user.username or force %}
<ul class="nav nav-tabs" role="tablist">
	<li class="{% if tab == 'view' %}active{% endif %}">
		<a href="/users/{{ username }}">View Profile</a>
	</li>
	<li class="{% if tab == 'edit' %}active{% endif %}">
		<a href="/users/{{ username }}/edit">Edit Profile</a>
	</li>
	<li class="{% if tab == 'settings' %}active{% endif %}">
		<a href="/users/{{ username }}/settings">Settings</a>
	</li>
	<li class="{% if tab == 'actions' %}active{% endif %}">
		<a href="/users/{{ username }}/actions">Actions</a>
	</li>
</ul>
{% endif %}
{% endmacro %}
